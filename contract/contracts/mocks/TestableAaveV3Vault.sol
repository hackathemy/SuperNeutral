// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../ethereum/interfaces/IStETHVault.sol";

// Aave V3 Pool Interface
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

// WETH Interface
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// aToken Interface
interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address account) external view returns (uint256);
}

/**
 * @title TestableAaveV3Vault
 * @notice Version of AaveV3Vault that accepts pool address for testing
 */
contract TestableAaveV3Vault is IStETHVault, ReentrancyGuard, Ownable, Pausable {
    IPool public immutable AAVE_POOL;
    IWETH public immutable WETH;
    IAToken public immutable aWETH;

    uint256 public totalETHDeposited;
    uint256 public initialATokenBalance;

    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    event ETHDepositedToAave(uint256 ethAmount, uint256 aTokenAmount);
    event ETHWithdrawnFromAave(uint256 aTokenAmount, uint256 ethAmount);
    event YieldHarvested(uint256 yieldAmount);

    constructor(address _pool, address _weth, address _aWETH) Ownable(msg.sender) {
        require(_pool != address(0), "Invalid pool");
        require(_weth != address(0), "Invalid WETH");
        require(_aWETH != address(0), "Invalid aWETH");

        AAVE_POOL = IPool(_pool);
        WETH = IWETH(_weth);
        aWETH = IAToken(_aWETH);
        authorizedCallers[msg.sender] = true;
    }

    function depositETH() external payable override onlyAuthorized whenNotPaused returns (uint256 aTokenAmount) {
        require(msg.value > 0, "Zero deposit");

        uint256 aTokenBefore = aWETH.balanceOf(address(this));

        // 1. Wrap ETH to WETH
        WETH.deposit{value: msg.value}();

        // 2. Approve Aave Pool
        WETH.approve(address(AAVE_POOL), msg.value);

        // 3. Supply to Aave V3
        AAVE_POOL.supply(address(WETH), msg.value, address(this), 0);

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

    function withdrawETH(uint256 ethAmount) external override onlyAuthorized nonReentrant returns (uint256 actualETH) {
        require(ethAmount > 0, "Zero withdrawal");

        uint256 currentATokenBalance = aWETH.balanceOf(address(this));
        require(currentATokenBalance >= ethAmount, "Insufficient aWETH");

        // 1. Withdraw from Aave
        uint256 wethReceived = AAVE_POOL.withdraw(address(WETH), ethAmount, address(this));

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

    function getStETHBalance() external view override returns (uint256) {
        return aWETH.balanceOf(address(this));
    }

    function getTotalRewards() external view override returns (uint256) {
        uint256 currentBalance = aWETH.balanceOf(address(this));
        if (currentBalance > totalETHDeposited) {
            return currentBalance - totalETHDeposited;
        }
        return 0;
    }

    function emergencyWithdraw() external override onlyOwner {
        uint256 aTokenBalance = aWETH.balanceOf(address(this));
        if (aTokenBalance > 0) {
            uint256 wethReceived = AAVE_POOL.withdraw(address(WETH), type(uint256).max, address(this));
            WETH.withdraw(wethReceived);
            (bool success, ) = owner().call{value: address(this).balance}("");
            require(success, "Emergency withdrawal failed");
        }
    }

    function harvestRewards() external onlyAuthorized {
        uint256 currentBalance = aWETH.balanceOf(address(this));
        uint256 rewards = currentBalance > totalETHDeposited ? currentBalance - totalETHDeposited : 0;
        emit YieldHarvested(rewards);
        emit RewardsHarvested(rewards);
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getCurrentAPY() external pure returns (uint256) {
        return 250; // 2.5% example
    }

    receive() external payable {}
}
