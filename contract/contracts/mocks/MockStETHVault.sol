// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../ethereum/interfaces/IStETHVault.sol";

/**
 * @title MockStETHVault
 * @notice Simplified vault for testing without LIDO integration
 * @dev Simulates stETH functionality for Sepolia testnet
 */
contract MockStETHVault is IStETHVault, ReentrancyGuard, Ownable {
    uint256 public totalETHDeposited;
    uint256 public totalStETHMinted;
    uint256 public mockRewardRate = 350; // 3.5% APR in basis points

    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Mock deposit - just holds ETH and tracks it
     */
    function depositETH() external payable override onlyAuthorized returns (uint256 stETHAmount) {
        require(msg.value > 0, "Zero deposit");

        // Simulate 1:1 ETH to stETH conversion
        stETHAmount = msg.value;
        totalETHDeposited += msg.value;
        totalStETHMinted += stETHAmount;

        emit ETHDeposited(msg.value, stETHAmount);
        return stETHAmount;
    }

    /**
     * @dev Mock withdrawal - returns ETH with simulated rewards
     */
    function withdrawETH(uint256 stETHAmount) external override onlyAuthorized nonReentrant returns (uint256 ethAmount) {
        require(stETHAmount > 0, "Zero withdrawal");
        require(stETHAmount <= totalStETHMinted, "Insufficient stETH");

        // Add small simulated reward (0.1% for testing)
        ethAmount = stETHAmount + (stETHAmount / 1000);

        require(address(this).balance >= ethAmount, "Insufficient ETH");

        totalStETHMinted -= stETHAmount;

        // Transfer ETH to caller
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(stETHAmount, ethAmount);
        return ethAmount;
    }

    /**
     * @dev Get mock stETH balance
     */
    function getStETHBalance() external view override returns (uint256) {
        return totalStETHMinted;
    }

    /**
     * @dev Get mock total rewards
     */
    function getTotalRewards() external view override returns (uint256) {
        // Simulate some rewards
        return (totalETHDeposited * mockRewardRate) / 10000;
    }

    /**
     * @dev Emergency withdrawal
     */
    function emergencyWithdraw() external override onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            require(success, "Emergency withdrawal failed");
        }
    }

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @dev Get exchange rate (mock)
     */
    function getExchangeRate() external pure returns (uint256) {
        // Return slightly more than 1:1 to simulate rewards
        return 1.001 ether;
    }

    receive() external payable {
        // Accept ETH
    }
}