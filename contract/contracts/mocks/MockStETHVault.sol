// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../ethereum/interfaces/IStETHVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockStETHVault
 * @notice Simple mock vault for local testing
 * @dev Accepts ETH deposits and returns them on withdrawal without any yield strategy
 */
contract MockStETHVault is IStETHVault, Ownable {
    uint256 public totalETHDeposited;
    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedCallers[msg.sender] = true;
    }

    function depositETH() external payable override onlyAuthorized returns (uint256) {
        require(msg.value > 0, "Zero deposit");
        totalETHDeposited += msg.value;
        emit ETHDeposited(msg.value, msg.value);
        return msg.value;
    }

    function withdrawETH(uint256 amount) external override onlyAuthorized returns (uint256) {
        require(amount > 0, "Zero withdrawal");
        require(address(this).balance >= amount, "Insufficient balance");
        require(amount <= totalETHDeposited, "Exceeds deposited amount");

        totalETHDeposited -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(amount, amount);
        return amount;
    }

    function getStETHBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    function getTotalRewards() external pure override returns (uint256) {
        return 0;
    }

    function emergencyWithdraw() external override onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            require(success, "Emergency withdrawal failed");
        }
        totalETHDeposited = 0;
    }

    function harvestRewards() external {
        emit RewardsHarvested(0);
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    receive() external payable {}
}
