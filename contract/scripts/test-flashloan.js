import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";

/**
 * Test Flash Loan Functionality
 *
 * This script demonstrates:
 * 1. Deploying FlashLoanReceiver test contract
 * 2. Executing a flash loan from EthereumLendingPool
 * 3. Verifying fee distribution to sPYUSD holders
 */
async function main() {
  console.log("🧪 Testing Flash Loan Functionality...\n");

  // Contract addresses (Sepolia) - Updated with Flash Loan Support
  const LENDING_POOL = "0x64DcD6515B56bE5C77f589E97CEb991DF5289649";
  const PYUSD = "0xe3C241B251D9c7E0b334427aF0593A38a3983b2a";
  const SPYUSD = "0xaf103AD805B6A95Ba12194D0Dc4571181b83CFA1";

  // Connect to network
  const connection = await hre.network.connect();
  const provider = new ethers.BrowserProvider(connection.provider);
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log("📍 Signer:", signerAddress);
  console.log("🌐 Network:", connection.name);
  console.log("");

  // Load ABIs
  const lendingPoolArtifact = JSON.parse(
    readFileSync(
      "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
      "utf8"
    )
  );

  const pyusdArtifact = JSON.parse(
    readFileSync(
      "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json",
      "utf8"
    )
  );

  const spyusdArtifact = JSON.parse(
    readFileSync(
      "artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json",
      "utf8"
    )
  );

  const flashReceiverArtifact = JSON.parse(
    readFileSync(
      "artifacts/contracts/test/FlashLoanReceiver.sol/FlashLoanReceiver.json",
      "utf8"
    )
  );

  // Connect to contracts
  const lendingPool = new ethers.Contract(LENDING_POOL, lendingPoolArtifact.abi, signer);
  const pyusd = new ethers.Contract(PYUSD, pyusdArtifact.abi, signer);
  const spyusd = new ethers.Contract(SPYUSD, spyusdArtifact.abi, signer);

  console.log("📊 Initial State:");
  const totalSupplied = await lendingPool.getTotalSupply();
  const totalBorrowed = await lendingPool.getTotalBorrowed();
  const exchangeRateBefore = await spyusd.exchangeRate();
  console.log(`  Total PYUSD Supplied: ${ethers.formatUnits(totalSupplied, 6)} PYUSD`);
  console.log(`  Total PYUSD Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} PYUSD`);
  console.log(`  sPYUSD Exchange Rate: ${ethers.formatUnits(exchangeRateBefore, 18)}`);
  console.log("");

  // Check max flash loan
  const maxLoan = await lendingPool.maxFlashLoan(PYUSD);
  console.log(`💰 Max Flash Loan Available: ${ethers.formatUnits(maxLoan, 6)} PYUSD`);
  console.log("");

  // Deploy FlashLoanReceiver
  console.log("🚀 Deploying FlashLoanReceiver...");
  const FlashLoanReceiver = new ethers.ContractFactory(
    flashReceiverArtifact.abi,
    flashReceiverArtifact.bytecode,
    signer
  );
  const receiver = await FlashLoanReceiver.deploy(LENDING_POOL);
  await receiver.waitForDeployment();
  const receiverAddress = await receiver.getAddress();
  console.log("✅ FlashLoanReceiver deployed at:", receiverAddress);
  console.log("");

  // Fund the receiver with PYUSD for fee payment
  const flashLoanAmount = ethers.parseUnits("1000", 6); // 1000 PYUSD
  const flashLoanFee = await lendingPool.flashFee(PYUSD, flashLoanAmount);
  console.log(`📝 Flash Loan Details:`);
  console.log(`  Loan Amount: ${ethers.formatUnits(flashLoanAmount, 6)} PYUSD`);
  console.log(`  Fee: ${ethers.formatUnits(flashLoanFee, 6)} PYUSD (0.09%)`);
  console.log("");

  // Transfer fee amount to receiver so it can pay back
  console.log("💸 Funding FlashLoanReceiver with fee amount...");
  const tx1 = await pyusd.transfer(receiverAddress, flashLoanFee);
  await tx1.wait();
  console.log("✅ FlashLoanReceiver funded");
  console.log("");

  // Execute flash loan
  console.log("⚡ Executing Flash Loan...");
  const tx2 = await receiver.executeFlashLoan(PYUSD, flashLoanAmount, "0x");
  const receipt = await tx2.wait();
  console.log("✅ Flash Loan executed!");
  console.log("   TX:", receipt.hash);
  console.log("");

  // Check results
  console.log("📊 Post-Flash Loan State:");
  const totalSuppliedAfter = await lendingPool.getTotalSupply();
  const exchangeRateAfter = await spyusd.exchangeRate();
  const lastLoanAmount = await receiver.lastLoanAmount();
  const lastFeeAmount = await receiver.lastFeeAmount();

  console.log(`  Flash Loan Amount: ${ethers.formatUnits(lastLoanAmount, 6)} PYUSD`);
  console.log(`  Flash Loan Fee: ${ethers.formatUnits(lastFeeAmount, 6)} PYUSD`);
  console.log(`  Total PYUSD Supplied (After): ${ethers.formatUnits(totalSuppliedAfter, 6)} PYUSD`);
  console.log(`  sPYUSD Exchange Rate (After): ${ethers.formatUnits(exchangeRateAfter, 18)}`);
  console.log("");

  // Calculate exchange rate increase
  const rateIncrease = exchangeRateAfter - exchangeRateBefore;
  const rateIncreasePercent = (Number(rateIncrease) * 100) / Number(exchangeRateBefore);
  console.log("📈 Impact on sPYUSD Holders:");
  console.log(`  Exchange Rate Increase: ${ethers.formatUnits(rateIncrease, 18)}`);
  console.log(`  Percentage Increase: ${rateIncreasePercent.toFixed(6)}%`);
  console.log("");

  // Verify fee was added to supply
  const supplyIncrease = totalSuppliedAfter - totalSupplied;
  console.log("✅ Verification:");
  console.log(`  Fee Collected: ${ethers.formatUnits(flashLoanFee, 6)} PYUSD`);
  console.log(`  Supply Increase: ${ethers.formatUnits(supplyIncrease, 6)} PYUSD`);
  console.log(`  Match: ${supplyIncrease === flashLoanFee ? "✅ YES" : "❌ NO"}`);
  console.log("");

  console.log("🎉 Flash Loan Test Complete!");
  console.log("");
  console.log("💡 Summary:");
  console.log("   - Flash loan executed successfully");
  console.log("   - Fee distributed to all sPYUSD holders via exchange rate increase");
  console.log("   - sPYUSD holders earn passive income from flash loan fees!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
