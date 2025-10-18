// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IStETHVault
 * @notice Interface for stETH Vault Manager
 */
interface IStETHVault {
    event ETHDeposited(uint256 amount, uint256 stETHReceived);
    event StETHWithdrawn(uint256 stETHAmount, uint256 ethReceived);
    event RewardsHarvested(uint256 amount);

    function depositETH() external payable returns (uint256 stETHAmount);
    function withdrawETH(uint256 stETHAmount) external returns (uint256 ethAmount);
    function getStETHBalance() external view returns (uint256);
    function getTotalRewards() external view returns (uint256);
    function emergencyWithdraw() external;
}