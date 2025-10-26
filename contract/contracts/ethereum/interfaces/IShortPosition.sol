// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IShortPosition
 * @notice Interface for short position strategies
 * @dev Unified interface for different short position implementations
 */
interface IShortPosition {
    /**
     * @dev Open a short position
     * @param ethAmount Amount of ETH to use for shorting
     * @param leverage Leverage multiplier (e.g., 2 = 2x leverage)
     * @param minOutputAmount Minimum output amount (slippage protection)
     * @return positionId Unique identifier for this short position
     */
    function openShort(
        uint256 ethAmount,
        uint256 leverage,
        uint256 minOutputAmount
    ) external payable returns (uint256 positionId);

    /**
     * @dev Close a short position
     * @param positionId The position identifier to close
     * @return profitOrLoss Profit (positive) or loss (negative) in ETH
     */
    function closeShort(uint256 positionId) external returns (int256 profitOrLoss);

    /**
     * @dev Get position details
     * @param positionId The position identifier
     * @return collateral Collateral amount in ETH
     * @return borrowedAmount Amount borrowed/shorted
     * @return currentValue Current position value
     * @return isActive Whether position is still open
     */
    function getPosition(uint256 positionId) external view returns (
        uint256 collateral,
        uint256 borrowedAmount,
        uint256 currentValue,
        bool isActive
    );

    /**
     * @dev Calculate unrealized P&L for a position
     * @param positionId The position identifier
     * @return pnl Unrealized profit/loss in ETH
     */
    function getUnrealizedPnL(uint256 positionId) external view returns (int256 pnl);

    /**
     * @dev Get strategy name
     * @return Name of the short position strategy
     */
    function getStrategyName() external view returns (string memory);

    // Events
    event ShortOpened(
        uint256 indexed positionId,
        address indexed user,
        uint256 ethAmount,
        uint256 leverage,
        uint256 borrowedAmount
    );

    event ShortClosed(
        uint256 indexed positionId,
        address indexed user,
        int256 profitOrLoss
    );

    event ShortLiquidated(
        uint256 indexed positionId,
        address indexed liquidator,
        uint256 liquidationPenalty
    );
}
