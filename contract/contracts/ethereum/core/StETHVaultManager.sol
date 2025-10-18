// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IStETHVault.sol";

interface ILido {
    function submit(address _referral) external payable returns (uint256);
    function balanceOf(address _account) external view returns (uint256);
    function transfer(address _recipient, uint256 _amount) external returns (bool);
    function approve(address _spender, uint256 _amount) external returns (bool);
    function getTotalPooledEther() external view returns (uint256);
    function getTotalShares() external view returns (uint256);
}

interface ICurvePool {
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external payable returns (uint256);

    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
}

/**
 * @title StETHVaultManager
 * @notice Manages ETH deposits into LIDO stETH and withdrawals
 * @dev Integrates with LIDO for staking and Curve for instant withdrawals
 */
contract StETHVaultManager is IStETHVault, ReentrancyGuard, Ownable, Pausable {
    // LIDO stETH contract on Ethereum mainnet
    ILido public constant LIDO = ILido(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);

    // Curve stETH/ETH pool for instant withdrawals
    ICurvePool public constant CURVE_POOL = ICurvePool(0xDC24316b9AE028F1497c275EB9192a3Ea0f67022);

    // Constants for Curve pool
    int128 private constant ETH_INDEX = 0;
    int128 private constant STETH_INDEX = 1;

    // Slippage protection (0.5%)
    uint256 private constant MAX_SLIPPAGE = 50;
    uint256 private constant SLIPPAGE_DENOMINATOR = 10000;

    // Tracking variables
    uint256 public totalStETHBalance;
    uint256 public totalRewardsEarned;
    uint256 public lastRewardUpdate;

    // Access control
    mapping(address => bool) public authorizedCallers;

    // Small ETH buffer for gas
    uint256 private constant MIN_ETH_BUFFER = 0.1 ether;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Deposit ETH and stake via LIDO
     * @return stETHAmount Amount of stETH received
     */
    function depositETH() external payable override onlyAuthorized whenNotPaused returns (uint256 stETHAmount) {
        require(msg.value > 0, "Zero deposit");

        uint256 balanceBefore = LIDO.balanceOf(address(this));

        // Submit ETH to LIDO (referral address can be set for rewards)
        stETHAmount = LIDO.submit{value: msg.value}(address(0));

        uint256 balanceAfter = LIDO.balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;

        totalStETHBalance += actualReceived;
        updateRewards();

        emit ETHDeposited(msg.value, actualReceived);

        return actualReceived;
    }

    /**
     * @dev Withdraw ETH by converting stETH
     * @param stETHAmount Amount of stETH to convert
     * @return ethAmount Amount of ETH received
     */
    function withdrawETH(uint256 stETHAmount) external override onlyAuthorized nonReentrant returns (uint256 ethAmount) {
        require(stETHAmount > 0, "Zero withdrawal");
        require(stETHAmount <= totalStETHBalance, "Insufficient stETH");

        // For small amounts or urgent withdrawals, use Curve pool
        if (stETHAmount < 10 ether) {
            ethAmount = _withdrawViaCurve(stETHAmount);
        } else {
            // For larger amounts, could implement withdrawal queue
            // For now, using Curve for all withdrawals
            ethAmount = _withdrawViaCurve(stETHAmount);
        }

        totalStETHBalance -= stETHAmount;
        updateRewards();

        // Transfer ETH to caller
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(stETHAmount, ethAmount);

        return ethAmount;
    }

    /**
     * @dev Internal function to withdraw via Curve pool
     * @param stETHAmount Amount of stETH to swap
     * @return ethAmount Amount of ETH received
     */
    function _withdrawViaCurve(uint256 stETHAmount) internal returns (uint256 ethAmount) {
        // Approve Curve pool to spend stETH
        LIDO.approve(address(CURVE_POOL), stETHAmount);

        // Calculate minimum amount with slippage protection
        uint256 expectedETH = CURVE_POOL.get_dy(STETH_INDEX, ETH_INDEX, stETHAmount);
        uint256 minETH = (expectedETH * (SLIPPAGE_DENOMINATOR - MAX_SLIPPAGE)) / SLIPPAGE_DENOMINATOR;

        // Execute swap: stETH -> ETH
        ethAmount = CURVE_POOL.exchange(
            STETH_INDEX,
            ETH_INDEX,
            stETHAmount,
            minETH
        );

        return ethAmount;
    }

    /**
     * @dev Update rewards tracking
     */
    function updateRewards() internal {
        uint256 currentBalance = LIDO.balanceOf(address(this));

        if (currentBalance > totalStETHBalance) {
            uint256 newRewards = currentBalance - totalStETHBalance;
            totalRewardsEarned += newRewards;
            totalStETHBalance = currentBalance;
        }

        lastRewardUpdate = block.timestamp;
    }

    /**
     * @dev Get current stETH balance
     * @return Current stETH balance
     */
    function getStETHBalance() external view override returns (uint256) {
        return LIDO.balanceOf(address(this));
    }

    /**
     * @dev Get total rewards earned
     * @return Total rewards in stETH
     */
    function getTotalRewards() external view override returns (uint256) {
        uint256 currentBalance = LIDO.balanceOf(address(this));
        uint256 pendingRewards = currentBalance > totalStETHBalance ?
            currentBalance - totalStETHBalance : 0;
        return totalRewardsEarned + pendingRewards;
    }

    /**
     * @dev Emergency withdrawal function
     */
    function emergencyWithdraw() external override onlyOwner {
        uint256 stETHBalance = LIDO.balanceOf(address(this));

        if (stETHBalance > 0) {
            // Withdraw all stETH via Curve
            uint256 ethReceived = _withdrawViaCurve(stETHBalance);

            // Send all ETH to owner
            (bool success, ) = owner().call{value: ethReceived}("");
            require(success, "Emergency withdrawal failed");
        }

        // Send any remaining ETH
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool success, ) = owner().call{value: ethBalance}("");
            require(success, "ETH withdrawal failed");
        }
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
     * @dev Harvest rewards by rebalancing
     */
    function harvestRewards() external onlyAuthorized {
        updateRewards();
        emit RewardsHarvested(totalRewardsEarned);
    }

    /**
     * @dev Get exchange rate of stETH to ETH from Curve
     * @return Exchange rate with 18 decimals
     */
    function getExchangeRate() external view returns (uint256) {
        return CURVE_POOL.get_dy(STETH_INDEX, ETH_INDEX, 1 ether);
    }

    receive() external payable {
        // Accept ETH
    }
}