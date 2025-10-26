// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IShortPosition.sol";

/**
 * @title ShortPositionRouter
 * @notice Routes short position operations to different strategies
 * @dev Strategy Pattern for flexible short position backend switching
 *
 * Supported Strategies:
 * 0. Aave + Uniswap: Borrow from Aave, sell on Uniswap (Default)
 * 1. GMX V2: Perpetual futures on GMX
 */
contract ShortPositionRouter is IShortPosition, Ownable, ReentrancyGuard {
    // Strategy enum
    enum Strategy {
        AAVE_UNISWAP,  // 0: Borrow from Aave + sell on Uniswap (Default)
        GMX_V2         // 1: GMX V2 perpetual futures
    }

    // Current active strategy
    Strategy public activeStrategy;

    // Strategy implementations
    mapping(Strategy => IShortPosition) public strategies;

    // Strategy names
    mapping(Strategy => string) public strategyNames;

    // Access control
    mapping(address => bool) public authorizedCallers;

    // Emergency mode
    bool public emergencyMode;

    // Events
    event StrategyChanged(
        Strategy indexed oldStrategy,
        Strategy indexed newStrategy,
        address indexed newImplementation
    );

    event StrategyRegistered(
        Strategy indexed strategy,
        address indexed implementation
    );

    event EmergencyModeActivated();
    event EmergencyModeDeactivated();

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier notEmergency() {
        require(!emergencyMode, "Emergency mode active");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Default strategy: Aave + Uniswap
        activeStrategy = Strategy.AAVE_UNISWAP;
        authorizedCallers[msg.sender] = true;

        // Initialize strategy names
        strategyNames[Strategy.AAVE_UNISWAP] = "Aave + Uniswap";
        strategyNames[Strategy.GMX_V2] = "GMX V2 Perpetual";
    }

    /**
     * @dev Register a short position strategy
     * @param strategy The strategy enum
     * @param implementation The strategy contract address
     */
    function registerStrategy(Strategy strategy, address implementation) external onlyOwner {
        require(implementation != address(0), "Invalid implementation");
        strategies[strategy] = IShortPosition(implementation);
        emit StrategyRegistered(strategy, implementation);
    }

    /**
     * @dev Change the active strategy
     * @param newStrategy The new strategy to activate
     */
    function changeStrategy(Strategy newStrategy) external onlyOwner {
        require(address(strategies[newStrategy]) != address(0), "Strategy not registered");

        Strategy oldStrategy = activeStrategy;
        activeStrategy = newStrategy;

        emit StrategyChanged(oldStrategy, newStrategy, address(strategies[newStrategy]));
    }

    /**
     * @dev Get the current active strategy implementation
     * @return The active strategy contract
     */
    function getActiveStrategy() public view returns (IShortPosition) {
        IShortPosition strategy = strategies[activeStrategy];
        require(address(strategy) != address(0), "Active strategy not set");
        return strategy;
    }

    // ============ IShortPosition Implementation ============

    /**
     * @dev Open a short position using active strategy
     */
    function openShort(
        uint256 ethAmount,
        uint256 leverage,
        uint256 minOutputAmount
    ) external payable override onlyAuthorized notEmergency returns (uint256 positionId) {
        IShortPosition strategy = getActiveStrategy();

        // Forward call to active strategy with ETH
        positionId = strategy.openShort{value: msg.value}(ethAmount, leverage, minOutputAmount);

        emit ShortOpened(positionId, msg.sender, ethAmount, leverage, 0);
        return positionId;
    }

    /**
     * @dev Close a short position using active strategy
     */
    function closeShort(uint256 positionId)
        external
        override
        onlyAuthorized
        nonReentrant
        returns (int256 profitOrLoss)
    {
        IShortPosition strategy = getActiveStrategy();

        // Close position via active strategy
        profitOrLoss = strategy.closeShort(positionId);

        emit ShortClosed(positionId, msg.sender, profitOrLoss);
        return profitOrLoss;
    }

    /**
     * @dev Get position details from active strategy
     */
    function getPosition(uint256 positionId)
        external
        view
        override
        returns (
            uint256 collateral,
            uint256 borrowedAmount,
            uint256 currentValue,
            bool isActive
        )
    {
        IShortPosition strategy = strategies[activeStrategy];
        if (address(strategy) == address(0)) {
            return (0, 0, 0, false);
        }
        return strategy.getPosition(positionId);
    }

    /**
     * @dev Calculate unrealized P&L from active strategy
     */
    function getUnrealizedPnL(uint256 positionId)
        external
        view
        override
        returns (int256 pnl)
    {
        IShortPosition strategy = strategies[activeStrategy];
        if (address(strategy) == address(0)) {
            return 0;
        }
        return strategy.getUnrealizedPnL(positionId);
    }

    /**
     * @dev Get current strategy name
     */
    function getStrategyName() external view override returns (string memory) {
        return strategyNames[activeStrategy];
    }

    // ============ Admin Functions ============

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @dev Activate emergency mode
     */
    function activateEmergencyMode() external onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated();
    }

    /**
     * @dev Deactivate emergency mode
     */
    function deactivateEmergencyMode() external onlyOwner {
        emergencyMode = false;
        emit EmergencyModeDeactivated();
    }

    /**
     * @dev Get strategy info
     */
    function getStrategyInfo() external view returns (
        string memory currentStrategy,
        address currentImplementation,
        bool isEmergency
    ) {
        currentStrategy = strategyNames[activeStrategy];
        IShortPosition strategy = strategies[activeStrategy];

        if (address(strategy) != address(0)) {
            currentImplementation = address(strategy);
        }

        isEmergency = emergencyMode;
    }

    /**
     * @dev Get all strategies info
     */
    function getAllStrategiesInfo() external view returns (
        string[2] memory names,
        address[2] memory implementations
    ) {
        for (uint8 i = 0; i < 2; i++) {
            Strategy strategy = Strategy(i);
            names[i] = strategyNames[strategy];
            IShortPosition impl = strategies[strategy];

            if (address(impl) != address(0)) {
                implementations[i] = address(impl);
            }
        }
    }

    receive() external payable {
        // Accept ETH
    }
}
