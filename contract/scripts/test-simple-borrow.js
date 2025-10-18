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
    console.log("🧪 Simple Borrow Test\n");

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

        // Update price feeds to refresh timestamp
        console.log("\n1️⃣ Updating Price Feeds...");
        const updateTx = await mockPyth.updatePriceFeeds([]);
        await updateTx.wait();
        console.log("   ✅ Price feeds updated");

        // Check ETH price
        console.log("\n2️⃣ Checking ETH Price...");
        const ethPrice = await lendingPool.getETHPrice();
        console.log("   ETH Price:", ethers.formatUnits(ethPrice, 8), "USD");

        // Check pool liquidity
        console.log("\n3️⃣ Checking Pool Liquidity...");
        const totalSupplied = await lendingPool.getTotalSupply();
        const totalBorrowed = await lendingPool.getTotalBorrowed();
        const available = totalSupplied - totalBorrowed;
        console.log("   Total Supplied:", ethers.formatUnits(totalSupplied, 6), "PYUSD");
        console.log("   Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD");
        console.log("   Available:", ethers.formatUnits(available, 6), "PYUSD");

        // Create loan
        console.log("\n4️⃣ Creating Loan...");
        const collateral = ethers.parseEther("0.5"); // 0.5 ETH = $1000
        const borrowAmount = ethers.parseUnits("500", 6); // Borrow 500 PYUSD
        const liquidationRatio = 6000; // 60%
        const shortRatio = 0;

        console.log("   Collateral:", ethers.formatEther(collateral), "ETH");
        console.log("   Borrow:", ethers.formatUnits(borrowAmount, 6), "PYUSD");
        console.log("   Liquidation Ratio:", liquidationRatio / 100, "%");

        const tx = await lendingPool.borrow(
            borrowAmount,
            liquidationRatio,
            shortRatio,
            { value: collateral }
        );

        console.log("   TX:", tx.hash);
        const receipt = await tx.wait();
        console.log("   ✅ Loan created!");

        // Find token ID
        let tokenId;
        for (const log of receipt.logs) {
            try {
                const parsed = loanNFT.interface.parseLog(log);
                if (parsed && parsed.name === "Transfer" && parsed.args[0] === ethers.ZeroAddress) {
                    tokenId = parsed.args[2];
                    break;
                }
            } catch {}
        }

        console.log("   Token ID:", tokenId?.toString());

        if (tokenId) {
            // Check loan details
            const loan = await lendingPool.getLoan(tokenId);
            console.log("\n📊 Loan Details:");
            console.log("   Borrower:", loan.borrower);
            console.log("   Collateral:", ethers.formatEther(loan.collateralAmount), "ETH");
            console.log("   Borrowed:", ethers.formatUnits(loan.borrowAmount, 6), "PYUSD");
            console.log("   Active:", loan.isActive);

            // Check health
            const health = await lendingPool.getHealthFactor(tokenId);
            console.log("   Health Factor:", ethers.formatUnits(health, 18));

            const isLiquidatable = await lendingPool.isLiquidatable(tokenId);
            console.log("   Is Liquidatable:", isLiquidatable);

            // Check PYUSD balance
            const pyusdBalance = await mockPYUSD.balanceOf(signerAddress);
            console.log("\n💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD");
        }

        console.log("\n✅ Test Complete!");

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
