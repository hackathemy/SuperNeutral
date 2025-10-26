import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

async function main() {
    console.log("\n🔍 Debugging Deployment...\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();

    // Load ABIs
    const lendingPoolAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json", "utf8")
    ).abi;
    const stakedPYUSDAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json", "utf8")
    ).abi;

    const lendingPool = new ethers.Contract(contracts.EthereumLendingPool, lendingPoolAbi, provider);
    const stakedPYUSD = new ethers.Contract(contracts.StakedPYUSD, stakedPYUSDAbi, provider);

    console.log("📋 Contract Addresses:");
    console.log("   Lending Pool:", contracts.EthereumLendingPool);
    console.log("   Staked PYUSD:", contracts.StakedPYUSD);
    console.log("   PYUSD:", contracts.PYUSD);

    console.log("\n🔗 Checking Connections:");

    try {
        const lendingPoolFromStaked = await stakedPYUSD.lendingPool();
        console.log("   sPYUSD.lendingPool():", lendingPoolFromStaked);
        console.log("   Match:", lendingPoolFromStaked.toLowerCase() === contracts.EthereumLendingPool.toLowerCase() ? "✅" : "❌");
    } catch (e) {
        console.log("   ❌ Error reading lendingPool:", e.message);
    }

    try {
        const stakedFromPool = await lendingPool.stakedPYUSD();
        console.log("   Pool.stakedPYUSD():", stakedFromPool);
        console.log("   Match:", stakedFromPool.toLowerCase() === contracts.StakedPYUSD.toLowerCase() ? "✅" : "❌");
    } catch (e) {
        console.log("   ❌ Error reading stakedPYUSD:", e.message);
    }

    try {
        const pyusdFromPool = await lendingPool.PYUSD();
        console.log("   Pool.PYUSD():", pyusdFromPool);
        console.log("   Match:", pyusdFromPool.toLowerCase() === contracts.PYUSD.toLowerCase() ? "✅" : "❌");
    } catch (e) {
        console.log("   ❌ Error reading PYUSD:", e.message);
    }

    console.log("\n📊 Contract States:");

    try {
        const totalSupply = await lendingPool.getTotalSupply();
        const totalBorrowed = await lendingPool.getTotalBorrowed();
        console.log("   Pool Total Supply:", ethers.formatUnits(totalSupply, 6), "PYUSD");
        console.log("   Pool Total Borrowed:", ethers.formatUnits(totalBorrowed, 6), "PYUSD");
    } catch (e) {
        console.log("   ❌ Error reading pool stats:", e.message);
    }

    try {
        const spyusdTotalSupply = await stakedPYUSD.totalSupply();
        const totalPYUSDDeposited = await stakedPYUSD.totalPYUSDDeposited();
        const exchangeRate = await stakedPYUSD.exchangeRate();
        console.log("   sPYUSD Total Supply:", ethers.formatEther(spyusdTotalSupply));
        console.log("   Total PYUSD Deposited:", ethers.formatUnits(totalPYUSDDeposited, 6));
        console.log("   Exchange Rate:", ethers.formatEther(exchangeRate));
    } catch (e) {
        console.log("   ❌ Error reading sPYUSD stats:", e.message);
    }

    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
