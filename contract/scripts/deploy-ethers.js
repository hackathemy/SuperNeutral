import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Hardhat 3 배포 스크립트 - ethers.js Web3Provider 사용
 * 플러그인 없이 순수 ethers.js로 배포
 */
async function main() {
  console.log("🚀 Hardhat 3 Deployment with Pure Ethers.js");
  console.log("============================================");

  // Hardhat network connection 가져오기
  const connection = await hre.network.connect();

  // Provider를 ethers.js Web3Provider로 래핑
  const provider = new ethers.BrowserProvider(connection.provider);

  // Signer 가져오기 (첫 번째 계정 사용)
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  console.log("📝 Deploying from account:", signerAddress);

  // 계정 잔액 확인
  const balance = await provider.getBalance(signerAddress);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Artifact 파일 읽기
  const artifactPath = "artifacts/contracts/Lock.sol/Lock.json";
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // 배포 파라미터 설정
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const unlockTime = currentTimestamp + 60; // 1분 후
  const lockedAmount = ethers.parseEther("0.001");

  console.log("⏰ Unlock time:", new Date(unlockTime * 1000).toISOString());
  console.log("🔒 Locked amount:", ethers.formatEther(lockedAmount), "ETH");

  // ContractFactory 생성
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer
  );

  // 컨트랙트 배포
  console.log("\n📦 Deploying Lock contract...");
  const lock = await factory.deploy(unlockTime, { value: lockedAmount });

  // 배포 트랜잭션 대기
  await lock.waitForDeployment();
  const lockAddress = await lock.getAddress();

  console.log("✅ Lock contract deployed!");
  console.log("📍 Contract address:", lockAddress);
  console.log("🔗 Transaction hash:", lock.deploymentTransaction().hash);

  // 배포된 컨트랙트 검증
  const deployedUnlockTime = await lock.unlockTime();
  const deployedOwner = await lock.owner();
  const contractBalance = await provider.getBalance(lockAddress);

  console.log("\n🔍 Deployed Contract Info:");
  console.log("  - Unlock time:", new Date(Number(deployedUnlockTime) * 1000).toISOString());
  console.log("  - Owner:", deployedOwner);
  console.log("  - Contract balance:", ethers.formatEther(contractBalance), "ETH");

  // 연결 종료
  await connection.close();
  console.log("\n👋 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
  });