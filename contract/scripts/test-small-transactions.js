import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";

/**
 * Test Real Protocol with Small Transactions
 */
async function main() {
  console.log("🧪 Testing Protocol with Real PYUSD & Pyth Oracle...\n");

  const LENDING_POOL = "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A";
  const OFFICIAL_PYUSD = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  const STAKED_PYUSD = "0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699";
  const PYTH_ORACLE = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21";

  // Connect to network
  const connection = await hre.network.connect();
  const provider = new ethers.BrowserProvider(connection.provider);
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log("💼 Account:", signerAddress);
  console.log("🌐 Network:", connection.name);

  const ethBalance = await provider.getBalance(signerAddress);
  console.log("💰 ETH Balance:", ethers.formatEther(ethBalance), "ETH");
  console.log("");

  // Load contracts
  const poolArtifact = JSON.parse(
    readFileSync("artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json", "utf8")
  );
  const spyusdArtifact = JSON.parse(
    readFileSync("artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json", "utf8")
  );

  // ERC20 ABI for PYUSD
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const pyusd = new ethers.Contract(OFFICIAL_PYUSD, erc20Abi, signer);
  const lendingPool = new ethers.Contract(LENDING_POOL, poolArtifact.abi, signer);
  const spyusd = new ethers.Contract(STAKED_PYUSD, spyusdArtifact.abi, signer);

  // Check PYUSD balance
  const pyusdBalance = await pyusd.balanceOf(signerAddress);
  console.log("💵 PYUSD Balance:", ethers.formatUnits(pyusdBalance, 6), "PYUSD");

  if (pyusdBalance === 0n) {
    console.log("");
    console.log("⚠️  No PYUSD found! Get testnet PYUSD from:");
    console.log("   https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd");
    console.log("");
    console.log("✋ Please get PYUSD first, then run this script again.");
    return;
  }

  console.log("");

  // Check pool state
  const totalSupplied = await lendingPool.totalPYUSDSupplied();
  const totalBorrowed = await lendingPool.totalPYUSDBorrowed();
  const spyusdBalance = await spyusd.balanceOf(signerAddress);
  const exchangeRate = await spyusd.exchangeRate();

  console.log("📊 Pool State:");
  console.log("   Total Supplied:", ethers.formatUnits(totalSupplied, 6), "PYUSD");
  console.log("   Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD");
  console.log("   Your sPYUSD:", ethers.formatUnits(spyusdBalance, 18));
  console.log("   Exchange Rate:", ethers.formatUnits(exchangeRate, 18));
  console.log("");

  // Test 1: Supply small amount (10 PYUSD)
  const supplyAmount = ethers.parseUnits("10", 6); // 10 PYUSD

  if (pyusdBalance >= supplyAmount) {
    console.log("🔵 Test 1: Supply 10 PYUSD");
    console.log("   Approving PYUSD...");

    const approveTx = await pyusd.approve(LENDING_POOL, supplyAmount);
    await approveTx.wait();
    console.log("   ✅ Approved");

    console.log("   Supplying to pool...");
    const supplyTx = await lendingPool.supplyPYUSD(supplyAmount, ethers.ZeroAddress);
    const supplyReceipt = await supplyTx.wait();
    console.log("   ✅ Supplied! TX:", supplyReceipt.hash);

    const newSpyusdBalance = await spyusd.balanceOf(signerAddress);
    console.log("   📈 sPYUSD received:", ethers.formatUnits(newSpyusdBalance - spyusdBalance, 18));
    console.log("");
  } else {
    console.log("⚠️  Not enough PYUSD for supply test (need 10 PYUSD)");
    console.log("");
  }

  // Test 2: Small borrow (0.01 ETH collateral, borrow ~5 PYUSD)
  console.log("🔵 Test 2: Borrow with 0.01 ETH collateral");

  try {
    // Get ETH price (18 decimals)
    const ethPrice = await lendingPool.getETHPrice();
    console.log("   ETH Price:", ethers.formatUnits(ethPrice, 18), "USD");

    const collateralAmount = ethers.parseEther("0.01"); // 0.01 ETH (18 decimals)
    const collateralValueUSD = (collateralAmount * ethPrice) / ethers.parseUnits("1", 18); // USD value (18 decimals)
    const borrowAmountUSD = (collateralValueUSD * 5000n) / 10000n; // 50% LTV (18 decimals)
    const borrowAmount = borrowAmountUSD / ethers.parseUnits("1", 12); // Convert to PYUSD (6 decimals)

    console.log("   Collateral: 0.01 ETH");
    console.log("   Borrow Amount:", ethers.formatUnits(borrowAmount, 6), "PYUSD");
    console.log("   Liquidation Ratio: 60%");

    const borrowTx = await lendingPool.borrow(
      borrowAmount,
      6000, // 60% liquidation ratio
      0,    // 0% short position ratio
      ethers.ZeroAddress, // onBehalfOf (msg.sender)
      { value: collateralAmount }
    );
    const borrowReceipt = await borrowTx.wait();
    console.log("   ✅ Borrowed! TX:", borrowReceipt.hash);

    // Get loan NFT ID from events
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
      const tokenId = parsed.args.tokenId;
      console.log("   🎫 Loan NFT ID:", tokenId.toString());

      // Check loan details
      const loan = await lendingPool.loans(tokenId);
      console.log("   📋 Loan Details:");
      console.log("      Collateral:", ethers.formatEther(loan.collateral), "ETH");
      console.log("      Debt:", ethers.formatUnits(loan.debt, 6), "PYUSD");
    }
    console.log("");
  } catch (error) {
    console.log("   ❌ Borrow failed:", error.message);
    if (error.message.includes("Price too old")) {
      console.log("   💡 Pyth price is stale. Need to update prices via Hermes API");
    }
    console.log("");
  }

  // Test 3: Flash loan with tiny amount (5 PYUSD)
  const availableLiquidity = totalSupplied - totalBorrowed;
  const flashLoanAmount = ethers.parseUnits("5", 6); // 5 PYUSD

  if (availableLiquidity >= flashLoanAmount) {
    console.log("🔵 Test 3: Flash Loan (5 PYUSD)");

    // Deploy flash loan receiver
    const receiverArtifact = JSON.parse(
      readFileSync("artifacts/contracts/test/FlashLoanReceiver.sol/FlashLoanReceiver.json", "utf8")
    );
    const receiverFactory = new ethers.ContractFactory(receiverArtifact.abi, receiverArtifact.bytecode, signer);

    console.log("   Deploying FlashLoanReceiver...");
    const receiver = await receiverFactory.deploy(LENDING_POOL, OFFICIAL_PYUSD);
    await receiver.waitForDeployment();
    const receiverAddress = await receiver.getAddress();
    console.log("   ✅ Receiver deployed:", receiverAddress);

    const flashFee = await lendingPool.flashFee(OFFICIAL_PYUSD, flashLoanAmount);
    console.log("   Flash Loan Fee:", ethers.formatUnits(flashFee, 6), "PYUSD");

    // Fund receiver with fee
    const fundTx = await pyusd.transfer(receiverAddress, flashFee);
    await fundTx.wait();
    console.log("   ✅ Receiver funded with fee");

    const oldExchangeRate = await spyusd.exchangeRate();

    console.log("   Executing flash loan...");
    const flashTx = await receiver.executeFlashLoan(flashLoanAmount);
    const flashReceipt = await flashTx.wait();
    console.log("   ✅ Flash loan executed! TX:", flashReceipt.hash);

    const newExchangeRate = await spyusd.exchangeRate();
    const rateIncrease = newExchangeRate - oldExchangeRate;
    console.log("   📈 sPYUSD rate increased by:", ethers.formatUnits(rateIncrease, 18));
    console.log("");
  } else {
    console.log("⚠️  Not enough liquidity for flash loan test");
    console.log("");
  }

  console.log("✨ All tests completed!");
  console.log("");
  console.log("🔗 View on Explorer:");
  console.log("   Pool:", `https://sepolia.etherscan.io/address/${LENDING_POOL}`);
  console.log("   Your address:", `https://sepolia.etherscan.io/address/${signerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
