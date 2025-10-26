import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Test Loan Repayment Functionality
 * Tests full repayment with interest calculation
 */

async function main() {
    console.log("\n🧪 Testing Loan Repayment on Sepolia...\n");

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
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];
    const loanNFTAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json", "utf8")
    ).abi;

    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, signer);
    const pyusd = new ethers.Contract(contracts.PYUSD, pyusdAbi, signer);
    const loanNFT = new ethers.Contract(contracts.EthereumLoanNFT, loanNFTAbi, provider);

    console.log("📋 Using Deployed Contracts:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Lending Pool:", contracts.EthereumLendingPool);
    console.log("PYUSD:", contracts.PYUSD);
    console.log("Loan NFT:", contracts.EthereumLoanNFT);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("👤 Test User:", userAddress);
    const ethBalance = await provider.getBalance(userAddress);
    const pyusdBalance = await pyusd.balanceOf(userAddress);
    console.log("💰 ETH Balance:", ethers.formatEther(ethBalance), "ETH");
    console.log("💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD\n");

    // ==================== Check Current Loans ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Check Current Loan Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check which loans the user owns
    let loanIds = [];
    for (let i = 1; i <= 10; i++) {
        try {
            const owner = await loanNFT.ownerOf(i);
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
                loanIds.push(i);
            }
        } catch (e) {
            // Loan doesn't exist or is burned
        }
    }

    if (loanIds.length === 0) {
        console.log("❌ No loans found for this user");
        console.log("💡 Create a loan first using: npm run test:complete\n");
        return;
    }

    console.log(`📝 Found ${loanIds.length} loan(s): ${loanIds.join(", ")}\n`);

    // Display loan details
    for (const loanId of loanIds) {
        const loan = await lendingPool.loans(loanId);
        const healthFactor = await lendingPool.getHealthFactor(loanId);
        const interest = await lendingPool.calculateInterest(loanId);

        console.log(`📄 Loan #${loanId}:`);
        console.log(`   Owner: ${loan.borrower}`);
        console.log(`   Collateral: ${ethers.formatEther(loan.collateralAmount)} ETH`);
        console.log(`   Borrowed: ${ethers.formatUnits(loan.borrowAmount, 6)} PYUSD`);
        console.log(`   Accrued Interest: ${ethers.formatUnits(interest, 6)} PYUSD`);
        console.log(`   Total Repayment: ${ethers.formatUnits(loan.borrowAmount + interest, 6)} PYUSD`);
        console.log(`   Short Ratio: ${loan.shortPositionRatio} bps (${Number(loan.shortPositionRatio) / 100}%)`);
        console.log(`   Short Position ID: ${loan.shortPositionId}`);
        console.log(`   Health Factor: ${ethers.formatUnits(healthFactor, 18)}`);
        console.log(`   Is Active: ${loan.isActive ? "✅ Yes" : "❌ No"}`);
        console.log("");
    }

    // Select first active loan for testing
    let testLoanId = null;
    let testLoan = null;

    for (const loanId of loanIds) {
        const loan = await lendingPool.loans(loanId);
        if (loan.isActive) {
            testLoanId = loanId;
            testLoan = loan;
            break;
        }
    }

    if (!testLoanId) {
        console.log("❌ No active loans found");
        console.log("💡 All loans have been repaid or closed\n");
        return;
    }

    console.log(`🎯 Testing repayment with Loan #${testLoanId}\n`);

    // ==================== Calculate Repayment ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Calculate Repayment Amount");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const borrowAmount = testLoan.borrowAmount;
    const interest = await lendingPool.calculateInterest(testLoanId);
    const totalRepayment = borrowAmount + interest;
    const collateral = testLoan.collateralAmount;

    console.log("📊 Repayment Details:");
    console.log(`   Principal: ${ethers.formatUnits(borrowAmount, 6)} PYUSD`);
    console.log(`   Interest: ${ethers.formatUnits(interest, 6)} PYUSD`);
    console.log(`   Total Repayment: ${ethers.formatUnits(totalRepayment, 6)} PYUSD`);
    console.log(`   Collateral to Return: ${ethers.formatEther(collateral)} ETH\n`);

    // Check if user has enough PYUSD
    if (pyusdBalance < totalRepayment) {
        console.log("⚠️  Warning: Insufficient PYUSD for repayment");
        console.log(`   Need: ${ethers.formatUnits(totalRepayment, 6)} PYUSD`);
        console.log(`   Have: ${ethers.formatUnits(pyusdBalance, 6)} PYUSD`);
        console.log(`   Missing: ${ethers.formatUnits(totalRepayment - pyusdBalance, 6)} PYUSD`);
        console.log("   Get PYUSD: https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd\n");
        return;
    }

    // ==================== Full Repayment ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 3️⃣ : Full Repayment & Collateral Return");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Approve PYUSD
    console.log("   Approving PYUSD...");
    const allowance = await pyusd.allowance(userAddress, contracts.EthereumLendingPool);
    if (allowance < totalRepayment) {
        const approveTx = await pyusd.approve(contracts.EthereumLendingPool, totalRepayment);
        await approveTx.wait();
        console.log("   ✅ Approved\n");
    } else {
        console.log("   ✅ Already approved\n");
    }

    // Record balances before
    const ethBefore = await provider.getBalance(userAddress);
    const pyusdBefore = await pyusd.balanceOf(userAddress);

    console.log("📊 Balances Before Repayment:");
    console.log(`   ETH: ${ethers.formatEther(ethBefore)}`);
    console.log(`   PYUSD: ${ethers.formatUnits(pyusdBefore, 6)}\n`);

    // Full repay (closes loan and returns collateral)
    console.log("   Repaying and closing loan...");
    try {
        const repayTx = await lendingPool.repay(testLoanId);
        const receipt = await repayTx.wait();
        console.log("   ✅ Full repayment successful");
        console.log("   TX:", receipt.hash);

        // Check balances after
        const ethAfter = await provider.getBalance(userAddress);
        const pyusdAfter = await pyusd.balanceOf(userAddress);

        console.log("\n📊 Balances After Repayment:");
        console.log(`   ETH: ${ethers.formatEther(ethAfter)}`);
        console.log(`   PYUSD: ${ethers.formatUnits(pyusdAfter, 6)}\n`);

        // Calculate changes
        const ethChange = ethAfter - ethBefore;
        const pyusdChange = pyusdAfter - pyusdBefore;

        console.log("📈 Balance Changes:");
        console.log(`   ETH: ${ethChange > 0 ? "+" : ""}${ethers.formatEther(ethChange)} ETH (collateral returned - gas)`);
        console.log(`   PYUSD: ${ethers.formatUnits(pyusdChange, 6)} PYUSD (repayment + interest)\n`);

        // Expected vs Actual
        const expectedEthGain = collateral;
        const gasUsed = receipt.gasUsed * receipt.gasPrice;
        const expectedNetEthGain = expectedEthGain - gasUsed;

        console.log("💰 Expected vs Actual:");
        console.log(`   Expected Collateral Return: ${ethers.formatEther(expectedEthGain)} ETH`);
        console.log(`   Gas Used: ${ethers.formatEther(gasUsed)} ETH`);
        console.log(`   Expected Net Gain: ${ethers.formatEther(expectedNetEthGain)} ETH`);
        console.log(`   Actual Net Gain: ${ethers.formatEther(ethChange)} ETH`);
        console.log(`   Match: ${Math.abs(Number(ethers.formatEther(ethChange - expectedNetEthGain))) < 0.0001 ? "✅" : "⚠️"}\n`);

        // Verify loan is closed
        const finalLoan = await lendingPool.loans(testLoanId);
        console.log("📄 Final Loan Status:");
        console.log(`   Borrowed Amount: ${ethers.formatUnits(finalLoan.borrowAmount, 6)} PYUSD`);
        console.log(`   Collateral: ${ethers.formatEther(finalLoan.collateralAmount)} ETH`);
        console.log(`   Is Active: ${finalLoan.isActive ? "⚠️ Still Active" : "✅ Closed"}\n`);

        // Check pool stats
        const totalSupply = await lendingPool.getTotalSupply();
        const totalBorrowed = await lendingPool.getTotalBorrowed();
        const utilization = totalBorrowed > 0 && totalSupply > 0
            ? (totalBorrowed * BigInt(10000)) / totalSupply
            : BigInt(0);

        console.log("📊 Pool Stats After Repayment:");
        console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 6)} PYUSD`);
        console.log(`   Total Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} PYUSD`);
        console.log(`   Utilization: ${Number(utilization) / 100} %\n`);

        // Check if loan NFT still exists
        try {
            const owner = await loanNFT.ownerOf(testLoanId);
            console.log("🎫 Loan NFT Status:");
            console.log(`   Still Exists: ✅ Yes`);
            console.log(`   Owner: ${owner}\n`);
        } catch (e) {
            console.log("🎫 Loan NFT Status:");
            console.log(`   Still Exists: ❌ Burned\n`);
        }

    } catch (e) {
        console.log("   ❌ Full repayment failed:", e.message);

        if (e.message.includes("Not loan owner")) {
            console.log("\n💡 Reason: You are not the owner of this loan\n");
        } else if (e.message.includes("Loan not active")) {
            console.log("\n💡 Reason: Loan is already closed\n");
        } else if (e.message.includes("transfer amount exceeds balance")) {
            console.log("\n💡 Reason: Insufficient PYUSD balance (including interest)\n");
        } else {
            console.log("\n💡 Possible reasons:");
            console.log("   - Insufficient PYUSD balance (need principal + interest)");
            console.log("   - Loan already closed");
            console.log("   - Not the loan owner\n");
        }

        return;
    }

    // ==================== Summary ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check all user's remaining loans
    let activeLoanCount = 0;
    let closedLoanCount = 0;

    for (const loanId of loanIds) {
        const loan = await lendingPool.loans(loanId);
        if (loan.isActive) {
            activeLoanCount++;
        } else {
            closedLoanCount++;
        }
    }

    console.log("📊 Final Status:");
    console.log(`   Total Loans: ${loanIds.length}`);
    console.log(`   Active Loans: ${activeLoanCount}`);
    console.log(`   Closed Loans: ${closedLoanCount}\n`);

    if (activeLoanCount > 0) {
        console.log("💡 You still have active loans. Run this script again to repay another loan.\n");
    } else {
        console.log("✅ All loans have been repaid!\n");
    }

    console.log("✅ Repayment test completed\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
