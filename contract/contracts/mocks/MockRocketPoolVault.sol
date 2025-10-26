// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../ethereum/interfaces/IStETHVault.sol";

/**
 * @title MockRocketPoolVault
 * @notice Simulates Rocket Pool rETH staking for Sepolia testnet
 * @dev Mock implementation - does not interact with real Rocket Pool
 *
 * Simulates:
 * - ETH → rETH conversion
 * - rETH balance growth over time
 * - rETH → ETH withdrawal with rewards
 * - ~3.5% APY simulation
 */
contract MockRocketPoolVault is IStETHVault, ReentrancyGuard, Ownable {
    uint256 public totalETHDeposited;
    uint256 public totalRETHMinted;
    uint256 public mockRewardRate = 350; // 3.5% APR in basis points
    uint256 public lastRewardUpdate;

    // Track when each deposit was made for time-based rewards
    struct DepositInfo {
        uint256 amount;
        uint256 timestamp;
    }

    DepositInfo[] public deposits;

    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedCallers[msg.sender] = true;
        lastRewardUpdate = block.timestamp;
    }

    /**
     * @dev Mock deposit - simulates rETH minting
     */
    function depositETH() external payable override onlyAuthorized returns (uint256 rethAmount) {
        require(msg.value > 0, "Zero deposit");

        // Simulate slight discount: 1 ETH = 0.98 rETH (Rocket Pool commission)
        rethAmount = (msg.value * 98) / 100;

        totalETHDeposited += msg.value;
        totalRETHMinted += rethAmount;

        // Track deposit for time-based rewards
        deposits.push(DepositInfo({
            amount: rethAmount,
            timestamp: block.timestamp
        }));

        emit ETHDeposited(msg.value, rethAmount);
        return rethAmount;
    }

    /**
     * @dev Mock withdrawal - simulates rETH burning with rewards
     */
    function withdrawETH(uint256 rethAmount) external override onlyAuthorized nonReentrant returns (uint256 ethAmount) {
        require(rethAmount > 0, "Zero withdrawal");
        require(rethAmount <= totalRETHMinted, "Insufficient rETH");

        // Calculate ETH value with simulated rewards
        // Base: 1 rETH = 1.02 ETH (2% premium)
        // Plus: time-based rewards (0.5% for testing)
        ethAmount = (rethAmount * 102) / 100; // 2% premium
        ethAmount += (rethAmount * 5) / 1000; // +0.5% time reward

        require(address(this).balance >= ethAmount, "Insufficient ETH");

        totalRETHMinted -= rethAmount;

        // Transfer ETH to caller
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(rethAmount, ethAmount);
        return ethAmount;
    }

    /**
     * @dev Get mock rETH balance
     */
    function getStETHBalance() external view override returns (uint256) {
        return totalRETHMinted;
    }

    /**
     * @dev Get mock total rewards
     */
    function getTotalRewards() external view override returns (uint256) {
        if (totalRETHMinted == 0) return 0;

        // Simulate rewards: ETH value - original ETH deposited
        uint256 ethValue = (totalRETHMinted * 102) / 100;
        ethValue += (totalRETHMinted * 5) / 1000;

        if (ethValue > totalETHDeposited) {
            return ethValue - totalETHDeposited;
        }

        return 0;
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
     * @dev Get simulated exchange rate
     * Returns: 1 rETH = 1.025 ETH (2.5% premium)
     */
    function getExchangeRate() external pure returns (uint256) {
        return 1.025 ether;
    }

    /**
     * @dev Get mock APY
     */
    function getCurrentAPY() external view returns (uint256) {
        return mockRewardRate; // 3.5% in basis points
    }

    receive() external payable {
        // Accept ETH
    }
}
