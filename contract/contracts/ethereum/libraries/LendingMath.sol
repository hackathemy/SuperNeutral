// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title LendingMath
 * @notice Math library for lending protocol calculations
 */
library LendingMath {
    uint256 public constant PRECISION = 1e18;
    uint256 public constant BASIS_POINTS = 10000;

    /**
     * @dev Calculate health factor for a loan
     * @param collateralValue Value of collateral in USD
     * @param debtValue Value of debt in USD
     * @param liquidationRatio Liquidation ratio in basis points
     * @return Health factor with 18 decimals precision
     */
    function calculateHealthFactor(
        uint256 collateralValue,
        uint256 debtValue,
        uint256 liquidationRatio
    ) internal pure returns (uint256) {
        if (debtValue == 0) return type(uint256).max;

        // Health Factor = (Collateral Value * Liquidation Ratio) / Debt Value
        return (collateralValue * liquidationRatio * PRECISION) / (debtValue * BASIS_POINTS);
    }

    /**
     * @dev Calculate utilization rate
     * @param totalBorrowed Total amount borrowed
     * @param totalSupply Total amount supplied
     * @return Utilization rate in basis points
     */
    function calculateUtilizationRate(
        uint256 totalBorrowed,
        uint256 totalSupply
    ) internal pure returns (uint256) {
        if (totalSupply == 0) return 0;
        return (totalBorrowed * BASIS_POINTS) / totalSupply;
    }

    /**
     * @dev Calculate interest rate based on utilization
     * @param utilization Current utilization rate in basis points
     * @return Annual interest rate in basis points
     */
    function calculateInterestRate(uint256 utilization) internal pure returns (uint256) {
        // Base rate: 2%
        uint256 baseRate = 200;

        if (utilization <= 8000) {
            // Below 80% utilization: base + utilization * 0.15
            return baseRate + (utilization * 15) / 100;
        } else {
            // Above 80% utilization: steep increase
            return baseRate + 1200 + ((utilization - 8000) * 50) / 100;
        }
    }

    /**
     * @dev Calculate accrued interest
     * @param principal Principal amount
     * @param rate Annual interest rate in basis points
     * @param timeElapsed Time elapsed in seconds
     * @return Accrued interest amount
     */
    function calculateAccruedInterest(
        uint256 principal,
        uint256 rate,
        uint256 timeElapsed
    ) internal pure returns (uint256) {
        // Interest = Principal * Rate * Time / (365 days * BASIS_POINTS)
        return (principal * rate * timeElapsed) / (365 days * BASIS_POINTS);
    }
}