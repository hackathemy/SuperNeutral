import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Setup Test Loan for Repayment Testing
 * 1. Supply PYUSD to pool
 * 2. Create a test loan
 */

async function main() {
    console.log("\n🔧 Setting up Test Loan for Repayment...\n");

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
    const pyusdAbi = [
        "function balanceOf(address) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
    ];

    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, signer);
    const pyusd = new ethers.Contract(contracts.PYUSD, pyusdAbi, signer);

    console.log("📋 Contract Addresses:");
    console.log("   Lending Pool:", contracts.EthereumLendingPool);
    console.log("   PYUSD:", contracts.PYUSD);
    console.log("");

    console.log("👤 User:", userAddress);
    const ethBalance = await provider.getBalance(userAddress);
    const pyusdBalance = await pyusd.balanceOf(userAddress);
    console.log("💰 ETH Balance:", ethers.formatEther(ethBalance), "ETH");
    console.log("💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD\n");

    // ==================== Step 1: Supply PYUSD ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Supply PYUSD to Pool");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (pyusdBalance < ethers.parseUnits("20", 6)) {
        console.log("❌ Insufficient PYUSD balance");
        console.log("   Get PYUSD: https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd\n");
        return;
    }

    const supplyAmount = (pyusdBalance * BigInt(60)) / BigInt(100); // 60% of balance
    console.log(`📤 Supplying: ${ethers.formatUnits(supplyAmount, 6)} PYUSD (60% of balance)\n`);

    // Approve
    console.log("   Approving PYUSD...");
    const approveTx = await pyusd.approve(contracts.EthereumLendingPool, supplyAmount);
    await approveTx.wait();
    console.log("   ✅ Approved\n");

    // Supply
    console.log("   Supplying to pool...");
    const supplyTx = await lendingPool.supplyPYUSD(supplyAmount, ethers.ZeroAddress);
    const supplyReceipt = await supplyTx.wait();
    console.log("   ✅ Supplied");
    console.log("   TX:", supplyReceipt.hash);
    console.log("");

    // ==================== Step 2: Create Test Loan ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Create Test Loan");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const collateral = ethers.parseEther("0.1"); // 0.1 ETH
    const borrowAmount = ethers.parseUnits("30", 6); // 30 PYUSD
    const liquidationRatio = 6000; // 60%
    const shortRatio = 0; // 0% (100% long)

    console.log("📊 Loan Parameters:");
    console.log(`   Collateral: ${ethers.formatEther(collateral)} ETH`);
    console.log(`   Borrow Amount: ${ethers.formatUnits(borrowAmount, 6)} PYUSD`);
    console.log(`   Liquidation Ratio: ${liquidationRatio / 100}%`);
    console.log(`   Short Ratio: ${shortRatio}% (100% long)\n`);

    console.log("   Creating loan...");
    const borrowTx = await lendingPool.borrow(
        borrowAmount,
        liquidationRatio,
        shortRatio,
        ethers.ZeroAddress,
        { value: collateral }
    );
    const borrowReceipt = await borrowTx.wait();
    console.log("   ✅ Loan created");
    console.log("   TX:", borrowReceipt.hash);

    // Get loan ID from event
    const borrowEvent = borrowReceipt.logs.find(log => {
        try {
            const parsed = lendingPool.interface.parseLog(log);
            return parsed.name === "Borrowed";
        } catch {
            return false;
        }
    });

    if (borrowEvent) {
        const parsed = lendingPool.interface.parseLog(borrowEvent);
        const loanId = parsed.args[1]; // tokenId
        console.log("   Loan NFT ID:", loanId.toString());
        console.log("");

        // Verify loan
        const loan = await lendingPool.loans(loanId);
        console.log("📄 Loan Details:");
        console.log(`   Collateral: ${ethers.formatEther(loan.collateralAmount)} ETH`);
        console.log(`   Borrowed: ${ethers.formatUnits(loan.borrowAmount, 6)} PYUSD`);
        console.log(`   Is Active: ${loan.isActive ? "✅ Yes" : "❌ No"}`);
        console.log("");
    }

    // ==================== Pool Status ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Pool Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const totalSupply = await lendingPool.getTotalSupply();
    const totalBorrowed = await lendingPool.getTotalBorrowed();
    const utilization = totalBorrowed > 0 && totalSupply > 0
        ? (totalBorrowed * BigInt(10000)) / totalSupply
        : BigInt(0);

    console.log("📊 Pool Statistics:");
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 6)} PYUSD`);
    console.log(`   Total Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} PYUSD`);
    console.log(`   Utilization: ${Number(utilization) / 100}%\n`);

    console.log("✅ Test loan setup completed");
    console.log("💡 You can now run: npm run test:repay\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
