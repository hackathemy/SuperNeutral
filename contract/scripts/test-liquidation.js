import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

// Load deployment addresses
const deployment = JSON.parse(
    readFileSync(join(process.cwd(), "deployment-sepolia-mock.json"), "utf8")
);

async function main() {
    console.log("🧪 Testing Liquidation Flow\n");

    try {
        const connection = await hre.network.connect();
        const provider = new ethers.BrowserProvider(connection.provider);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("💼 Account:", signerAddress);

        // Load contracts
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );
        const pythArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json"), "utf8")
        );

        const lendingPool = new ethers.Contract(deployment.contracts.EthereumLendingPool, poolArtifact.abi, signer);
        const loanNFT = new ethers.Contract(deployment.contracts.EthereumLoanNFT, nftArtifact.abi, signer);
        const mockPyth = new ethers.Contract(deployment.contracts.MockPythOracle, pythArtifact.abi, signer);

        // Update price feeds
        console.log("\n1️⃣ Updating Price Feeds...");
        let updateTx = await mockPyth.updatePriceFeeds([]);
        await updateTx.wait();
        console.log("   ✅ Price feeds updated");

        // Check existing loans
        console.log("\n2️⃣ Checking Existing Loans...");
        let tokenId = 1; // From simple borrow test

        try {
            const loan = await lendingPool.getLoan(tokenId);
            console.log("   Loan Token ID:", tokenId);
            console.log("   Borrower:", loan.borrower);
            console.log("   Collateral:", ethers.formatEther(loan.collateralAmount), "ETH");
            console.log("   Borrowed:", ethers.formatUnits(loan.borrowAmount, 6), "PYUSD");
            console.log("   Active:", loan.isActive);

            const ethPrice = await lendingPool.getETHPrice();
            console.log("\n   Current ETH Price:", ethers.formatUnits(ethPrice, 8), "USD");

            const health = await lendingPool.getHealthFactor(tokenId);
            console.log("   Health Factor:", ethers.formatUnits(health, 18));

            const isLiquidatable = await lendingPool.isLiquidatable(tokenId);
            console.log("   Is Liquidatable:", isLiquidatable);

            if (!loan.isActive) {
                console.log("\n   ⚠️ Loan is not active");
                return;
            }

            // Simulate price crash
            console.log("\n3️⃣ Simulating ETH Price Crash...");
            const newPrice = 800; // Crash from $2000 to $800
            console.log("   Setting ETH price to $" + newPrice);

            // Use setPrice instead of setETHPrice
            const ETH_USD_FEED = "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6";
            const priceWith8Decimals = BigInt(newPrice) * BigInt(10**8);
            const crashTx = await mockPyth.setPrice(
                ETH_USD_FEED,
                priceWith8Decimals,
                -8
            );
            await crashTx.wait();

            // Update price feed timestamp
            updateTx = await mockPyth.updatePriceFeeds([]);
            await updateTx.wait();
            console.log("   ✅ Price updated");

            const newEthPrice = await lendingPool.getETHPrice();
            console.log("\n   New ETH Price:", ethers.formatUnits(newEthPrice, 8), "USD");

            const newHealth = await lendingPool.getHealthFactor(tokenId);
            console.log("   New Health Factor:", ethers.formatUnits(newHealth, 18));

            const nowLiquidatable = await lendingPool.isLiquidatable(tokenId);
            console.log("   Is Liquidatable:", nowLiquidatable);

            if (nowLiquidatable) {
                console.log("\n4️⃣ Liquidating Loan...");

                const balanceBefore = await provider.getBalance(signerAddress);

                const liquidateTx = await lendingPool.liquidate(tokenId);
                console.log("   TX:", liquidateTx.hash);

                const receipt = await liquidateTx.wait();
                console.log("   ✅ Liquidation completed!");

                const balanceAfter = await provider.getBalance(signerAddress);
                const gasUsed = receipt.gasUsed * receipt.gasPrice;

                console.log("\n📊 Liquidation Results:");
                console.log("   Gas used:", ethers.formatEther(gasUsed), "ETH");
                console.log("   Balance change:", ethers.formatEther(balanceAfter - balanceBefore), "ETH");

                // Check if NFT was burned
                try {
                    await loanNFT.ownerOf(tokenId);
                    console.log("   NFT still exists");
                } catch {
                    console.log("   🔥 NFT was burned");
                }

                // Check loan status
                const finalLoan = await lendingPool.getLoan(tokenId);
                console.log("   Loan active:", finalLoan.isActive);

            } else {
                console.log("\n   ⚠️ Loan is still not liquidatable");
                console.log("   Health factor needs to be below liquidation threshold");
            }

            console.log("\n✅ Test Complete!");

        } catch (error) {
            console.error("   ❌ Error:", error.message);
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
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
