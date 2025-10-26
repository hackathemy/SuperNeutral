import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";

/**
 * Update REAL Pyth Oracle Prices
 *
 * This script fetches the latest price updates from Pyth's Hermes service
 * and submits them to the Pyth oracle contract.
 */
async function main() {
  console.log("🔄 Updating REAL Pyth Oracle Prices...\n");

  // Price feed IDs (same for mainnet and testnet)
  const ETH_USD_FEED = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
  const PYUSD_USD_FEED = "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722";

  // Connect to network
  const connection = await hre.network.connect();
  const provider = new ethers.BrowserProvider(connection.provider);
  const signer = await provider.getSigner();

  console.log("Signer:", await signer.getAddress());
  console.log("Network:", connection.name);
  console.log("");

  // Get your deployed lending pool address
  console.log("⚠️  Please enter your EthereumLendingPool address:");
  console.log("   You can find it in your deployment logs");
  console.log("");

  // For now, use a placeholder - replace with actual address
  const LENDING_POOL_ADDRESS = "YOUR_LENDING_POOL_ADDRESS_HERE";

  if (LENDING_POOL_ADDRESS === "YOUR_LENDING_POOL_ADDRESS_HERE") {
    console.error("❌ Please update LENDING_POOL_ADDRESS in the script");
    console.log("");
    console.log("📝 Steps to use this script:");
    console.log("1. Deploy contracts to Arbitrum Sepolia: npm run deploy:arbitrum");
    console.log("2. Copy the EthereumLendingPool address from deployment logs");
    console.log("3. Update LENDING_POOL_ADDRESS in this script");
    console.log("4. Run: npm run oracle:update:pyth");
    return;
  }

  // Load contract
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

  console.log("📊 Fetching latest prices from Pyth Hermes...");
  console.log("");

  try {
    // Fetch price updates from Pyth Hermes service
    const priceIds = [ETH_USD_FEED, PYUSD_USD_FEED];
    const hermesUrl = `https://hermes.pyth.network/api/latest_vaas?ids[]=${priceIds[0]}&ids[]=${priceIds[1]}`;

    console.log("🌐 Fetching from:", hermesUrl);

    const response = await fetch(hermesUrl);
    const data = await response.json();

    if (!data || !data.length) {
      throw new Error("No price data received from Hermes");
    }

    console.log("✅ Received", data.length, "price updates");
    console.log("");

    // Convert price update data to bytes format
    const priceUpdateData = data.map((vaa) => "0x" + Buffer.from(vaa, "base64").toString("hex"));

    console.log("🔄 Submitting price updates to Pyth oracle...");
    console.log("   Note: This requires a small fee to pay for gas");

    // Get update fee
    const pythOracle = await lendingPool.pythOracle();
    const pythArtifact = JSON.parse(
      readFileSync(
        "node_modules/@pythnetwork/pyth-sdk-solidity/abis/IPyth.json",
        "utf8"
      )
    );

    const pythContract = new ethers.Contract(pythOracle, pythArtifact, signer);
    const updateFee = await pythContract.getUpdateFee(priceUpdateData);

    console.log("   Update Fee:", ethers.formatEther(updateFee), "ETH");

    // Update prices through lending pool
    const tx = await lendingPool.updatePrices(priceUpdateData, {
      value: updateFee,
      gasLimit: 500000,
    });

    console.log("✅ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("");

    // Verify updated prices
    console.log("📊 Verifying updated prices:");

    const ethPrice = await lendingPool.getETHPrice();
    console.log(`  ETH/USD: $${ethers.formatUnits(ethPrice, 8)}`);

    console.log("");
    console.log("✨ Prices updated successfully!");
    console.log("🔗 Explorer:", `https://sepolia.arbiscan.io/tx/${tx.hash}`);

  } catch (error) {
    console.error("\n❌ Error updating prices:");

    if (error.message.includes("Price too old")) {
      console.error("   The fetched prices are too old (>5 minutes)");
      console.error("   This is normal - just run the script again");
    } else if (error.message.includes("insufficient funds")) {
      console.error("   Insufficient ETH for update fee");
      console.error("   Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia");
    } else {
      console.error("   ", error.message);
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
