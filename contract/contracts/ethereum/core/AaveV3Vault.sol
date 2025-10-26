// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IStETHVault.sol";

/**
 * @title AaveV3Vault
 * @notice Real yield-generating vault using Aave V3 on Sepolia testnet
 * @dev Deposits ETH into Aave V3 to earn real yields
 *
 * How it works:
 * 1. User deposits ETH → Vault wraps to WETH
 * 2. Vault supplies WETH to Aave V3 → Receives aWETH
 * 3. aWETH automatically accrues interest (rebasing token)
 * 4. User withdraws → Vault burns aWETH → Returns ETH + yield
 *
 * Aave V3 Sepolia Addresses:
 * - Pool: 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
 * - WETH: Check Aave docs for current address
 * - aWETH: Received automatically from Pool
 */

// Aave V3 Pool Interface
interface IPool {
    /**
     * @dev Supplies an amount of underlying asset into the reserve
     * @param asset The address of the underlying asset to supply
     * @param amount The amount to be supplied
     * @param onBehalfOf The address that will receive the aTokens
     * @param referralCode Code used to register the integrator
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /**
     * @dev Withdraws an amount of underlying asset from the reserve
     * @param asset The address of the underlying asset to withdraw
     * @param amount The amount to withdraw (use type(uint256).max for all)
     * @param to The address that will receive the underlying
     * @return The final amount withdrawn
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
}

// WETH Interface
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// aToken Interface (Aave interest-bearing token)
interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address account) external view returns (uint256);
}

contract AaveV3Vault is IStETHVault, ReentrancyGuard, Ownable, Pausable {
    // Aave V3 Sepolia testnet addresses
    IPool public constant AAVE_POOL = IPool(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951);

    // WETH on Sepolia (you need to verify this address)
    // Common Sepolia WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14 or similar
    IWETH public immutable WETH;
    IAToken public immutable aWETH;

    // Tracking variables
    uint256 public totalETHDeposited;
    uint256 public initialATokenBalance;

    // Access control
    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    event ETHDepositedToAave(uint256 ethAmount, uint256 aTokenAmount);
    event ETHWithdrawnFromAave(uint256 aTokenAmount, uint256 ethAmount);
    event YieldHarvested(uint256 yieldAmount);

    /**
     * @dev Constructor
     * @param _weth WETH address on Sepolia
     * @param _aWETH aWETH address (Aave's interest-bearing WETH token)
     */
    constructor(address _weth, address _aWETH) Ownable(msg.sender) {
        require(_weth != address(0), "Invalid WETH");
        require(_aWETH != address(0), "Invalid aWETH");

        WETH = IWETH(_weth);
        aWETH = IAToken(_aWETH);
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Deposit ETH and supply to Aave V3
     * @return aTokenAmount Amount of aWETH received
     */
    function depositETH() external payable override onlyAuthorized whenNotPaused returns (uint256 aTokenAmount) {
        require(msg.value > 0, "Zero deposit");

        uint256 aTokenBefore = aWETH.balanceOf(address(this));

        // 1. Wrap ETH to WETH
        WETH.deposit{value: msg.value}();

        // 2. Approve Aave Pool to spend WETH
        WETH.approve(address(AAVE_POOL), msg.value);

        // 3. Supply WETH to Aave V3
        // This will mint aWETH to this contract
        AAVE_POOL.supply(
            address(WETH),  // asset
            msg.value,      // amount
            address(this),  // onBehalfOf
            0               // referralCode
        );

        // 4. Calculate aWETH received
        uint256 aTokenAfter = aWETH.balanceOf(address(this));
        aTokenAmount = aTokenAfter - aTokenBefore;

        // 5. Update tracking
        totalETHDeposited += msg.value;
        if (initialATokenBalance == 0) {
            initialATokenBalance = aTokenAmount;
        }

        emit ETHDeposited(msg.value, aTokenAmount);
        emit ETHDepositedToAave(msg.value, aTokenAmount);

        return aTokenAmount;
    }

    /**
     * @dev Withdraw ETH from Aave V3
     * @param ethAmount Amount of ETH to withdraw (in WETH/aWETH terms)
     * @return actualETH Actual ETH amount received
     */
    function withdrawETH(uint256 ethAmount) external override onlyAuthorized nonReentrant returns (uint256 actualETH) {
        require(ethAmount > 0, "Zero withdrawal");

        uint256 currentATokenBalance = aWETH.balanceOf(address(this));
        require(currentATokenBalance >= ethAmount, "Insufficient aWETH");

        // 1. Withdraw from Aave (burns aWETH, returns WETH)
        uint256 wethReceived = AAVE_POOL.withdraw(
            address(WETH),     // asset
            ethAmount,         // amount
            address(this)      // to
        );

        // 2. Unwrap WETH to ETH
        WETH.withdraw(wethReceived);

        // 3. Update tracking
        if (ethAmount <= totalETHDeposited) {
            totalETHDeposited -= ethAmount;
        } else {
            totalETHDeposited = 0;
        }

        // 4. Transfer ETH to caller
        (bool success, ) = msg.sender.call{value: wethReceived}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(ethAmount, wethReceived);
        emit ETHWithdrawnFromAave(ethAmount, wethReceived);

        return wethReceived;
    }

    /**
     * @dev Get current aWETH balance (increases over time with Aave yield)
     * @return Current aWETH balance
     */
    function getStETHBalance() external view override returns (uint256) {
        return aWETH.balanceOf(address(this));
    }

    /**
     * @dev Get total rewards earned from Aave
     * @return Total rewards in ETH terms
     */
    function getTotalRewards() external view override returns (uint256) {
        uint256 currentBalance = aWETH.balanceOf(address(this));

        if (currentBalance > totalETHDeposited) {
            return currentBalance - totalETHDeposited;
        }

        return 0;
    }

    /**
     * @dev Emergency withdrawal - withdraws all from Aave
     */
    function emergencyWithdraw() external override onlyOwner {
        uint256 aTokenBalance = aWETH.balanceOf(address(this));

        if (aTokenBalance > 0) {
            // Withdraw all from Aave
            uint256 wethReceived = AAVE_POOL.withdraw(
                address(WETH),
                type(uint256).max,  // Withdraw all
                address(this)
            );

            // Unwrap to ETH
            WETH.withdraw(wethReceived);

            // Send to owner
            (bool success, ) = owner().call{value: address(this).balance}("");
            require(success, "Emergency withdrawal failed");
        }
    }

    /**
     * @dev Harvest yields by compounding
     * This is informational - Aave automatically compounds via rebasing
     */
    function harvestRewards() external onlyAuthorized {
        uint256 currentBalance = aWETH.balanceOf(address(this));
        uint256 rewards = currentBalance > totalETHDeposited ?
            currentBalance - totalETHDeposited : 0;

        emit YieldHarvested(rewards);
        emit RewardsHarvested(rewards);
    }

    /**
     * @dev Set authorized caller
     * @param caller Address to authorize
     * @param authorized Whether to authorize or revoke
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

    /**
     * @dev Get current Aave supply APY (informational)
     * Note: This would require the Aave PoolDataProvider contract
     */
    function getCurrentAPY() external pure returns (uint256) {
        // Placeholder - implement with PoolDataProvider if needed
        return 250; // 2.5% example
    }

    receive() external payable {
        // Accept ETH from WETH unwrap
    }
}
