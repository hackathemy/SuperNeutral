import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Switch Active Vault Strategy
 *
 * Usage: npm run vault:switch -- <strategy_id>
 * Strategy IDs:
 *   0 = Aave V3
 *   1 = Rocket Pool
 *   2 = LIDO
 */

async function main() {
    // Get strategy ID from command line
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("\n❌ Error: Strategy ID required");
        console.log("\nUsage: npm run vault:switch -- <strategy_id>");
        console.log("  0 = Aave V3");
        console.log("  1 = Rocket Pool");
        console.log("  2 = LIDO\n");
        process.exit(1);
    }

    const strategyId = parseInt(args[0]);
    if (strategyId < 0 || strategyId > 2) {
        console.error("\n❌ Error: Invalid strategy ID. Must be 0, 1, or 2\n");
        process.exit(1);
    }

    const strategyNames = ["Aave V3", "Rocket Pool", "LIDO"];
    console.log(`\n🔄 Switching to ${strategyNames[strategyId]}...\n`);

    // Load deployment info
    const deploymentPath = "./deployment-multi-vault.json";
    if (!fs.existsSync(deploymentPath)) {
        throw new Error("Multi-vault deployment not found. Run: npm run deploy:multi");
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const routerAddress = deployment.contracts.VaultRouter;

    // Connect to network
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();

    // Load VaultRouter contract
    const routerArtifact = JSON.parse(fs.readFileSync(
        "./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json",
        "utf8"
    ));

    const vaultRouter = new ethers.Contract(
        routerAddress,
        routerArtifact.abi,
        signer
    );

    try {
        // Get current strategy
        const currentStrategyId = await vaultRouter.activeStrategy();
        console.log(`Current Strategy: [${currentStrategyId}] ${strategyNames[currentStrategyId]}`);
        console.log(`New Strategy: [${strategyId}] ${strategyNames[strategyId]}\n`);

        if (currentStrategyId === BigInt(strategyId)) {
            console.log("⚠️  Already using this strategy. No change needed.\n");
            return;
        }

        // Change strategy
        console.log("📝 Submitting transaction...");
        const tx = await vaultRouter.changeStrategy(strategyId);
        console.log(`   Transaction hash: ${tx.hash}`);

        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

        // Verify change
        const newStrategyId = await vaultRouter.activeStrategy();
        console.log(`\n✅ Strategy successfully changed to: [${newStrategyId}] ${strategyNames[newStrategyId]}`);

        // Show new strategy info
        const strategyInfo = await vaultRouter.getStrategyInfo();
        const [name, vault, balance, rewards] = strategyInfo;

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 New Strategy Status");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`Strategy: ${name}`);
        console.log(`Vault: ${vault}`);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
        console.log(`Rewards: ${ethers.formatEther(rewards)} ETH`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        console.log("💡 Note: Future deposits will use this strategy.");
        console.log("   To migrate existing funds, use: npm run vault:migrate\n");

    } catch (error) {
        console.error("\n❌ Strategy change failed:");
        console.error(error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
