import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  // Connect to the Hardhat network
  const connection = await hre.network.connect();

  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const unlockTime = currentTimestampInSeconds + 60; // 1 minute from now

  const lockedAmount = ethers.parseEther("0.001");

  console.log("Deploying Lock contract...");

  const Lock = await connection.getContractFactory("Lock");
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  await lock.waitForDeployment();

  const lockAddress = await lock.getAddress();
  console.log(
    `Lock with ${ethers.formatEther(lockedAmount)} ETH deployed to ${lockAddress}`
  );
  console.log(`Unlock time: ${new Date(unlockTime * 1000).toISOString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
