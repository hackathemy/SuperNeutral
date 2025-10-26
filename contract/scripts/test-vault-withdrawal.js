import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Test Vault Withdrawal Separately
 * Debug if the issue is in vault withdrawal or elsewhere
 */

async function main() {
    console.log("\n🧪 Testing Vault Withdrawal Separately...\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Load ABIs
    const vaultRouterAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json", "utf8")
    ).abi;
    const aaveVaultAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/AaveV3Vault.sol/AaveV3Vault.json", "utf8")
    ).abi;

    const vaultRouter = new ethers.Contract(contracts.VaultRouter, vaultRouterAbi, signer);
    const aaveVault = new ethers.Contract(contracts.AaveV3Vault, aaveVaultAbi, provider);

    console.log("📋 Contract Addresses:");
    console.log("   Vault Router:", contracts.VaultRouter);
    console.log("   Aave V3 Vault:", contracts.AaveV3Vault);
    console.log("   Lending Pool:", contracts.EthereumLendingPool);
    console.log("");

    // Check current state
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Current Vault State");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const totalDeposited = await aaveVault.totalETHDeposited();
    console.log("Total ETH in Vault:", ethers.formatEther(totalDeposited), "ETH");

    const aWETH = "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830";
    const aWETHAbi = ["function balanceOf(address) external view returns (uint256)"];
    const aWETHContract = new ethers.Contract(aWETH, aWETHAbi, provider);
    const aWETHBalance = await aWETHContract.balanceOf(contracts.AaveV3Vault);
    console.log("aWETH Balance:", ethers.formatEther(aWETHBalance), "aWETH");
    console.log("");

    // Check authorization
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Authorization Check");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const lendingPoolAuthorized = await vaultRouter.authorizedCallers(contracts.EthereumLendingPool);
    console.log("Lending Pool → Vault Router:", lendingPoolAuthorized ? "✅ Authorized" : "❌ Not Authorized");

    const vaultRouterAuthorized = await aaveVault.authorizedCallers(contracts.VaultRouter);
    console.log("Vault Router → Aave Vault:", vaultRouterAuthorized ? "✅ Authorized" : "❌ Not Authorized");
    console.log("");

    if (!lendingPoolAuthorized || !vaultRouterAuthorized) {
        console.log("❌ Authorization issue detected!");
        console.log("   This will prevent withdrawal from working\n");
        return;
    }

    // Test direct call from user (should fail - not authorized)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 1: Direct Call from User (Expected to Fail)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        await vaultRouter.withdrawETH.staticCall(ethers.parseEther("0.01"));
        console.log("⚠️  Unexpected: User can withdraw directly (security issue!)\n");
    } catch (e) {
        if (e.message.includes("Not authorized")) {
            console.log("✅ Expected: User cannot withdraw directly (authorization works)\n");
        } else {
            console.log("❓ Unexpected error:", e.message.substring(0, 100), "\n");
        }
    }

    // Simulate what LendingPool does
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 2: Check What Happens in Repay");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("Simulating repay() withdrawal logic...");
    console.log("   Withdrawal amount: 0.1 ETH");
    console.log("   Short ratio: 0% (100% in vault)\n");

    // This is what repay() does
    const longRatio = 10000; // 100%
    const collateralAmount = ethers.parseEther("0.1");
    const longAmount = (collateralAmount * BigInt(longRatio)) / BigInt(10000);

    console.log(`Calculated longAmount: ${ethers.formatEther(longAmount)} ETH`);
    console.log(`Available in vault: ${ethers.formatEther(aWETHBalance)} aWETH\n`);

    if (longAmount > aWETHBalance) {
        console.log("❌ ERROR: Trying to withdraw more than available!");
        console.log(`   Requested: ${ethers.formatEther(longAmount)} ETH`);
        console.log(`   Available: ${ethers.formatEther(aWETHBalance)} aWETH\n`);
        return;
    }

    console.log("✅ Amount check passed\n");

    // Check if there's any ETH stuck in intermediate contracts
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Contract ETH Balances");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const lendingPoolBalance = await provider.getBalance(contracts.EthereumLendingPool);
    const vaultRouterBalance = await provider.getBalance(contracts.VaultRouter);
    const aaveVaultBalance = await provider.getBalance(contracts.AaveV3Vault);

    console.log("Lending Pool ETH:", ethers.formatEther(lendingPoolBalance), "ETH");
    console.log("Vault Router ETH:", ethers.formatEther(vaultRouterBalance), "ETH");
    console.log("Aave Vault ETH:", ethers.formatEther(aaveVaultBalance), "ETH");
    console.log("");

    if (lendingPoolBalance > 0 || vaultRouterBalance > 0 || aaveVaultBalance > 0) {
        console.log("⚠️  Warning: Some ETH is stuck in contracts!");
        console.log("   This might interfere with balance calculations\n");
    }

    // Final diagnosis
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Diagnosis");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("✅ Checks Passed:");
    console.log("   - Vault has collateral (0.1 aWETH)");
    console.log("   - Authorizations are correct");
    console.log("   - Withdrawal amount is valid\n");

    console.log("💡 The error 0x13be252b likely comes from:");
    console.log("   1. Aave V3 Pool (during withdraw)");
    console.log("   2. WETH contract (during unwrap)");
    console.log("   3. ReentrancyGuard (during nested calls)");
    console.log("   4. Loan NFT burn operation\n");

    console.log("🔍 Next Steps:");
    console.log("   1. Check LoanNFT ownership and burn authorization");
    console.log("   2. Add try-catch in repay() to isolate the issue");
    console.log("   3. Test repay with more granular error handling\n");

    console.log("✅ Vault withdrawal diagnostic complete\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
