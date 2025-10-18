import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Hardhat 3 간단한 배포 스크립트
 * 가장 단순한 방법으로 배포
 */
async function main() {
  console.log("🚀 Simple Hardhat 3 Deployment");
  console.log("==============================");

  try {
    // connection 객체 가져오기
    const connection = await hre.network.connect();
    console.log("📡 Connected to network:", connection.networkName || "hardhat");

    // provider를 ethers v6의 BrowserProvider로 래핑
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const deployerAddress = await signer.getAddress();

    console.log("👤 Deployer:", deployerAddress);

    // 배포 파라미터
    const unlockTime = Math.floor(Date.now() / 1000) + 60;
    const value = ethers.parseEther("0.001");

    // artifact 읽기
    const artifact = JSON.parse(
      fs.readFileSync("artifacts/contracts/Lock.sol/Lock.json", "utf8")
    );

    // ContractFactory 생성 및 배포
    console.log("📦 Deploying...");
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy(unlockTime, { value });

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("✅ Deployed to:", address);
    console.log("📝 Transaction:", contract.deploymentTransaction().hash);

    // 검증
    const owner = await contract.owner();
    const balance = await provider.getBalance(address);

    console.log("👑 Owner:", owner);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    await connection.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();