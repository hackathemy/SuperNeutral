import hre from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";

/**
 * Update REAL Pyth Oracle Prices on Sepolia
 *
 * This script fetches the latest price updates from Pyth's Hermes service
 * and submits them to the REAL Pyth oracle contract on Sepolia.
 */
async function main() {
  console.log("🔄 Updating REAL Pyth Oracle Prices on Sepolia...\\n");

  // Price feed IDs (without 0x prefix for Hermes API)
  const ETH_USD_FEED = "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6";
  const PYUSD_USD_FEED = "41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722";

  // Your deployed lending pool address
  const LENDING_POOL_ADDRESS = "0x04b2cd383224725AFCc774a31Fff6056cbA1a6c9";

  // Connect to network
  const connection = await hre.network.connect();
  const provider = new ethers.BrowserProvider(connection.provider);
  const signer = await provider.getSigner();

  console.log("Signer:", await signer.getAddress());
  console.log("Network:", connection.name);
  console.log("");

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
    // Use proper query format for Hermes API
    const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceIds[0]}&ids[]=${priceIds[1]}`;

    console.log("🌐 Fetching from:", hermesUrl);
    console.log("");

    const response = await fetch(hermesUrl);
    const data = await response.json();

    if (!data || !data.binary || !data.binary.data) {
      throw new Error("No price data received from Hermes");
    }

    console.log("✅ Received price update data");
    console.log("");

    // The data is in data.binary.data array
    const priceUpdateData = data.binary.data.map((hex) => "0x" + hex);

    console.log("🔄 Submitting price updates to Pyth oracle...");
    console.log("   Note: This requires a small fee to pay for gas");
    console.log("");

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
    console.log("");

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
    console.log("✨ Prices updated successfully with REAL market data!");
    console.log("🔗 Explorer:", `https://sepolia.etherscan.io/tx/${tx.hash}`);

  } catch (error) {
    console.error("\\n❌ Error updating prices:");

    if (error.message.includes("Price too old")) {
      console.error("   The fetched prices are too old (>5 minutes)");
      console.error("   This is normal - just run the script again");
    } else if (error.message.includes("insufficient funds")) {
      console.error("   Insufficient ETH for update fee");
      console.error("   Get testnet ETH from: https://www.alchemy.com/faucets/ethereum-sepolia");
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
