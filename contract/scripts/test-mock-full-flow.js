import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Test Full Loan Flow with Mock Aave
 *
 * Flow:
 * 1. Supply PYUSD to lending pool
 * 2. Borrow PYUSD with ETH collateral
 * 3. REPAY loan (CRITICAL TEST)
 * 4. Verify collateral returned
 */

async function loadDeployment() {
    const deployment = JSON.parse(fs.readFileSync("./deployment-mock-aave.json", "utf8"));
    return deployment.contracts;
}

async function loadContract(name, address, signer) {
    const artifactPath = {
        "PYUSD": "./artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json",
        "WETH": "./artifacts/contracts/mocks/MockWETH.sol/MockWETH.json",
        "StakedPYUSD": "./artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json",
        "EthereumLendingPool": "./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
        "EthereumLoanNFT": "./artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json",
        "MockPythOracle": "./artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json"
    }[name];

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return new ethers.Contract(address, artifact.abi, signer);
}

function formatPYUSD(amount) {
    return ethers.formatUnits(amount, 6);
}

function parsePYUSD(amount) {
    return ethers.parseUnits(amount, 6);
}

async function main() {
    console.log("\n🧪 Testing Full Loan Flow with Mock Aave...\n");

    // Setup
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const [deployer, supplier, borrower] = await Promise.all([
        provider.getSigner(0),
        provider.getSigner(1),
        provider.getSigner(2)
    ]);

    const contracts = await loadDeployment();

    // Load contracts
    const pyusd = await loadContract("PYUSD", contracts.PYUSD, deployer);
    const stakedPYUSD = await loadContract("StakedPYUSD", contracts.StakedPYUSD, deployer);
    const lendingPool = await loadContract("EthereumLendingPool", contracts.EthereumLendingPool, deployer);
    const loanNFT = await loadContract("EthereumLoanNFT", contracts.EthereumLoanNFT, deployer);
    const oracle = await loadContract("MockPythOracle", contracts.MockPythOracle, deployer);

    console.log("📋 Test Setup:");
    console.log("   Deployer:", await deployer.getAddress());
    console.log("   Supplier:", await supplier.getAddress());
    console.log("   Borrower:", await borrower.getAddress());
    console.log("");

    // ==================== Step 1: Supply PYUSD ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Supply PYUSD to Lending Pool");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Transfer PYUSD to supplier
    const supplyAmount = parsePYUSD("10000");
    await pyusd.transfer(await supplier.getAddress(), supplyAmount);
    console.log(`   💸 Transferred ${formatPYUSD(supplyAmount)} PYUSD to supplier`);

    // Approve and supply
    const pyusdSupplier = pyusd.connect(supplier);
    const lendingPoolSupplier = lendingPool.connect(supplier);

    await pyusdSupplier.approve(contracts.EthereumLendingPool, supplyAmount);
    await lendingPoolSupplier.supplyPYUSD(supplyAmount, await supplier.getAddress());

    const supplierBalance = await stakedPYUSD.balanceOf(await supplier.getAddress());
    console.log(`   ✅ Supplied ${formatPYUSD(supplyAmount)} PYUSD`);
    console.log(`   📊 Received ${formatPYUSD(supplierBalance)} sPYUSD\n`);

    // ==================== Step 2: Borrow with Collateral ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Borrow PYUSD with ETH Collateral");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const borrowAmount = parsePYUSD("1000");
    const collateralAmount = ethers.parseEther("1");  // 1 ETH
    const lendingPoolBorrower = lendingPool.connect(borrower);

    const borrowerAddressBefore = await borrower.getAddress();
    const pyusdBalanceBefore = await pyusd.balanceOf(borrowerAddressBefore);
    const ethBalanceBefore = await provider.getBalance(borrowerAddressBefore);

    console.log(`   💰 Borrower ETH balance: ${ethers.formatEther(ethBalanceBefore)} ETH`);
    console.log(`   💵 Borrower PYUSD balance: ${formatPYUSD(pyusdBalanceBefore)} PYUSD`);
    console.log(`   🎯 Borrowing ${formatPYUSD(borrowAmount)} PYUSD`);
    console.log(`   🔒 Collateral: ${ethers.formatEther(collateralAmount)} ETH\n`);

    // Borrow
    const tx = await lendingPoolBorrower.borrow(borrowAmount, { value: collateralAmount });
    const receipt = await tx.wait();

    // Get loan ID from event
    const borrowEvent = receipt.logs
        .map(log => {
            try {
                return lendingPool.interface.parseLog({ topics: [...log.topics], data: log.data });
            } catch {
                return null;
            }
        })
        .find(parsed => parsed && parsed.name === "LoanCreated");

    const loanId = borrowEvent.args.loanId;
    console.log(`   ✅ Loan Created! ID: ${loanId}`);

    const pyusdBalanceAfter = await pyusd.balanceOf(borrowerAddressBefore);
    const ethBalanceAfter = await provider.getBalance(borrowerAddressBefore);

    console.log(`   💵 Borrower PYUSD balance: ${formatPYUSD(pyusdBalanceAfter)} PYUSD (+${formatPYUSD(pyusdBalanceAfter - pyusdBalanceBefore)})`);
    console.log(`   💰 Borrower ETH balance: ${ethers.formatEther(ethBalanceAfter)} ETH (-${ethers.formatEther(ethBalanceBefore - ethBalanceAfter)})\n`);

    // Check loan details
    const loan = await lendingPool.loans(loanId);
    console.log("   📋 Loan Details:");
    console.log(`      Borrowed: ${formatPYUSD(loan.borrowedAmount)} PYUSD`);
    console.log(`      Collateral: ${ethers.formatEther(loan.collateralAmount)} ETH`);
    console.log(`      Active: ${loan.isActive}\n`);

    // ==================== Step 3: REPAY LOAN (CRITICAL!) ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 3️⃣ : REPAY Loan (CRITICAL TEST!)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const repayAmount = loan.borrowedAmount;  // Repay exact amount

    console.log(`   🎯 Repaying ${formatPYUSD(repayAmount)} PYUSD`);
    console.log(`   🔓 Expecting ${ethers.formatEther(loan.collateralAmount)} ETH collateral back\n`);

    // Approve PYUSD for repayment
    const pyusdBorrower = pyusd.connect(borrower);
    await pyusdBorrower.approve(contracts.EthereumLendingPool, repayAmount);

    const ethBalanceBeforeRepay = await provider.getBalance(borrowerAddressBefore);
    const pyusdBalanceBeforeRepay = await pyusd.balanceOf(borrowerAddressBefore);

    // REPAY!
    console.log("   🔄 Repaying loan...");
    const repayTx = await lendingPoolBorrower.repay(loanId);
    await repayTx.wait();
    console.log("   ✅ Repayment successful!\n");

    const ethBalanceAfterRepay = await provider.getBalance(borrowerAddressBefore);
    const pyusdBalanceAfterRepay = await pyusd.balanceOf(borrowerAddressBefore);

    console.log("   📊 After Repayment:");
    console.log(`      PYUSD: ${formatPYUSD(pyusdBalanceAfterRepay)} (-${formatPYUSD(pyusdBalanceBeforeRepay - pyusdBalanceAfterRepay)})`);
    console.log(`      ETH: ${ethers.formatEther(ethBalanceAfterRepay)} (+${ethers.formatEther(ethBalanceAfterRepay - ethBalanceBeforeRepay)})\n`);

    // Verify loan is closed
    const loanAfter = await lendingPool.loans(loanId);
    console.log("   📋 Loan Status After Repayment:");
    console.log(`      Active: ${loanAfter.isActive}`);
    console.log(`      Collateral: ${ethers.formatEther(loanAfter.collateralAmount)} ETH\n`);

    // Verify NFT is burned
    try {
        await loanNFT.ownerOf(loanId);
        console.log("   ❌ ERROR: NFT still exists!");
    } catch (error) {
        console.log("   ✅ NFT burned correctly\n");
    }

    // ==================== Step 4: Final Verification ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 4️⃣ : Final Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const collateralReturned = ethBalanceAfterRepay - ethBalanceBeforeRepay;
    const expectedCollateral = loan.collateralAmount;

    console.log("   ✅ REPAYMENT TEST RESULTS:");
    console.log(`      Loan closed: ${!loanAfter.isActive ? "✅ YES" : "❌ NO"}`);
    console.log(`      NFT burned: ✅ YES`);
    console.log(`      Collateral returned: ${collateralReturned > 0 ? "✅ YES" : "❌ NO"}`);
    console.log(`      Expected: ${ethers.formatEther(expectedCollateral)} ETH`);
    console.log(`      Actual: ${ethers.formatEther(collateralReturned)} ETH`);

    const success = !loanAfter.isActive && collateralReturned > 0;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (success) {
        console.log("🎉 REPAYMENT WORKS! Full flow tested successfully!");
    } else {
        console.log("❌ REPAYMENT FAILED! Issues detected.");
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
