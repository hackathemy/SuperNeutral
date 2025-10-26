import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Check Multi-Vault System Status
 *
 * Shows:
 * - Current active strategy
 * - All available strategies
 * - Balances and yields for each vault
 * - Total system stats
 */

async function main() {
    console.log("\n🔍 Checking Multi-Vault System Status...\n");

    // Load deployment info
    const deploymentPath = "./deployment-multi-vault.json";
    if (!fs.existsSync(deploymentPath)) {
        throw new Error("Multi-vault deployment not found. Run: npm run deploy:multi");
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const routerAddress = deployment.contracts.VaultRouter;

    console.log("📋 Vault Router:", routerAddress);
    console.log("🌐 Network: Sepolia Testnet\n");

    // Connect to network
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);

    // Load VaultRouter contract
    const routerArtifact = JSON.parse(fs.readFileSync(
        "./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json",
        "utf8"
    ));

    const vaultRouter = new ethers.Contract(
        routerAddress,
        routerArtifact.abi,
        provider
    );

    // Get current strategy info
    const strategyInfo = await vaultRouter.getStrategyInfo();
    const [currentStrategy, currentVault, balance, rewards] = strategyInfo;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎯 Current Active Strategy");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Strategy: ${currentStrategy}`);
    console.log(`Vault: ${currentVault}`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`Rewards: ${ethers.formatEther(rewards)} ETH`);

    // Get all strategies info
    const allStrategies = await vaultRouter.getAllStrategiesInfo();
    const [names, vaultAddresses, balances, rewardsList] = allStrategies;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 All Available Strategies");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const strategies = [
        { id: 0, name: "Aave V3", type: "Real" },
        { id: 1, name: "Rocket Pool", type: "Mock" },
        { id: 2, name: "LIDO", type: "Mock" }
    ];

    for (let i = 0; i < 3; i++) {
        const isActive = names[i] === currentStrategy;
        const marker = isActive ? "⭐" : "  ";

        console.log(`\n${marker} [${i}] ${strategies[i].name} (${strategies[i].type})`);
        console.log(`   Vault: ${vaultAddresses[i]}`);
        console.log(`   Balance: ${ethers.formatEther(balances[i])} ETH`);
        console.log(`   Rewards: ${ethers.formatEther(rewardsList[i])} ETH`);

        if (isActive) {
            console.log(`   Status: 🟢 ACTIVE`);
        }
    }

    // Get LendingPool info
    const lendingPoolAddress = deployment.contracts.EthereumLendingPool;
    const poolArtifact = JSON.parse(fs.readFileSync(
        "./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
        "utf8"
    ));

    const lendingPool = new ethers.Contract(
        lendingPoolAddress,
        poolArtifact.abi,
        provider
    );

    const totalSupplied = await lendingPool.getTotalSupply();
    const totalBorrowed = await lendingPool.getTotalBorrowed();
    const totalCollateral = await lendingPool.totalETHCollateral();
    const utilizationRate = await lendingPool.getUtilizationRate();

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💰 Lending Pool Statistics");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total PYUSD Supplied: ${ethers.formatUnits(totalSupplied, 6)} PYUSD`);
    console.log(`Total PYUSD Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} PYUSD`);
    console.log(`Total ETH Collateral: ${ethers.formatEther(totalCollateral)} ETH`);
    console.log(`Utilization Rate: ${(Number(utilizationRate) / 100).toFixed(2)}%`);

    // Calculate total value
    const totalVaultBalance = balances.reduce((sum, bal) => sum + bal, 0n);
    const totalVaultRewards = rewardsList.reduce((sum, rew) => sum + rew, 0n);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📈 System Totals");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Vault Balance: ${ethers.formatEther(totalVaultBalance)} ETH`);
    console.log(`Total Vault Rewards: ${ethers.formatEther(totalVaultRewards)} ETH`);

    if (totalVaultBalance > 0n) {
        const apy = (Number(totalVaultRewards) / Number(totalVaultBalance)) * 100;
        console.log(`Estimated APY: ${apy.toFixed(2)}%`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔧 Management Options");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Switch to Aave V3:      npm run vault:switch -- 0");
    console.log("Switch to Rocket Pool:  npm run vault:switch -- 1");
    console.log("Switch to LIDO:         npm run vault:switch -- 2");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
