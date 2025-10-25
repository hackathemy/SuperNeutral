import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";

/**
 * Update Mock Oracle Price Timestamps
 */
async function main() {
  console.log("🔄 Updating Oracle Price Timestamps...\n");

  const MOCK_ORACLE_ADDRESS = "0x6BaC2D31e74c08cb75117b027c390DeCEDdF6e18";

  // Connect to network
  const connection = await hre.network.connect();
  const provider = new ethers.BrowserProvider(connection.provider);
  const signer = await provider.getSigner();

  console.log("Signer:", await signer.getAddress());
  console.log("Network:", connection.name);

  // Load Oracle ABI
  const oracleArtifact = JSON.parse(
    readFileSync(
      "artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json",
      "utf8"
    )
  );

  // Create contract instance
  const oracle = new ethers.Contract(
    MOCK_ORACLE_ADDRESS,
    oracleArtifact.abi,
    signer
  );

  console.log("\n📊 Checking current prices...");

  try {
    const ETH_USD_FEED = "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6";
    const PYUSD_USD_FEED = "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722";

    // Get ETH price
    try {
      const ethPrice = await oracle.getPriceUnsafe(ETH_USD_FEED);
      const ethAge = Math.floor(Date.now() / 1000) - Number(ethPrice.publishTime);
      console.log(`  ETH/USD: Price=${ethPrice.price.toString()}, Age=${ethAge}s (${Math.floor(ethAge / 60)} min)`);
      console.log(`    Status: ${ethAge > 300 ? "❌ TOO OLD (>5min)" : "✅ FRESH"}`);
    } catch (e) {
      console.log("  ETH/USD: ❌ Error reading price");
    }

    // Get PYUSD price
    try {
      const pyusdPrice = await oracle.getPriceUnsafe(PYUSD_USD_FEED);
      const pyusdAge = Math.floor(Date.now() / 1000) - Number(pyusdPrice.publishTime);
      console.log(`  PYUSD/USD: Price=${pyusdPrice.price.toString()}, Age=${pyusdAge}s (${Math.floor(pyusdAge / 60)} min)`);
      console.log(`    Status: ${pyusdAge > 300 ? "❌ TOO OLD (>5min)" : "✅ FRESH"}`);
    } catch (e) {
      console.log("  PYUSD/USD: ❌ Error reading price");
    }
  } catch (e) {
    console.log("  ⚠️ Could not read current prices");
  }

  console.log("\n🔄 Calling updatePriceFeeds()...");

  try {
    // Call updatePriceFeeds with empty array
    const tx = await oracle.updatePriceFeeds([], {
      gasLimit: 100000,
    });

    console.log("✅ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());

    // Wait a bit for state to update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("\n📊 Updated prices:");

    // Get updated ETH price
    try {
      const ethPrice = await oracle.getPriceUnsafe(
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
      );
      const ethAge = Math.floor(Date.now() / 1000) - Number(ethPrice.publishTime);
      console.log(`  ETH/USD: Price=${ethPrice.price.toString()}, Age=${ethAge}s`);
      console.log(`    Status: ${ethAge > 300 ? "❌ STILL OLD" : "✅ UPDATED!"}`);
    } catch (e) {
      console.log("  ETH/USD: ❌ Error reading updated price");
    }

    // Get updated PYUSD price
    try {
      const pyusdPrice = await oracle.getPriceUnsafe(
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722"
      );
      const pyusdAge = Math.floor(Date.now() / 1000) - Number(pyusdPrice.publishTime);
      console.log(`  PYUSD/USD: Price=${pyusdPrice.price.toString()}, Age=${pyusdAge}s`);
      console.log(`    Status: ${pyusdAge > 300 ? "❌ STILL OLD" : "✅ UPDATED!"}`);
    } catch (e) {
      console.log("  PYUSD/USD: ❌ Error reading updated price");
    }

    console.log("\n✨ Oracle prices updated successfully!");
    console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
  } catch (error) {
    console.error("\n❌ Error updating prices:");
    console.error(error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
