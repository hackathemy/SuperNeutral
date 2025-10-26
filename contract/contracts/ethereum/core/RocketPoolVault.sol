// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IStETHVault.sol";

/**
 * @title RocketPoolVault
 * @notice Stake ETH via Rocket Pool and receive rETH
 * @dev Real implementation for Mainnet/Hoodi, works with actual Rocket Pool contracts
 *
 * How Rocket Pool Works:
 * 1. Deposit ETH → RocketDepositPool
 * 2. Receive rETH (rebasing token that increases in value)
 * 3. rETH/ETH exchange rate increases over time with staking rewards
 * 4. Withdraw: Burn rETH → Get ETH + rewards
 *
 * Networks:
 * - Mainnet: Real rETH staking
 * - Hoodi Testnet: Real testnet rETH staking
 * - Sepolia: Use MockRocketPoolVault instead
 */

// Rocket Pool Interfaces
interface IRocketDepositPool {
    function deposit() external payable;
    function getBalance() external view returns (uint256);
}

interface IRocketTokenRETH {
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
    function getEthValue(uint256 rethAmount) external view returns (uint256);
    function getRethValue(uint256 ethAmount) external view returns (uint256);
    function getExchangeRate() external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IRocketStorage {
    function getAddress(bytes32 key) external view returns (address);
}

contract RocketPoolVault is IStETHVault, ReentrancyGuard, Ownable, Pausable {
    // Rocket Pool Storage contract (same on all networks)
    IRocketStorage public immutable rocketStorage;

    // Tracking variables
    uint256 public totalETHDeposited;
    uint256 public initialRETHBalance;

    // Access control
    mapping(address => bool) public authorizedCallers;

    // Rocket Pool contract keys
    bytes32 private constant DEPOSIT_POOL_KEY = keccak256("contract.addressrocketDepositPool");
    bytes32 private constant RETH_TOKEN_KEY = keccak256("contract.addressrocketTokenRETH");

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    event RETHReceived(uint256 ethAmount, uint256 rethAmount);
    event RETHBurned(uint256 rethAmount, uint256 ethAmount);

    /**
     * @dev Constructor
     * @param _rocketStorage Rocket Pool Storage contract address
     *
     * Mainnet: 0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46
     * Hoodi: Check Rocket Pool docs for testnet address
     */
    constructor(address _rocketStorage) Ownable(msg.sender) {
        require(_rocketStorage != address(0), "Invalid storage address");
        rocketStorage = IRocketStorage(_rocketStorage);
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Get Rocket Pool Deposit Pool contract
     */
    function getRocketDepositPool() public view returns (IRocketDepositPool) {
        address depositPoolAddress = rocketStorage.getAddress(DEPOSIT_POOL_KEY);
        require(depositPoolAddress != address(0), "Deposit pool not found");
        return IRocketDepositPool(depositPoolAddress);
    }

    /**
     * @dev Get Rocket Pool rETH token contract
     */
    function getRETHToken() public view returns (IRocketTokenRETH) {
        address rethAddress = rocketStorage.getAddress(RETH_TOKEN_KEY);
        require(rethAddress != address(0), "rETH token not found");
        return IRocketTokenRETH(rethAddress);
    }

    /**
     * @dev Deposit ETH and receive rETH from Rocket Pool
     * @return rethAmount Amount of rETH received
     */
    function depositETH() external payable override onlyAuthorized whenNotPaused returns (uint256 rethAmount) {
        require(msg.value > 0, "Zero deposit");

        IRocketDepositPool depositPool = getRocketDepositPool();
        IRocketTokenRETH rethToken = getRETHToken();

        uint256 rethBefore = rethToken.balanceOf(address(this));

        // Deposit ETH to Rocket Pool
        depositPool.deposit{value: msg.value}();

        uint256 rethAfter = rethToken.balanceOf(address(this));
        rethAmount = rethAfter - rethBefore;

        // Update tracking
        totalETHDeposited += msg.value;
        if (initialRETHBalance == 0) {
            initialRETHBalance = rethAmount;
        }

        emit ETHDeposited(msg.value, rethAmount);
        emit RETHReceived(msg.value, rethAmount);

        return rethAmount;
    }

    /**
     * @dev Withdraw ETH by burning rETH
     * @param rethAmount Amount of rETH to burn
     * @return ethAmount Amount of ETH received
     */
    function withdrawETH(uint256 rethAmount) external override onlyAuthorized nonReentrant returns (uint256 ethAmount) {
        require(rethAmount > 0, "Zero withdrawal");

        IRocketTokenRETH rethToken = getRETHToken();
        uint256 rethBalance = rethToken.balanceOf(address(this));
        require(rethBalance >= rethAmount, "Insufficient rETH");

        // Get ETH value of rETH
        ethAmount = rethToken.getEthValue(rethAmount);

        // Burn rETH to receive ETH
        uint256 ethBefore = address(this).balance;
        rethToken.burn(rethAmount);
        uint256 ethAfter = address(this).balance;

        uint256 actualETH = ethAfter - ethBefore;
        require(actualETH > 0, "No ETH received");

        // Update tracking
        if (rethAmount <= totalETHDeposited) {
            totalETHDeposited -= rethAmount;
        } else {
            totalETHDeposited = 0;
        }

        // Transfer ETH to caller
        (bool success, ) = msg.sender.call{value: actualETH}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(rethAmount, actualETH);
        emit RETHBurned(rethAmount, actualETH);

        return actualETH;
    }

    /**
     * @dev Get rETH balance (compatible with IStETHVault)
     * @return Current rETH balance
     */
    function getStETHBalance() external view override returns (uint256) {
        IRocketTokenRETH rethToken = getRETHToken();
        return rethToken.balanceOf(address(this));
    }

    /**
     * @dev Get total rewards earned from Rocket Pool staking
     * @return Total rewards in ETH terms
     */
    function getTotalRewards() external view override returns (uint256) {
        IRocketTokenRETH rethToken = getRETHToken();
        uint256 rethBalance = rethToken.balanceOf(address(this));

        if (rethBalance == 0) return 0;

        // Convert rETH to ETH value
        uint256 currentETHValue = rethToken.getEthValue(rethBalance);

        if (currentETHValue > totalETHDeposited) {
            return currentETHValue - totalETHDeposited;
        }

        return 0;
    }

    /**
     * @dev Emergency withdrawal - converts all rETH to ETH
     */
    function emergencyWithdraw() external override onlyOwner {
        IRocketTokenRETH rethToken = getRETHToken();
        uint256 rethBalance = rethToken.balanceOf(address(this));

        if (rethBalance > 0) {
            // Burn all rETH
            rethToken.burn(rethBalance);
        }

        // Send all ETH to owner
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool success, ) = owner().call{value: ethBalance}("");
            require(success, "Emergency withdrawal failed");
        }
    }

    /**
     * @dev Get current rETH/ETH exchange rate
     * @return Exchange rate with 18 decimals
     */
    function getExchangeRate() external view returns (uint256) {
        IRocketTokenRETH rethToken = getRETHToken();
        return rethToken.getExchangeRate();
    }

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {
        // Accept ETH from rETH burn
    }
}
