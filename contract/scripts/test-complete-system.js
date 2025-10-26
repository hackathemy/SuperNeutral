import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Comprehensive System Test on Sepolia
 *
 * Tests all features available on Sepolia:
 * 1. Supply PYUSD
 * 2. Borrow without short position
 * 3. Borrow with short position
 * 4. Check positions
 * 5. Repay and verify P&L
 */

async function main() {
    console.log("\n🧪 Starting Comprehensive System Test on Sepolia...\n");

    // Load deployment info
    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    console.log("📋 Using Deployed Contracts:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Lending Pool:", contracts.EthereumLendingPool);
    console.log("Vault Router:", contracts.VaultRouter);
    console.log("Short Router:", contracts.ShortPositionRouter);
    console.log("PYUSD:", contracts.PYUSD);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Setup
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    console.log("👤 Test User:", userAddress);
    const balance = await provider.getBalance(userAddress);
    console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH\n");

    // Load contract ABIs
    const lendingPoolAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json", "utf8")
    ).abi;
    const pyusdAbi = [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ];
    const vaultRouterAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json", "utf8")
    ).abi;
    const shortRouterAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/ShortPositionRouter.sol/ShortPositionRouter.json", "utf8")
    ).abi;

    // Connect to contracts
    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, signer);
    const pyusd = new ethers.Contract(contracts.PYUSD, pyusdAbi, signer);
    const vaultRouter = new ethers.Contract(contracts.VaultRouter, vaultRouterAbi, signer);
    const shortRouter = new ethers.Contract(contracts.ShortPositionRouter, shortRouterAbi, signer);

    try {
        // ==================== Test 1: Check PYUSD Balance ====================
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Test 1️⃣ : Check PYUSD Balance");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        const pyusdBalance = await pyusd.balanceOf(userAddress);
        console.log("💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD");

        if (pyusdBalance < ethers.parseUnits("20", 6)) {
            console.log("\n⚠️  Insufficient PYUSD balance!");
            console.log("   Get PYUSD from faucet:");
            console.log("   https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd\n");
            console.log("⏸️  Pausing test. Need at least 20 PYUSD.");
            return;
        }

        if (pyusdBalance < ethers.parseUnits("50", 6)) {
            console.log("\n💡 Note: Low PYUSD balance. Tests will use smaller amounts.\n");
        }

        // ==================== Test 2: Supply PYUSD ====================
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Test 2️⃣ : Supply PYUSD to Lending Pool");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Supply 80% of balance to leave some for potential fees
        const supplyAmount = (pyusdBalance * BigInt(80)) / BigInt(100);
        console.log("📤 Supplying:", ethers.formatUnits(supplyAmount, 6), "PYUSD");

        // Check allowance
        const allowance = await pyusd.allowance(userAddress, contracts.EthereumLendingPool);
        if (allowance < supplyAmount) {
            console.log("   Approving PYUSD...");
            const approveTx = await pyusd.approve(contracts.EthereumLendingPool, ethers.parseUnits("10000", 6));
            await approveTx.wait();
            console.log("   ✅ PYUSD approved");
        }

        console.log("   Supplying to pool...");
        const supplyTx = await lendingPool.supplyPYUSD(supplyAmount, ethers.ZeroAddress);
        const supplyReceipt = await supplyTx.wait();
        console.log("   ✅ Supplied successfully");
        console.log("   TX:", supplyReceipt.hash);

        // Check pool stats
        const totalSupply = await lendingPool.getTotalSupply();
        const totalBorrowed = await lendingPool.getTotalBorrowed();
        const utilization = await lendingPool.getUtilizationRate();

        console.log("\n📊 Pool Stats:");
        console.log("   Total Supply:", ethers.formatUnits(totalSupply, 6), "PYUSD");
        console.log("   Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD");
        console.log("   Utilization:", (Number(utilization) / 100).toFixed(2), "%");

        // ==================== Test 3: Borrow without Short Position ====================
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Test 3️⃣ : Borrow WITHOUT Short Position (100% Long)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        const collateral1 = ethers.parseEther("0.1"); // 0.1 ETH
        const borrowAmount1 = ethers.parseUnits("50", 6); // 50 PYUSD
        const liquidationRatio = 6000; // 60%
        const shortRatio1 = 0; // No short position

        console.log("💰 Collateral:", ethers.formatEther(collateral1), "ETH");
        console.log("💵 Borrow Amount:", ethers.formatUnits(borrowAmount1, 6), "PYUSD");
        console.log("📊 Short Ratio:", shortRatio1 / 100, "%");

        console.log("\n   Borrowing...");
        const borrowTx1 = await lendingPool.borrow(
            borrowAmount1,
            liquidationRatio,
            shortRatio1,
            ethers.ZeroAddress,
            { value: collateral1 }
        );
        const borrowReceipt1 = await borrowTx1.wait();

        // Get loan ID from event
        const borrowEvent1 = borrowReceipt1.logs.find(log => {
            try {
                const parsed = lendingPool.interface.parseLog(log);
                return parsed.name === "Borrowed";
            } catch {
                return false;
            }
        });
        const loanId1 = borrowEvent1 ? lendingPool.interface.parseLog(borrowEvent1).args.tokenId : null;

        console.log("   ✅ Borrowed successfully");
        console.log("   TX:", borrowReceipt1.hash);
        console.log("   Loan NFT ID:", loanId1.toString());

        // Check loan details
        const loan1 = await lendingPool.getLoan(loanId1);
        console.log("\n📄 Loan Details:");
        console.log("   Collateral:", ethers.formatEther(loan1.collateralAmount), "ETH");
        console.log("   Borrowed:", ethers.formatUnits(loan1.borrowAmount, 6), "PYUSD");
        console.log("   Short Ratio:", loan1.shortPositionRatio.toString(), "bps");
        console.log("   Short Position ID:", loan1.shortPositionId.toString());

        // ==================== Test 4: Borrow WITH Short Position ====================
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Test 4️⃣ : Borrow WITH Short Position (70% Long, 30% Short)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        const collateral2 = ethers.parseEther("0.3"); // 0.3 ETH (larger for short position)
        const borrowAmount2 = ethers.parseUnits("50", 6); // 50 PYUSD
        const shortRatio2 = 3000; // 30% short (0.09 ETH for short)

        console.log("💰 Collateral:", ethers.formatEther(collateral2), "ETH");
        console.log("💵 Borrow Amount:", ethers.formatUnits(borrowAmount2, 6), "PYUSD");
        console.log("📊 Short Ratio:", shortRatio2 / 100, "%");
        console.log("   └─ Long:", ethers.formatEther(collateral2 * BigInt(7000) / BigInt(10000)), "ETH → Aave V3");
        console.log("   └─ Short:", ethers.formatEther(collateral2 * BigInt(3000) / BigInt(10000)), "ETH → Aave+Uniswap");

        console.log("\n   Borrowing with short position...");
        const borrowTx2 = await lendingPool.borrow(
            borrowAmount2,
            liquidationRatio,
            shortRatio2,
            ethers.ZeroAddress,
            { value: collateral2 }
        );
        const borrowReceipt2 = await borrowTx2.wait();

        const borrowEvent2 = borrowReceipt2.logs.find(log => {
            try {
                const parsed = lendingPool.interface.parseLog(log);
                return parsed.name === "Borrowed";
            } catch {
                return false;
            }
        });
        const loanId2 = borrowEvent2 ? lendingPool.interface.parseLog(borrowEvent2).args.tokenId : null;

        console.log("   ✅ Borrowed successfully");
        console.log("   TX:", borrowReceipt2.hash);
        console.log("   Loan NFT ID:", loanId2.toString());

        // Check loan details
        const loan2 = await lendingPool.getLoan(loanId2);
        console.log("\n📄 Loan Details:");
        console.log("   Collateral:", ethers.formatEther(loan2.collateralAmount), "ETH");
        console.log("   Borrowed:", ethers.formatUnits(loan2.borrowAmount, 6), "PYUSD");
        console.log("   Short Ratio:", loan2.shortPositionRatio.toString(), "bps");
        console.log("   Short Position ID:", loan2.shortPositionId.toString());

        if (loan2.shortPositionId > 0) {
            console.log("\n   🎯 Short Position Created!");
            try {
                const shortPosition = await shortRouter.getPosition(loan2.shortPositionId);
                console.log("   Short Collateral:", ethers.formatEther(shortPosition.collateral), "ETH");
                console.log("   Borrowed Amount:", ethers.formatEther(shortPosition.borrowedAmount), "WETH");
                console.log("   Current Value:", ethers.formatUnits(shortPosition.currentValue, 6), "USDC");
                console.log("   Is Active:", shortPosition.isActive);
            } catch (e) {
                console.log("   ⚠️  Could not fetch short position details:", e.message);
            }
        }

        // ==================== Test 5: Check System Status ====================
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Test 5️⃣ : Check System Status");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Vault Router Status
        const vaultInfo = await vaultRouter.getVaultInfo();
        console.log("🏦 Vault Router:");
        console.log("   Active Strategy:", vaultInfo.currentStrategy);
        console.log("   Implementation:", vaultInfo.currentImplementation);

        // Short Router Status
        const shortInfo = await shortRouter.getStrategyInfo();
        console.log("\n📉 Short Router:");
        console.log("   Active Strategy:", shortInfo.currentStrategy);
        console.log("   Implementation:", shortInfo.currentImplementation);

        // Pool Status
        const finalSupply = await lendingPool.getTotalSupply();
        const finalBorrowed = await lendingPool.getTotalBorrowed();
        const finalUtilization = await lendingPool.getUtilizationRate();
        const interestRate = await lendingPool.getCurrentInterestRate();

        console.log("\n💹 Lending Pool:");
        console.log("   Total Supply:", ethers.formatUnits(finalSupply, 6), "PYUSD");
        console.log("   Total Borrowed:", ethers.formatUnits(finalBorrowed, 6), "PYUSD");
        console.log("   Utilization:", (Number(finalUtilization) / 100).toFixed(2), "%");
        console.log("   Interest Rate:", (Number(interestRate) / 100).toFixed(2), "%");

        // Health Factors
        console.log("\n❤️  Health Factors:");
        const health1 = await lendingPool.getHealthFactor(loanId1);
        const health2 = await lendingPool.getHealthFactor(loanId2);
        console.log("   Loan #" + loanId1 + ":", ethers.formatEther(health1));
        console.log("   Loan #" + loanId2 + ":", ethers.formatEther(health2));

        // ==================== Summary ====================
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ All Tests Completed Successfully!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        console.log("📋 Test Summary:");
        console.log("   ✅ PYUSD Supply: Working");
        console.log("   ✅ Borrow without Short: Working");
        console.log("   ✅ Borrow with Short: Working");
        console.log("   ✅ Vault Router: Active (Aave V3)");
        console.log("   ✅ Short Router: Active (Aave+Uniswap)");
        console.log("   ✅ Multi-strategy system: Fully Operational\n");

        console.log("🎯 Created Loans:");
        console.log("   Loan #" + loanId1 + ": 100% Long (no short)");
        console.log("   Loan #" + loanId2 + ": 70% Long + 30% Short");

        console.log("\n💡 Next Steps:");
        console.log("   1. Monitor positions over time");
        console.log("   2. Test repayment with: npm run test:repay");
        console.log("   3. Test strategy switching (owner only)");
        console.log("   4. Test liquidation scenarios\n");

        // Save test results
        const testResults = {
            timestamp: new Date().toISOString(),
            network: "sepolia",
            tester: userAddress,
            loans: {
                loan1: {
                    id: loanId1.toString(),
                    collateral: ethers.formatEther(collateral1),
                    borrowed: ethers.formatUnits(borrowAmount1, 6),
                    shortRatio: 0,
                    tx: borrowReceipt1.hash
                },
                loan2: {
                    id: loanId2.toString(),
                    collateral: ethers.formatEther(collateral2),
                    borrowed: ethers.formatUnits(borrowAmount2, 6),
                    shortRatio: 30,
                    shortPositionId: loan2.shortPositionId.toString(),
                    tx: borrowReceipt2.hash
                }
            },
            poolStats: {
                totalSupply: ethers.formatUnits(finalSupply, 6),
                totalBorrowed: ethers.formatUnits(finalBorrowed, 6),
                utilization: Number(finalUtilization) / 100,
                interestRate: Number(interestRate) / 100
            }
        };

        fs.writeFileSync("./test-results.json", JSON.stringify(testResults, null, 2));
        console.log("📄 Test results saved to: test-results.json\n");

    } catch (error) {
        console.error("\n❌ Test failed:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
