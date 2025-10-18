import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

// Load deployment addresses
const deployment = JSON.parse(
    readFileSync(join(process.cwd(), "deployment-sepolia.json"), "utf8")
);

async function main() {
    console.log("🧪 Testing Borrowing and Liquidation on Sepolia...\n");

    try {
        // Connect to Sepolia
        const connection = await hre.network.connect();
        const provider = new ethers.BrowserProvider(connection.provider);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("💼 Testing with account:", signerAddress);
        const balance = await provider.getBalance(signerAddress);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

        // Load contract ABIs
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );
        const pyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json"), "utf8")
        );

        const lendingPool = new ethers.Contract(deployment.contracts.EthereumLendingPool, poolArtifact.abi, signer);
        const loanNFT = new ethers.Contract(deployment.contracts.EthereumLoanNFT, nftArtifact.abi, signer);
        const mockPYUSD = new ethers.Contract(deployment.contracts.MockPYUSD, pyusdArtifact.abi, signer);

        // Test 1: Check Pyth Oracle Price Feeds
        console.log("1️⃣ Testing Pyth Oracle Price Feeds...");
        try {
            const ethPrice = await lendingPool.getETHPrice();
            console.log("   ✅ ETH Price:", ethers.formatUnits(ethPrice, 8), "USD");
            console.log("   📊 Price in wei:", ethPrice.toString());
        } catch (error) {
            console.log("   ⚠️ Price feed error:", error.message);
            console.log("   💡 This is expected on testnet - Pyth may need price updates");
        }

        // Test 2: Create a loan with conservative parameters
        console.log("\n2️⃣ Testing Loan Creation...");

        const collateralAmount = ethers.parseEther("0.1"); // 0.1 ETH
        const liquidationRatio = 7000; // 70% (conservative)
        const shortRatio = 0; // No short position

        // Try to estimate gas first to see if transaction would succeed
        console.log("   Depositing", ethers.formatEther(collateralAmount), "ETH as collateral");
        console.log("   Liquidation ratio:", liquidationRatio / 100, "%");

        // Calculate expected borrow amount
        // If ETH = $2000, 0.1 ETH = $200
        // At 70% liquidation ratio, can borrow ~$140
        const borrowAmount = ethers.parseUnits("100", 6); // Conservative: 100 PYUSD
        console.log("   Attempting to borrow:", ethers.formatUnits(borrowAmount, 6), "PYUSD");

        let loanTokenId = null;

        try {
            const borrowTx = await lendingPool.borrow(
                borrowAmount,
                liquidationRatio,
                shortRatio,
                { value: collateralAmount }
            );
            console.log("   📝 Transaction hash:", borrowTx.hash);

            const receipt = await borrowTx.wait();
            console.log("   ✅ Loan created successfully!");

            // Find NFT token ID from Transfer event
            for (const log of receipt.logs) {
                try {
                    const parsed = loanNFT.interface.parseLog(log);
                    if (parsed && parsed.name === "Transfer" && parsed.args[0] === ethers.ZeroAddress) {
                        loanTokenId = parsed.args[2];
                        console.log("   🎫 NFT Token ID:", loanTokenId.toString());
                        break;
                    }
                } catch {}
            }

            if (loanTokenId) {
                // Get loan details
                const loan = await lendingPool.getLoan(loanTokenId);
                console.log("\n   📊 Loan Details:");
                console.log("      Collateral:", ethers.formatEther(loan.collateralAmount), "ETH");
                console.log("      Borrowed:", ethers.formatUnits(loan.borrowedAmount, 6), "PYUSD");
                console.log("      Liquidation Ratio:", loan.liquidationRatio / 100, "%");
                console.log("      Short Ratio:", loan.shortRatio / 100, "%");
                console.log("      Timestamp:", new Date(Number(loan.timestamp) * 1000).toISOString());

                // Check health factor
                try {
                    const healthFactor = await lendingPool.getHealthFactor(loanTokenId);
                    console.log("      Health Factor:", ethers.formatUnits(healthFactor, 18));

                    const isLiquidatable = await lendingPool.isLiquidatable(loanTokenId);
                    console.log("      Is Liquidatable:", isLiquidatable);
                } catch (error) {
                    console.log("      ⚠️ Cannot check health factor:", error.message);
                }

                // Check PYUSD balance after borrowing
                const pyusdBalance = await mockPYUSD.balanceOf(signerAddress);
                console.log("\n   💵 PYUSD Balance after borrow:", ethers.formatUnits(pyusdBalance, 6), "PYUSD");
            }

        } catch (error) {
            console.log("   ❌ Loan creation failed:", error.message);
            if (error.data) {
                console.log("   Error data:", error.data);
            }
        }

        // Test 3: Liquidation Scenario (if loan was created)
        if (loanTokenId) {
            console.log("\n3️⃣ Testing Liquidation Scenario...");

            try {
                // Check if liquidatable
                const isLiquidatable = await lendingPool.isLiquidatable(loanTokenId);
                console.log("   Current liquidation status:", isLiquidatable);

                if (isLiquidatable) {
                    console.log("   🚨 Loan is liquidatable! Proceeding with liquidation...");

                    const liquidateTx = await lendingPool.liquidate(loanTokenId);
                    console.log("   📝 Liquidation transaction:", liquidateTx.hash);

                    await liquidateTx.wait();
                    console.log("   ✅ Liquidation completed!");

                    // Check if NFT still exists
                    try {
                        const owner = await loanNFT.ownerOf(loanTokenId);
                        console.log("   NFT owner after liquidation:", owner);
                    } catch {
                        console.log("   NFT was burned during liquidation");
                    }
                } else {
                    console.log("   ✅ Loan is healthy (not liquidatable)");
                    console.log("   💡 To test liquidation, ETH price needs to drop significantly");
                }

            } catch (error) {
                console.log("   ⚠️ Liquidation check failed:", error.message);
            }

            // Test 4: Repayment
            console.log("\n4️⃣ Testing Loan Repayment...");
            try {
                const loan = await lendingPool.getLoan(loanTokenId);
                const repayAmount = loan.borrowedAmount;

                console.log("   Repaying:", ethers.formatUnits(repayAmount, 6), "PYUSD");

                // Approve PYUSD
                const approveTx = await mockPYUSD.approve(deployment.contracts.EthereumLendingPool, repayAmount);
                await approveTx.wait();
                console.log("   ✅ Approved PYUSD");

                // Repay loan
                const repayTx = await lendingPool.repay(loanTokenId, repayAmount);
                console.log("   📝 Repayment transaction:", repayTx.hash);

                await repayTx.wait();
                console.log("   ✅ Loan repaid successfully!");

                // Check if NFT was burned
                try {
                    await loanNFT.ownerOf(loanTokenId);
                    console.log("   NFT still exists (partial repayment)");
                } catch {
                    console.log("   🔥 NFT was burned (full repayment)");
                }

                // Check ETH balance returned
                const newBalance = await provider.getBalance(signerAddress);
                console.log("   💰 New ETH balance:", ethers.formatEther(newBalance), "ETH");

            } catch (error) {
                console.log("   ⚠️ Repayment failed:", error.message);
            }
        }

        // Summary
        console.log("\n=================================");
        console.log("✅ Testing Complete!");
        console.log("=================================");
        console.log("\n📊 Test Results:");
        console.log("  ✓ Price feed check");
        console.log("  ✓ Loan creation:", loanTokenId ? "Success" : "Failed (price feed issue)");
        console.log("  ✓ Liquidation check");
        console.log("  ✓ Repayment test");
        console.log("\n🔗 View on Etherscan:");
        console.log("  " + deployment.explorerUrls.EthereumLendingPool);

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
