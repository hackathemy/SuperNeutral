import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Debug Vault Status
 * Check if ETH was properly deposited to Aave V3 Vault
 */

async function main() {
    console.log("\n🔍 Debugging Vault Status...\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);

    // Load ABIs
    const vaultAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/AaveV3Vault.sol/AaveV3Vault.json", "utf8")
    ).abi;
    const vaultRouterAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json", "utf8")
    ).abi;
    const lendingPoolAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json", "utf8")
    ).abi;

    const aaveVault = new ethers.Contract(contracts.AaveV3Vault, vaultAbi, provider);
    const vaultRouter = new ethers.Contract(contracts.VaultRouter, vaultRouterAbi, provider);
    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, provider);

    console.log("📋 Contract Addresses:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Aave V3 Vault:", contracts.AaveV3Vault);
    console.log("Vault Router:", contracts.VaultRouter);
    console.log("Lending Pool:", contracts.EthereumLendingPool);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check Aave V3 Vault
    console.log("📊 Aave V3 Vault Status:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const totalETHDeposited = await aaveVault.totalETHDeposited();
    console.log("Total ETH Deposited:", ethers.formatEther(totalETHDeposited), "ETH");

    // Check aWETH balance
    const aWETH = "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830"; // Sepolia aWETH
    const aWETHAbi = ["function balanceOf(address) external view returns (uint256)"];
    const aWETHContract = new ethers.Contract(aWETH, aWETHAbi, provider);
    const aWETHBalance = await aWETHContract.balanceOf(contracts.AaveV3Vault);
    console.log("aWETH Balance:", ethers.formatEther(aWETHBalance), "aWETH");
    console.log("");

    // Check lending pool stats
    console.log("📊 Lending Pool Status:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const totalETHCollateral = await lendingPool.totalETHCollateral();
    const totalPYUSDBorrowed = await lendingPool.totalPYUSDBorrowed();
    console.log("Total ETH Collateral:", ethers.formatEther(totalETHCollateral), "ETH");
    console.log("Total PYUSD Borrowed:", ethers.formatUnits(totalPYUSDBorrowed, 6), "PYUSD");
    console.log("");

    // Check Loan #1
    console.log("📄 Loan #1 Details:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const loan = await lendingPool.loans(1);
        console.log("Collateral Amount:", ethers.formatEther(loan.collateralAmount), "ETH");
        console.log("Borrowed Amount:", ethers.formatUnits(loan.borrowAmount, 6), "PYUSD");
        console.log("Short Position Ratio:", Number(loan.shortPositionRatio) / 100, "%");
        console.log("Is Active:", loan.isActive ? "✅ Yes" : "❌ No");

        // Calculate expected aWETH
        const longRatio = 10000 - Number(loan.shortPositionRatio);
        const longAmount = (loan.collateralAmount * BigInt(longRatio)) / BigInt(10000);
        console.log("\nExpected in Vault:", ethers.formatEther(longAmount), "ETH");
        console.log("Actual aWETH:", ethers.formatEther(aWETHBalance), "aWETH");
        console.log("Match:", aWETHBalance >= longAmount ? "✅" : "❌");
    } catch (e) {
        console.log("❌ Error reading loan:", e.message);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Diagnosis
    if (aWETHBalance === BigInt(0)) {
        console.log("🚨 PROBLEM: No aWETH in vault!");
        console.log("   ETH was not deposited to Aave during borrow");
        console.log("   Loan creation succeeded but deposit to vault failed");
        console.log("");
    } else if (aWETHBalance < totalETHDeposited) {
        console.log("⚠️  WARNING: aWETH balance less than expected");
        console.log(`   Expected: ${ethers.formatEther(totalETHDeposited)} ETH`);
        console.log(`   Actual: ${ethers.formatEther(aWETHBalance)} aWETH`);
        console.log("");
    } else {
        console.log("✅ Vault balances look correct");
        console.log("");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
