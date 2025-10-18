// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ILendingPool
 * @notice Interface for the Ethereum Lending Pool
 */
interface ILendingPool {
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed borrower, uint256 tokenId, uint256 collateral, uint256 borrowed);
    event Repaid(uint256 indexed tokenId, uint256 amount);
    event Liquidated(uint256 indexed tokenId, address liquidator, uint256 debtCovered, uint256 collateralLiquidated);
    event CollateralAdded(uint256 indexed tokenId, uint256 amount);
    event PYUSDSupplied(address indexed supplier, uint256 amount);
    event PYUSDWithdrawn(address indexed supplier, uint256 amount);

    // Structs
    struct Loan {
        address borrower;
        uint256 collateralAmount;  // ETH collateral in wei
        uint256 borrowAmount;      // PYUSD borrowed
        uint256 liquidationRatio;  // 50-80% (in basis points, 5000-8000)
        uint256 shortPositionRatio; // 0-30% (in basis points, 0-3000)
        uint256 borrowTimestamp;
        uint256 accruedInterest;
        bool isActive;
    }

    // Core Functions
    function supplyPYUSD(uint256 amount) external returns (uint256 spyusdAmount);
    function withdrawPYUSD(uint256 spyusdAmount) external returns (uint256 pyusdAmount);
    function borrow(uint256 pyusdAmount, uint256 liquidationRatio, uint256 shortRatio) external payable returns (uint256 tokenId);
    function repay(uint256 tokenId) external;
    function addCollateral(uint256 tokenId) external payable;
    function liquidate(uint256 tokenId) external;

    // View Functions
    function getLoan(uint256 tokenId) external view returns (Loan memory);
    function getHealthFactor(uint256 tokenId) external view returns (uint256);
    function getTotalSupply() external view returns (uint256);
    function getTotalBorrowed() external view returns (uint256);
    function getUtilizationRate() external view returns (uint256);
    function getCurrentInterestRate() external view returns (uint256);
    function isLiquidatable(uint256 tokenId) external view returns (bool);
}