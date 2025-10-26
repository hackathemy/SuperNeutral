import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Check Aave V3 WETH Reserve Status on Sepolia
 * Investigate if WETH borrow cap is causing error "30"
 */

async function main() {
    console.log("\n🔍 Checking Aave V3 WETH Reserve Status on Sepolia...\n");

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);

    const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
    const WETH = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";
    const AAVE_DATA_PROVIDER = "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31"; // Sepolia

    // ABI for PoolDataProvider
    const dataProviderAbi = [
        "function getReserveConfigurationData(address asset) external view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)",
        "function getReserveCaps(address asset) external view returns (uint256 borrowCap, uint256 supplyCap)",
        "function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)"
    ];

    const dataProvider = new ethers.Contract(AAVE_DATA_PROVIDER, dataProviderAbi, provider);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("WETH Reserve Configuration");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const config = await dataProvider.getReserveConfigurationData(WETH);
        console.log("📊 Configuration:");
        console.log("   Decimals:", config[0].toString());
        console.log("   LTV:", config[1].toString(), "%");
        console.log("   Liquidation Threshold:", config[2].toString(), "%");
        console.log("   Borrowing Enabled:", config[6] ? "✅ Yes" : "❌ No");
        console.log("   Is Active:", config[8] ? "✅ Yes" : "❌ No");
        console.log("   Is Frozen:", config[9] ? "⚠️ Yes" : "✅ No");
    } catch (e) {
        console.log("❌ Error reading config:", e.message);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("WETH Borrow/Supply Caps");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const caps = await dataProvider.getReserveCaps(WETH);
        const borrowCap = caps[0];
        const supplyCap = caps[1];

        console.log("📊 Caps:");
        console.log("   Borrow Cap:", ethers.formatEther(borrowCap), "WETH");
        console.log("   Supply Cap:", ethers.formatEther(supplyCap), "WETH");

        if (borrowCap === BigInt(0)) {
            console.log("   ⚠️  Borrow Cap = 0 means NO LIMIT");
        }
    } catch (e) {
        console.log("❌ Error reading caps:", e.message);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("WETH Current Usage");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const data = await dataProvider.getReserveData(WETH);
        const availableLiquidity = data[0];
        const totalVariableDebt = data[2];
        const totalBorrowed = totalVariableDebt;

        console.log("📊 Current State:");
        console.log("   Available Liquidity:", ethers.formatEther(availableLiquidity), "WETH");
        console.log("   Total Borrowed:", ethers.formatEther(totalBorrowed), "WETH");

        if (availableLiquidity === BigInt(0)) {
            console.log("   🚨 CRITICAL: NO WETH AVAILABLE TO BORROW!");
            console.log("   This is likely causing error '30'");
        }
    } catch (e) {
        console.log("❌ Error reading reserve data:", e.message);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Diagnosis");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("💡 Possible Causes of Error '30' (BORROW_CAP_EXCEEDED):");
    console.log("   1. Borrow cap reached (unlikely on testnet)");
    console.log("   2. No WETH liquidity available in Aave pool");
    console.log("   3. Reserve is frozen or borrowing disabled");
    console.log("   4. User trying to borrow more than available");
    console.log("");
    console.log("💡 Solution:");
    console.log("   If liquidity is 0, someone needs to supply WETH to Aave Sepolia first");
    console.log("");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
