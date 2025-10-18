import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Hardhat 3 배포 스크립트 - Raw Provider 사용
 * connection.provider를 직접 사용하여 배포
 */
async function main() {
  console.log("🚀 Hardhat 3 Deployment with Raw Provider");
  console.log("=========================================");

  // Hardhat network connection
  const connection = await hre.network.connect();

  // Provider 직접 사용 (EIP-1193 provider)
  const provider = connection.provider;

  // 계정 목록 가져오기
  const accounts = await provider.request({
    method: "eth_accounts",
    params: []
  });

  if (accounts.length === 0) {
    throw new Error("No accounts available");
  }

  const deployerAddress = accounts[0];
  console.log("📝 Deploying from account:", deployerAddress);

  // 계정 잔액 확인
  const balanceHex = await provider.request({
    method: "eth_getBalance",
    params: [deployerAddress, "latest"]
  });
  const balance = BigInt(balanceHex);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Artifact 읽기
  const artifact = await hre.artifacts.readArtifact("Lock");

  // 배포 파라미터
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const unlockTime = currentTimestamp + 60;
  const lockedAmount = ethers.parseEther("0.001");

  console.log("⏰ Unlock time:", new Date(unlockTime * 1000).toISOString());
  console.log("🔒 Locked amount:", ethers.formatEther(lockedAmount), "ETH");

  // ABI 인코딩 (constructor parameters)
  const abiCoder = new ethers.AbiCoder();
  const constructorParams = abiCoder.encode(["uint256"], [unlockTime]);

  // 배포 데이터 = bytecode + constructor parameters
  const deployData = artifact.bytecode + constructorParams.slice(2);

  console.log("\n📦 Deploying Lock contract...");

  // 트랜잭션 전송
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: deployerAddress,
      data: deployData,
      value: "0x" + lockedAmount.toString(16),
      gas: "0x100000" // 1,048,576 gas
    }]
  });

  console.log("📤 Transaction sent:", txHash);
  console.log("⏳ Waiting for confirmation...");

  // 트랜잭션 영수증 대기
  let receipt = null;
  while (!receipt) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });
  }

  if (receipt.status !== "0x1") {
    throw new Error("Transaction failed");
  }

  const contractAddress = receipt.contractAddress;
  console.log("✅ Lock contract deployed!");
  console.log("📍 Contract address:", contractAddress);
  console.log("⛽ Gas used:", parseInt(receipt.gasUsed, 16));
  console.log("🔢 Block number:", parseInt(receipt.blockNumber, 16));

  // 배포된 컨트랙트 검증
  console.log("\n🔍 Verifying deployed contract...");

  // owner() 함수 호출
  const ownerData = ethers.id("owner()").slice(0, 10);
  const ownerResult = await provider.request({
    method: "eth_call",
    params: [{
      to: contractAddress,
      data: ownerData
    }, "latest"]
  });

  const owner = "0x" + ownerResult.slice(26);
  console.log("  - Owner:", owner);

  // 컨트랙트 잔액 확인
  const contractBalanceHex = await provider.request({
    method: "eth_getBalance",
    params: [contractAddress, "latest"]
  });
  const contractBalance = BigInt(contractBalanceHex);
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