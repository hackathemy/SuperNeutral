import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

// Load deployment addresses (Mock Pyth version)
const deployment = JSON.parse(
    readFileSync(join(process.cwd(), "deployment-sepolia-mock.json"), "utf8")
);

async function main() {
    console.log("🧪 Testing Full Loan Flow: Borrow → Liquidate → Repay\n");

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
        const pythArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json"), "utf8")
        );

        const lendingPool = new ethers.Contract(deployment.contracts.EthereumLendingPool, poolArtifact.abi, signer);
        const loanNFT = new ethers.Contract(deployment.contracts.EthereumLoanNFT, nftArtifact.abi, signer);
        const mockPYUSD = new ethers.Contract(deployment.contracts.MockPYUSD, pyusdArtifact.abi, signer);
        const mockPyth = new ethers.Contract(deployment.contracts.MockPythOracle, pythArtifact.abi, signer);

        console.log("=================================");
        console.log("📊 STEP 1: Check Initial State");
        console.log("=================================\n");

        // Check ETH price
        const ethPrice = await lendingPool.getETHPrice();
        console.log("💹 ETH Price:", ethers.formatUnits(ethPrice, 8), "USD");

        // Check pool liquidity
        const totalSupplied = await lendingPool.getTotalSupply();
        const totalBorrowed = await lendingPool.getTotalBorrowed();
        console.log("💰 Pool Liquidity:", ethers.formatUnits(totalSupplied, 6), "PYUSD");
        console.log("📊 Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD\n");

        console.log("=================================");
        console.log("📊 STEP 2: Create Loan");
        console.log("=================================\n");

        const collateralAmount = ethers.parseEther("0.1"); // 0.1 ETH
        const liquidationRatio = 6000; // 60%
        const shortRatio = 0; // No short position

        // ETH = $2000, 0.1 ETH = $200
        // At 60% liquidation ratio, can borrow $200 * 0.6 = $120
        const borrowAmount = ethers.parseUnits("100", 6); // Borrow 100 PYUSD (safe)

        console.log("📝 Loan Parameters:");
        console.log("  Collateral:", ethers.formatEther(collateralAmount), "ETH");
        console.log("  Borrow Amount:", ethers.formatUnits(borrowAmount, 6), "PYUSD");
        console.log("  Liquidation Ratio:", liquidationRatio / 100, "%");
        console.log("  Short Ratio:", shortRatio / 100, "%\n");

        const borrowTx = await lendingPool.borrow(
            borrowAmount,
            liquidationRatio,
            shortRatio,
            { value: collateralAmount }
        );
        console.log("📝 Transaction hash:", borrowTx.hash);

        const receipt = await borrowTx.wait();
        console.log("✅ Loan created successfully!\n");

        // Find NFT token ID
        let loanTokenId = null;
        for (const log of receipt.logs) {
            try {
                const parsed = loanNFT.interface.parseLog(log);
                if (parsed && parsed.name === "Transfer" && parsed.args[0] === ethers.ZeroAddress) {
                    loanTokenId = parsed.args[2];
                    console.log("🎫 NFT Token ID:", loanTokenId.toString());
                    break;
                }
            } catch {}
        }

        if (!loanTokenId) {
            console.log("❌ Could not find loan token ID");
            return;
        }

        // Get loan details
        const loan = await lendingPool.getLoan(loanTokenId);
        console.log("\n📊 Loan Details:");
        console.log("  Collateral:", ethers.formatEther(loan.collateralAmount), "ETH");
        console.log("  Borrowed:", ethers.formatUnits(loan.borrowAmount, 6), "PYUSD");
        console.log("  Liquidation Ratio:", loan.liquidationRatio / 100, "%");

        // Check health factor
        const healthFactor = await lendingPool.getHealthFactor(loanTokenId);
        console.log("  Health Factor:", ethers.formatUnits(healthFactor, 18));

        const isLiquidatable = await lendingPool.isLiquidatable(loanTokenId);
        console.log("  Is Liquidatable:", isLiquidatable);

        // Check PYUSD balance
        const pyusdBalance = await mockPYUSD.balanceOf(signerAddress);
        console.log("\n💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD\n");

        console.log("=================================");
        console.log("📊 STEP 3: Simulate Price Crash");
        console.log("=================================\n");

        // Crash ETH price to trigger liquidation
        // From $2000 to $800 (60% drop)
        const newPrice = 800;
        console.log("💥 Simulating ETH price crash to $" + newPrice);

        const crashTx = await mockPyth.setETHPrice(newPrice);
        await crashTx.wait();
        console.log("✅ Price updated\n");

        const newEthPrice = await lendingPool.getETHPrice();
        console.log("💹 New ETH Price:", ethers.formatUnits(newEthPrice, 8), "USD");

        // Check health factor again
        const newHealthFactor = await lendingPool.getHealthFactor(loanTokenId);
        console.log("⚠️  New Health Factor:", ethers.formatUnits(newHealthFactor, 18));

        const nowLiquidatable = await lendingPool.isLiquidatable(loanTokenId);
        console.log("🚨 Is Liquidatable:", nowLiquidatable, "\n");

        if (nowLiquidatable) {
            console.log("=================================");
            console.log("📊 STEP 4: Liquidate Loan");
            console.log("=================================\n");

            const balanceBeforeLiquidation = await provider.getBalance(signerAddress);

            const liquidateTx = await lendingPool.liquidate(loanTokenId);
            console.log("📝 Liquidation transaction:", liquidateTx.hash);

            const liquidateReceipt = await liquidateTx.wait();
            console.log("✅ Liquidation completed!\n");

            const balanceAfterLiquidation = await provider.getBalance(signerAddress);
            const returned = balanceAfterLiquidation - balanceBeforeLiquidation;

            console.log("💰 ETH returned to NFT owner:", ethers.formatEther(returned > 0 ? returned : 0), "ETH");
            console.log("   (After paying debt and gas fees)\n");

            // Check if NFT was burned
            try {
                await loanNFT.ownerOf(loanTokenId);
                console.log("NFT still exists");
            } catch {
                console.log("🔥 NFT was burned after liquidation");
            }
        } else {
            console.log("⚠️  Loan not liquidatable, trying manual repayment...\n");

            console.log("=================================");
            console.log("📊 STEP 4: Repay Loan");
            console.log("=================================\n");

            const repayAmount = loan.borrowAmount;
            console.log("Repaying:", ethers.formatUnits(repayAmount, 6), "PYUSD\n");

            // Approve PYUSD
            const approveTx = await mockPYUSD.approve(deployment.contracts.EthereumLendingPool, repayAmount);
            await approveTx.wait();
            console.log("✅ Approved PYUSD");

            // Repay loan
            const repayTx = await lendingPool.repay(loanTokenId, repayAmount);
            console.log("📝 Repayment transaction:", repayTx.hash);

            await repayTx.wait();
            console.log("✅ Loan repaid successfully!\n");

            // Check if NFT was burned
            try {
                await loanNFT.ownerOf(loanTokenId);
                console.log("NFT still exists (partial repayment)");
            } catch {
                console.log("🔥 NFT was burned (full repayment)");
            }
        }

        // Final balances
        console.log("\n=================================");
        console.log("📊 Final State");
        console.log("=================================\n");

        const finalEthBalance = await provider.getBalance(signerAddress);
        const finalPyusdBalance = await mockPYUSD.balanceOf(signerAddress);

        console.log("💰 Final ETH Balance:", ethers.formatEther(finalEthBalance), "ETH");
        console.log("💵 Final PYUSD Balance:", ethers.formatUnits(finalPyusdBalance, 6), "PYUSD");

        const finalTotalBorrowed = await lendingPool.getTotalBorrowed();
        console.log("📊 Pool Total Borrowed:", ethers.formatUnits(finalTotalBorrowed, 6), "PYUSD\n");

        console.log("=================================");
        console.log("✅ All Tests Completed!");
        console.log("=================================");
        console.log("\n🔗 View on Etherscan:");
        console.log("  Lending Pool:", deployment.explorerUrls.EthereumLendingPool);
        console.log("  Loan NFT:", deployment.explorerUrls.EthereumLoanNFT);

    } catch (error) {
        console.error("❌ Test failed:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
