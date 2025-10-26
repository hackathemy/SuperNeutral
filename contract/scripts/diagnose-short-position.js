import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Diagnose Short Position Issues
 * Debug error "30" when creating short positions
 */

async function main() {
    console.log("\n🔍 Diagnosing Short Position System...\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Load contract ABIs
    const lendingPoolAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json", "utf8")
    ).abi;
    const shortRouterAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/ShortPositionRouter.sol/ShortPositionRouter.json", "utf8")
    ).abi;
    const aaveShortAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/AaveUniswapShort.sol/AaveUniswapShort.json", "utf8")
    ).abi;

    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, signer);
    const shortRouter = new ethers.Contract(contracts.ShortPositionRouter, shortRouterAbi, provider);
    const aaveShort = new ethers.Contract(contracts.AaveUniswapShort, aaveShortAbi, provider);

    console.log("📋 Contract Addresses:");
    console.log("   Lending Pool:", contracts.EthereumLendingPool);
    console.log("   Short Router:", contracts.ShortPositionRouter);
    console.log("   Aave Short:", contracts.AaveUniswapShort);
    console.log("");

    // Check 1: Short Router Configuration
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Check 1️⃣ : Short Router Configuration");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const activeStrategy = await shortRouter.activeStrategy();
        console.log("✅ Active Strategy ID:", activeStrategy.toString());

        const strategyAddress = await shortRouter.strategies(0);
        console.log("✅ Strategy 0 Address:", strategyAddress);
        console.log("   Match:", strategyAddress.toLowerCase() === contracts.AaveUniswapShort.toLowerCase() ? "✅" : "❌");
    } catch (e) {
        console.log("❌ Error reading short router config:", e.message);
    }

    // Check 2: Authorization
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Check 2️⃣ : Authorization Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const shortRouterAuthorized = await shortRouter.authorizedCallers(contracts.EthereumLendingPool);
        console.log("Short Router ← Lending Pool:", shortRouterAuthorized ? "✅ Authorized" : "❌ Not Authorized");

        const aaveShortAuthorized = await aaveShort.authorizedCallers(contracts.ShortPositionRouter);
        console.log("Aave Short ← Short Router:", aaveShortAuthorized ? "✅ Authorized" : "❌ Not Authorized");
    } catch (e) {
        console.log("❌ Error checking authorization:", e.message);
    }

    // Check 3: Aave Integration
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Check 3️⃣ : Aave V3 Integration");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
    const WETH = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

    try {
        const aavePoolAbi = [
            "function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
        ];
        const aavePool = new ethers.Contract(AAVE_POOL, aavePoolAbi, provider);

        const accountData = await aavePool.getUserAccountData(contracts.AaveUniswapShort);
        console.log("📊 Aave Account Data for AaveUniswapShort:");
        console.log("   Total Collateral:", ethers.formatEther(accountData[0]), "USD");
        console.log("   Total Debt:", ethers.formatEther(accountData[1]), "USD");
        console.log("   Available Borrows:", ethers.formatEther(accountData[2]), "USD");
        console.log("   Health Factor:", ethers.formatEther(accountData[5]));
    } catch (e) {
        console.log("❌ Error reading Aave data:", e.message);
    }

    // Check 4: Test Small Short Position Directly
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Check 4️⃣ : Test Direct Short Position Creation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("💡 Attempting to create short position with different amounts:");

    const testAmounts = [
        { eth: "0.05", label: "0.05 ETH" },
        { eth: "0.1", label: "0.1 ETH" },
        { eth: "0.2", label: "0.2 ETH" }
    ];

    for (const test of testAmounts) {
        try {
            const ethAmount = ethers.parseEther(test.eth);
            const leverage = 2; // 2x
            const minOutput = 0; // Accept any output

            console.log(`\n   Testing ${test.label}...`);

            // Try to estimate gas first
            const gasEstimate = await shortRouter.openShort.estimateGas(
                ethAmount,
                leverage,
                minOutput,
                { value: ethAmount }
            );

            console.log(`   ✅ Gas estimate: ${gasEstimate.toString()} (Should work!)`);
        } catch (e) {
            if (e.reason) {
                console.log(`   ❌ Error: ${e.reason}`);
            } else if (e.message.includes("30")) {
                console.log(`   ❌ Error code: "30" (Aave/Uniswap issue)`);
            } else {
                console.log(`   ❌ Error: ${e.message.substring(0, 100)}`);
            }
        }
    }

    // Check 5: WETH Balance
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Check 5️⃣ : Token Balances");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const wethAbi = [
        "function balanceOf(address) external view returns (uint256)"
    ];
    const weth = new ethers.Contract(WETH, wethAbi, provider);

    try {
        const wethBalance = await weth.balanceOf(contracts.AaveUniswapShort);
        console.log("WETH Balance (AaveUniswapShort):", ethers.formatEther(wethBalance), "WETH");
    } catch (e) {
        console.log("❌ Error reading WETH balance:", e.message);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
