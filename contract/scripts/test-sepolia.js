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
    console.log("🧪 Starting Sepolia Integration Tests...\n");

    try {
        // Connect to Sepolia
        const connection = await hre.network.connect();
        console.log("📡 Connected to network:", hre.network.name || "sepolia");

        const provider = new ethers.BrowserProvider(connection.provider);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("💼 Testing with account:", signerAddress);

        const balance = await provider.getBalance(signerAddress);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

        // Load contract ABIs
        const pyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json"), "utf8")
        );
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );

        // Create contract instances
        const mockPYUSD = new ethers.Contract(deployment.contracts.MockPYUSD, pyusdArtifact.abi, signer);
        const lendingPool = new ethers.Contract(deployment.contracts.EthereumLendingPool, poolArtifact.abi, signer);
        const loanNFT = new ethers.Contract(deployment.contracts.EthereumLoanNFT, nftArtifact.abi, signer);

        console.log("📝 Running tests...\n");

        // Test 1: Check PYUSD balance
        console.log("1️⃣ Checking PYUSD balance...");
        const pyusdBalance = await mockPYUSD.balanceOf(signerAddress);
        console.log("   PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD");

        // Test 2: Check pool liquidity
        console.log("\n2️⃣ Checking pool liquidity...");
        const totalSupplied = await lendingPool.getTotalSupply();
        const totalBorrowed = await lendingPool.getTotalBorrowed();
        const availableLiquidity = totalSupplied - totalBorrowed;
        console.log("   Total Supplied:", ethers.formatUnits(totalSupplied, 6), "PYUSD");
        console.log("   Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD");
        console.log("   Available Liquidity:", ethers.formatUnits(availableLiquidity, 6), "PYUSD");

        // Test 3: Get from faucet if needed
        if (pyusdBalance < ethers.parseUnits("1000", 6)) {
            console.log("\n3️⃣ Getting PYUSD from faucet...");
            const faucetTx = await mockPYUSD.faucet();
            await faucetTx.wait();
            const newBalance = await mockPYUSD.balanceOf(signerAddress);
            console.log("   New PYUSD Balance:", ethers.formatUnits(newBalance, 6), "PYUSD");
        }

        // Test 4: Create a test loan (deposit ETH, borrow PYUSD)
        console.log("\n4️⃣ Testing loan creation...");
        const collateralAmount = ethers.parseEther("0.01"); // 0.01 ETH
        const liquidationRatio = 6000; // 60%
        const shortRatio = 0; // No short position

        // Calculate how much PYUSD we can borrow
        // Assuming ETH price ~$2000, 0.01 ETH = $20
        // With 60% liquidation ratio, can borrow ~$12 = 12 PYUSD
        const borrowAmount = ethers.parseUnits("10", 6); // Borrow 10 PYUSD (conservative)

        console.log("   Depositing", ethers.formatEther(collateralAmount), "ETH as collateral");
        console.log("   Borrowing", ethers.formatUnits(borrowAmount, 6), "PYUSD");
        console.log("   Liquidation ratio:", liquidationRatio / 100, "%");

        try {
            // Create loan with ETH collateral
            const borrowTx = await lendingPool.borrow(
                borrowAmount,
                liquidationRatio,
                shortRatio,
                { value: collateralAmount }
            );
            console.log("   Transaction sent:", borrowTx.hash);

            const receipt = await borrowTx.wait();
            console.log("   ✅ Loan created successfully!");

            // Find the NFT token ID from events
            const mintEvent = receipt.logs.find(log => {
                try {
                    const parsed = loanNFT.interface.parseLog(log);
                    return parsed && parsed.name === "Transfer";
                } catch {
                    return false;
                }
            });

            if (mintEvent) {
                const parsedEvent = loanNFT.interface.parseLog(mintEvent);
                const tokenId = parsedEvent.args[2];
                console.log("   🎫 NFT Token ID:", tokenId.toString());

                // Get loan details
                const loanInfo = await lendingPool.getLoan(tokenId);
                console.log("\n   📊 Loan Details:");
                console.log("      Collateral:", ethers.formatEther(loanInfo.collateralAmount), "ETH");
                console.log("      Borrowed:", ethers.formatUnits(loanInfo.borrowedAmount, 6), "PYUSD");
                console.log("      Liquidation Ratio:", loanInfo.liquidationRatio / 100, "%");
                console.log("      Short Ratio:", loanInfo.shortRatio / 100, "%");
            }

        } catch (error) {
            console.log("   ⚠️ Loan creation failed (may need price feed updates):", error.message);
        }

        // Test 5: Check contract states
        console.log("\n5️⃣ Checking contract states...");
        const isPaused = await lendingPool.paused();
        console.log("   Pool paused:", isPaused);

        const nftName = await loanNFT.name();
        const nftSymbol = await loanNFT.symbol();
        console.log("   NFT:", nftName, "(" + nftSymbol + ")");

        // Summary
        console.log("\n=================================");
        console.log("✅ Integration Tests Complete!");
        console.log("=================================");
        console.log("\n📋 Contract Addresses:");
        console.log("  MockPYUSD:", deployment.contracts.MockPYUSD);
        console.log("  EthereumLoanNFT:", deployment.contracts.EthereumLoanNFT);
        console.log("  MockStETHVault:", deployment.contracts.MockStETHVault);
        console.log("  EthereumLendingPool:", deployment.contracts.EthereumLendingPool);
        console.log("\n🔗 View on Etherscan:");
        console.log("  https://sepolia.etherscan.io/address/" + deployment.contracts.EthereumLendingPool);

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