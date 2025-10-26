import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Debug Repay Function Step-by-Step
 * Isolate exactly where the error 0x13be252b occurs
 */

async function main() {
    console.log("\n🔍 Debugging Repay Step-by-Step...\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Load ABIs
    const lendingPoolAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json", "utf8")
    ).abi;
    const pyusdAbi = [
        "function balanceOf(address) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)"
    ];

    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, signer);
    const pyusd = new ethers.Contract(contracts.PYUSD, pyusdAbi, signer);

    console.log("📋 Addresses:");
    console.log("   User:", userAddress);
    console.log("   Lending Pool:", contracts.EthereumLendingPool);
    console.log("");

    // ==================== Step 1: Get Loan Info ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Get Loan Information");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const loan = await lendingPool.loans(1);
        console.log("✅ Loan Retrieved:");
        console.log("   Borrower:", loan.borrower);
        console.log("   Collateral:", ethers.formatEther(loan.collateralAmount), "ETH");
        console.log("   Borrowed:", ethers.formatUnits(loan.borrowAmount, 6), "PYUSD");
        console.log("   Is Active:", loan.isActive ? "Yes" : "No");
        console.log("");

        if (!loan.isActive) {
            console.log("❌ Loan is not active!");
            return;
        }

        if (loan.borrower.toLowerCase() !== userAddress.toLowerCase()) {
            console.log("❌ You are not the borrower!");
            return;
        }
    } catch (e) {
        console.log("❌ Failed to get loan info:", e.message);
        return;
    }

    // ==================== Step 2: Calculate Repayment ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Calculate Repayment Amount");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    let principal, interest, total;
    try {
        const loan = await lendingPool.loans(1);
        principal = loan.borrowAmount;
        interest = await lendingPool.calculateInterest(1);
        total = principal + interest;

        console.log("✅ Repayment Calculated:");
        console.log("   Principal:", ethers.formatUnits(principal, 6), "PYUSD");
        console.log("   Interest:", ethers.formatUnits(interest, 6), "PYUSD");
        console.log("   Total:", ethers.formatUnits(total, 6), "PYUSD");
        console.log("");
    } catch (e) {
        console.log("❌ Failed to calculate repayment:", e.message);
        return;
    }

    // ==================== Step 3: Check PYUSD Balance ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 3️⃣ : Check PYUSD Balance");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const balance = await pyusd.balanceOf(userAddress);
        console.log("✅ PYUSD Balance:", ethers.formatUnits(balance, 6), "PYUSD");
        console.log("   Required:", ethers.formatUnits(total, 6), "PYUSD");
        console.log("   Sufficient:", balance >= total ? "✅ Yes" : "❌ No");
        console.log("");

        if (balance < total) {
            console.log("❌ Insufficient PYUSD balance!");
            return;
        }
    } catch (e) {
        console.log("❌ Failed to check balance:", e.message);
        return;
    }

    // ==================== Step 4: Approve PYUSD ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 4️⃣ : Approve PYUSD");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        // Check current allowance
        const currentAllowance = await pyusd.allowance(userAddress, contracts.EthereumLendingPool);
        console.log("   Current allowance:", ethers.formatUnits(currentAllowance, 6), "PYUSD");

        if (currentAllowance < total) {
            console.log("   Approving", ethers.formatUnits(total, 6), "PYUSD...");
            const approveTx = await pyusd.approve(contracts.EthereumLendingPool, total);
            await approveTx.wait();
            console.log("   ✅ Approved");
        } else {
            console.log("   ✅ Already approved");
        }
        console.log("");
    } catch (e) {
        console.log("❌ Failed to approve:", e.message);
        return;
    }

    // ==================== Step 5: Try Static Call First ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 5️⃣ : Test Repay with Static Call");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        console.log("   Testing repay() with staticCall...");
        await lendingPool.repay.staticCall(1);
        console.log("   ✅ Static call succeeded - repay should work!");
        console.log("");
    } catch (e) {
        console.log("   ❌ Static call failed:");
        console.log("   Error:", e.message);

        if (e.data) {
            console.log("   Error Data:", e.data);
            console.log("");

            // Try to decode the error
            console.log("   🔍 Error Analysis:");
            console.log("   Error Code: 0x13be252b");
            console.log("");
            console.log("   💡 Possible Sources:");
            console.log("   1. Aave V3 Pool.withdraw() - CALLER_NOT_ATOKEN");
            console.log("   2. WETH.withdraw() - Unauthorized");
            console.log("   3. ReentrancyGuard - Already entered");
            console.log("   4. Custom contract logic");
            console.log("");
        }

        console.log("   ⚠️  Will still try actual transaction for more details...");
        console.log("");
    }

    // ==================== Step 6: Actual Repay ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 6️⃣ : Attempt Actual Repay");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const ethBefore = await provider.getBalance(userAddress);
        console.log("   ETH before:", ethers.formatEther(ethBefore), "ETH");
        console.log("   Calling repay()...\n");

        const tx = await lendingPool.repay(1);
        console.log("   ⏳ Transaction sent:", tx.hash);
        console.log("   Waiting for confirmation...\n");

        const receipt = await tx.wait();
        console.log("   ✅ Transaction confirmed!");
        console.log("   Block:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());
        console.log("");

        const ethAfter = await provider.getBalance(userAddress);
        const ethReceived = ethAfter - ethBefore;
        console.log("   ETH after:", ethers.formatEther(ethAfter), "ETH");
        console.log("   ETH received:", ethers.formatEther(ethReceived), "ETH");
        console.log("");

        // Verify loan is closed
        const loan = await lendingPool.loans(1);
        console.log("   Loan status after repay:");
        console.log("   Is Active:", loan.isActive ? "❌ Still active" : "✅ Closed");
        console.log("");

        console.log("✅ Repayment completed successfully!\n");
    } catch (e) {
        console.log("   ❌ Repay failed:");
        console.log("   Error:", e.message);

        if (e.data) {
            console.log("   Error Data:", e.data);
        }

        if (e.error && e.error.data) {
            console.log("   Inner Error Data:", e.error.data);
        }

        // Try to get transaction details if available
        if (e.transaction) {
            console.log("\n   📋 Transaction Details:");
            console.log("   To:", e.transaction.to);
            console.log("   Data:", e.transaction.data.substring(0, 66), "...");
        }

        console.log("\n   🔍 Debugging Recommendations:");
        console.log("   1. Check Sepolia Etherscan for failed transaction");
        console.log("   2. Verify VaultRouter → AaveV3Vault authorization");
        console.log("   3. Check if Aave V3 Pool allows withdrawals");
        console.log("   4. Verify WETH contract interactions");
        console.log("");

        return;
    }

    console.log("✅ Debug complete\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
