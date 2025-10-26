import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

/**
 * Test Full Loan Flow on Sepolia
 *
 * 1. Supply PYUSD liquidity
 * 2. Borrow PYUSD with ETH collateral
 * 3. Repay loan and recover collateral
 */

// Deployed contract addresses from deploy-sepolia-output.log
const CONTRACTS = {
    pythOracle: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
    pyusd: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    loanNFT: "0x1D999BC11B60EC34e299E6720283D5927DAc4c78",
    vault: "0x2D8d456c7697920bF5a0E2fb37F3F30E9b12Dae7",
    stakedPYUSD: "0x43a77FBF42b35ACbDB16555Cc7d46aCB41654215",
    vaultRouter: "0x125Ed9eecFB179637037f81FEBf2E63753a08549",
    shortRouter: "0x7d7E6B2A5D73FD8D32f33babCdB2B46DF992A72b",
    lendingPool: "0xfAF2cf03dE8B230A8412Ad53cc11800E018692a0"
};

async function main() {
    console.log("🚀 Testing Lending Protocol on Sepolia...\n");

    // Connect to network
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    console.log("📡 Network:", hre.network.name);
    console.log("💼 Account:", signerAddress);

    const balance = await provider.getBalance(signerAddress);
    console.log("💰 ETH Balance:", ethers.formatEther(balance), "ETH\n");

    // Load contract ABIs
    const pyusdArtifact = JSON.parse(
        readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json"), "utf8")
    );
    const poolArtifact = JSON.parse(
        readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
    );
    const spyusdArtifact = JSON.parse(
        readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json"), "utf8")
    );

    // Connect to deployed contracts
    const pyusd = new ethers.Contract(CONTRACTS.pyusd, pyusdArtifact.abi, signer);
    const lendingPool = new ethers.Contract(CONTRACTS.lendingPool, poolArtifact.abi, signer);
    const stakedPYUSD = new ethers.Contract(CONTRACTS.stakedPYUSD, spyusdArtifact.abi, signer);

    console.log("================================");
    console.log("Step 1️⃣: Check PYUSD Balance");
    console.log("================================\n");

    const pyusdBalance = await pyusd.balanceOf(signerAddress);
    console.log("💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD");

    if (pyusdBalance < ethers.parseUnits("30", 6)) {
        console.log("\n⚠️  Need PYUSD from faucet:");
        console.log("   https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd");
        console.log("\n❌ Insufficient PYUSD balance. Get at least 30 PYUSD from faucet first.");
        return;
    }

    console.log("\n================================");
    console.log("Step 2️⃣: Supply PYUSD to Pool");
    console.log("================================\n");

    const supplyAmount = ethers.parseUnits("25", 6); // Supply 25 PYUSD (adjusted for available balance)

    console.log("💸 Approving", ethers.formatUnits(supplyAmount, 6), "PYUSD...");
    const approveTx = await pyusd.approve(CONTRACTS.lendingPool, supplyAmount);
    await approveTx.wait();
    console.log("✅ Approved");

    console.log("💰 Supplying", ethers.formatUnits(supplyAmount, 6), "PYUSD...");
    const supplyTx = await lendingPool.supplyPYUSD(supplyAmount, signerAddress);
    await supplyTx.wait();
    console.log("✅ Supplied");

    const spyusdBalance = await stakedPYUSD.balanceOf(signerAddress);
    console.log("📊 Received sPYUSD:", ethers.formatUnits(spyusdBalance, 6));

    console.log("\n================================");
    console.log("Step 3️⃣: Borrow PYUSD with ETH");
    console.log("================================\n");

    const borrowAmount = ethers.parseUnits("10", 6); // Borrow 10 PYUSD (adjusted)
    const collateralAmount = ethers.parseEther("0.01"); // 0.01 ETH collateral

    console.log("🎯 Borrowing", ethers.formatUnits(borrowAmount, 6), "PYUSD");
    console.log("🔒 Collateral:", ethers.formatEther(collateralAmount), "ETH");
    console.log("📊 LTV: 60% (default)");
    console.log("⚠️  Short position: DISABLED (testnet mode)");

    try {
        const borrowTx = await lendingPool.borrow(
            borrowAmount,
            6000, // 60% liquidation ratio (BASIS_POINTS)
            0,    // 0% short ratio (disabled for testnet)
            ethers.ZeroAddress, // onBehalfOf (use zero address to default to msg.sender)
            { value: collateralAmount }
        );
        const receipt = await borrowTx.wait();
        console.log("✅ Borrow successful!");
        console.log("📝 Transaction:", receipt.hash);

        // Check PYUSD balance after borrow
        const pyusdAfterBorrow = await pyusd.balanceOf(signerAddress);
        console.log("💵 PYUSD balance after borrow:", ethers.formatUnits(pyusdAfterBorrow, 6), "PYUSD");

        console.log("\n================================");
        console.log("Step 4️⃣: REPAY Loan (CRITICAL)");
        console.log("================================\n");

        // Get loan details
        const loanId = 1; // First loan
        console.log("🔍 Checking loan #", loanId);

        // Approve PYUSD for repayment
        const repayAmount = ethers.parseUnits("11", 6); // Slightly more to cover any interest (adjusted)
        console.log("💸 Approving", ethers.formatUnits(repayAmount, 6), "PYUSD for repayment...");
        const approveRepayTx = await pyusd.approve(CONTRACTS.lendingPool, repayAmount);
        await approveRepayTx.wait();
        console.log("✅ Approved");

        console.log("💰 Repaying loan #", loanId);
        const repayTx = await lendingPool.repay(loanId);
        const repayReceipt = await repayTx.wait();
        console.log("✅ Repayment successful!");
        console.log("📝 Transaction:", repayReceipt.hash);

        // Check balances after repayment
        const ethAfterRepay = await provider.getBalance(signerAddress);
        const pyusdAfterRepay = await pyusd.balanceOf(signerAddress);

        console.log("\n📊 Final Balances:");
        console.log("   ETH:", ethers.formatEther(ethAfterRepay), "ETH (collateral returned)");
        console.log("   PYUSD:", ethers.formatUnits(pyusdAfterRepay, 6), "PYUSD");

        console.log("\n=================================");
        console.log("🎉 SUCCESS! Full Loan Cycle Complete");
        console.log("=================================");
        console.log("✅ Supply PYUSD - PASSED");
        console.log("✅ Borrow with collateral - PASSED");
        console.log("✅ Repay loan - PASSED");
        console.log("=================================");

    } catch (error) {
        console.error("❌ Test failed:", error);

        if (error.data) {
            console.error("Error data:", error.data);
        }
        if (error.reason) {
            console.error("Reason:", error.reason);
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
