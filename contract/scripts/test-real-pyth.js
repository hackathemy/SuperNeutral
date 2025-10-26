import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";

/**
 * Test REAL Pyth Oracle on Sepolia
 */
async function main() {
  console.log("🧪 Testing REAL Pyth Oracle on Sepolia...\n");

  const LENDING_POOL_ADDRESS = "0x04b2cd383224725AFCc774a31Fff6056cbA1a6c9";
  const PYTH_ORACLE_ADDRESS = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21";

  // Connect to network
  const connection = await hre.network.connect();
  const provider = new ethers.BrowserProvider(connection.provider);
  const signer = await provider.getSigner();

  console.log("💼 Account:", await signer.getAddress());
  console.log("🌐 Network:", connection.name);
  console.log("");

  // Load contracts
  const lendingPoolArtifact = JSON.parse(
    readFileSync(
      "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
      "utf8"
    )
  );

  const lendingPool = new ethers.Contract(
    LENDING_POOL_ADDRESS,
    lendingPoolArtifact.abi,
    signer
  );

  console.log("📊 Reading prices from REAL Pyth Oracle...\n");

  try {
    // Get ETH price from Pyth Oracle
    const ethPrice = await lendingPool.getETHPrice();
    console.log("✅ ETH/USD Price:", ethers.formatUnits(ethPrice, 8), "USD");
    console.log("   (from Pyth Oracle:", PYTH_ORACLE_ADDRESS + ")");
    console.log("");

    // Get pool state
    const totalSupplied = await lendingPool.totalPYUSDSupplied();
    const totalBorrowed = await lendingPool.totalPYUSDBorrowed();
    const availableLiquidity = totalSupplied - totalBorrowed;

    console.log("💰 Pool State:");
    console.log("   Total Supplied:", ethers.formatUnits(totalSupplied, 6), "PYUSD");
    console.log("   Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD");
    console.log("   Available Liquidity:", ethers.formatUnits(availableLiquidity, 6), "PYUSD");
    console.log("");

    // Calculate collateral value
    const collateralAmount = ethers.parseEther("1"); // 1 ETH
    const collateralValue = (collateralAmount * ethPrice) / ethers.parseUnits("1", 8);
    const borrowableAmount = (collateralValue * 6000n) / 10000n; // 60% LTV

    console.log("📈 Borrowing Power (with 1 ETH collateral):");
    console.log("   Collateral Value:", ethers.formatUnits(collateralValue, 18), "USD");
    console.log("   Max Borrowable (60% LTV):", ethers.formatUnits(borrowableAmount, 18), "PYUSD");
    console.log("");

    console.log("✨ REAL Pyth Oracle Test Complete!");
    console.log("");
    console.log("🎉 All systems operational with real market prices!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
