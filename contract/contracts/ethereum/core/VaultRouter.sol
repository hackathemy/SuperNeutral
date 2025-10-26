// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IStETHVault.sol";

/**
 * @title VaultRouter
 * @notice Routes vault operations to different yield strategies (Aave V3, Rocket Pool, LIDO)
 * @dev Implements Strategy Pattern for flexible vault backend switching
 *
 * Architecture:
 * - Supports multiple vault strategies: Aave V3, Rocket Pool, LIDO
 * - Owner can switch active strategy
 * - Each strategy implements IStETHVault interface
 * - Seamless migration between strategies
 *
 * Supported Strategies:
 * 1. Aave V3: Supply WETH, earn lending yield (~2-3% APY)
 * 2. Rocket Pool: Stake ETH, receive rETH (~3-4% APY)
 * 3. LIDO: Stake ETH, receive stETH (~3-5% APY)
 */
contract VaultRouter is IStETHVault, Ownable, ReentrancyGuard {
    // Strategy enum
    enum Strategy {
        AAVE_V3,      // 0: Aave V3 lending
        ROCKET_POOL,  // 1: Rocket Pool staking
        LIDO          // 2: LIDO staking
    }

    // Current active strategy
    Strategy public activeStrategy;

    // Vault implementations
    mapping(Strategy => IStETHVault) public vaults;

    // Strategy names for events
    mapping(Strategy => string) public strategyNames;

    // Access control
    mapping(address => bool) public authorizedCallers;

    // Emergency mode
    bool public emergencyMode;

    // Events
    event StrategyChanged(Strategy indexed oldStrategy, Strategy indexed newStrategy, address indexed newVault);
    event VaultRegistered(Strategy indexed strategy, address indexed vault);
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

    constructor(Strategy _initialStrategy) Ownable(msg.sender) {
        activeStrategy = _initialStrategy;
        authorizedCallers[msg.sender] = true;

        // Initialize strategy names
        strategyNames[Strategy.AAVE_V3] = "Aave V3";
        strategyNames[Strategy.ROCKET_POOL] = "Rocket Pool";
        strategyNames[Strategy.LIDO] = "LIDO";
    }

    /**
     * @dev Register a vault strategy
     * @param strategy The strategy enum
     * @param vault The vault contract address
     */
    function registerVault(Strategy strategy, address vault) external onlyOwner {
        require(vault != address(0), "Invalid vault address");
        vaults[strategy] = IStETHVault(vault);
        emit VaultRegistered(strategy, vault);
    }

    /**
     * @dev Change the active vault strategy
     * @param newStrategy The new strategy to activate
     */
    function changeStrategy(Strategy newStrategy) external onlyOwner {
        require(address(vaults[newStrategy]) != address(0), "Strategy not registered");

        Strategy oldStrategy = activeStrategy;
        activeStrategy = newStrategy;

        emit StrategyChanged(oldStrategy, newStrategy, address(vaults[newStrategy]));
    }

    /**
     * @dev Get the current active vault
     * @return The active vault contract
     */
    function getActiveVault() public view returns (IStETHVault) {
        IStETHVault vault = vaults[activeStrategy];
        require(address(vault) != address(0), "Active vault not set");
        return vault;
    }

    // ============ IStETHVault Implementation ============

    /**
     * @dev Deposit ETH to active vault
     */
    function depositETH() external payable override onlyAuthorized notEmergency returns (uint256) {
        IStETHVault vault = getActiveVault();

        // Forward call to active vault
        uint256 shares = vault.depositETH{value: msg.value}();

        emit ETHDeposited(msg.value, shares);
        return shares;
    }

    /**
     * @dev Withdraw ETH from active vault
     */
    function withdrawETH(uint256 amount) external override onlyAuthorized nonReentrant returns (uint256) {
        IStETHVault vault = getActiveVault();

        // Withdraw from active vault
        uint256 ethReceived = vault.withdrawETH(amount);

        // Forward ETH to caller
        (bool success, ) = msg.sender.call{value: ethReceived}("");
        require(success, "ETH transfer failed");

        emit StETHWithdrawn(amount, ethReceived);
        return ethReceived;
    }

    /**
     * @dev Get stETH balance from active vault
     */
    function getStETHBalance() external view override returns (uint256) {
        IStETHVault vault = vaults[activeStrategy];
        if (address(vault) == address(0)) return 0;
        return vault.getStETHBalance();
    }

    /**
     * @dev Get total rewards from active vault
     */
    function getTotalRewards() external view override returns (uint256) {
        IStETHVault vault = vaults[activeStrategy];
        if (address(vault) == address(0)) return 0;
        return vault.getTotalRewards();
    }

    /**
     * @dev Emergency withdraw from all vaults
     */
    function emergencyWithdraw() external override onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated();

        // Withdraw from all registered vaults
        for (uint8 i = 0; i < 3; i++) {
            Strategy strategy = Strategy(i);
            IStETHVault vault = vaults[strategy];

            if (address(vault) != address(0)) {
                try vault.emergencyWithdraw() {
                    // Success
                } catch {
                    // Continue to next vault even if one fails
                    continue;
                }
            }
        }

        // Send all ETH to owner
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            require(success, "Emergency withdrawal failed");
        }
    }

    // ============ Strategy Migration ============

    /**
     * @dev Migrate funds from one strategy to another
     * @param fromStrategy Source strategy
     * @param toStrategy Destination strategy
     * @param amount Amount to migrate (0 = all)
     */
    function migrateStrategy(
        Strategy fromStrategy,
        Strategy toStrategy,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(fromStrategy != toStrategy, "Same strategy");

        IStETHVault fromVault = vaults[fromStrategy];
        IStETHVault toVault = vaults[toStrategy];

        require(address(fromVault) != address(0), "Source vault not set");
        require(address(toVault) != address(0), "Destination vault not set");

        // Calculate amount to migrate
        uint256 migrateAmount = amount;
        if (amount == 0) {
            migrateAmount = fromVault.getStETHBalance();
        }

        require(migrateAmount > 0, "Nothing to migrate");

        // Withdraw from source vault
        uint256 ethReceived = fromVault.withdrawETH(migrateAmount);

        // Deposit to destination vault
        toVault.depositETH{value: ethReceived}();

        // Update active strategy if migrating from current
        if (fromStrategy == activeStrategy) {
            activeStrategy = toStrategy;
            emit StrategyChanged(fromStrategy, toStrategy, address(toVault));
        }
    }

    // ============ Admin Functions ============

    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
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
        address currentVault,
        uint256 balance,
        uint256 rewards
    ) {
        currentStrategy = strategyNames[activeStrategy];
        IStETHVault vault = vaults[activeStrategy];

        if (address(vault) != address(0)) {
            currentVault = address(vault);
            balance = vault.getStETHBalance();
            rewards = vault.getTotalRewards();
        }
    }

    /**
     * @dev Get all strategies info
     */
    function getAllStrategiesInfo() external view returns (
        string[3] memory names,
        address[3] memory vaultAddresses,
        uint256[3] memory balances,
        uint256[3] memory rewardsList
    ) {
        for (uint8 i = 0; i < 3; i++) {
            Strategy strategy = Strategy(i);
            names[i] = strategyNames[strategy];
            IStETHVault vault = vaults[strategy];

            if (address(vault) != address(0)) {
                vaultAddresses[i] = address(vault);
                balances[i] = vault.getStETHBalance();
                rewardsList[i] = vault.getTotalRewards();
            }
        }
    }

    receive() external payable {
        // Accept ETH from vault withdrawals
    }
}
