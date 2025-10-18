import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

const hre = hardhat;

// Mock Pyth Oracle address for local testing
const MOCK_PYTH_ORACLE = "0x0000000000000000000000000000000000000001";

async function main() {
    console.log("🚀 Starting Local Lending Protocol deployment...");

    try {
        // Connect to local network
        const connection = await hre.network.connect();
        console.log("📡 Connected to network:", hre.network.name);

        // Wrap the provider
        const provider = new ethers.BrowserProvider(connection.provider);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("💼 Deploying with account:", signerAddress);

        const balance = await provider.getBalance(signerAddress);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

        // Deploy contracts in order
        console.log("\n📝 Deploying contracts...");

        // 1. Deploy Mock PYUSD
        console.log("\n1️⃣ Deploying MockPYUSD...");
        const pyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json"), "utf8")
        );
        const pyusdFactory = new ethers.ContractFactory(pyusdArtifact.abi, pyusdArtifact.bytecode, signer);
        const mockPYUSD = await pyusdFactory.deploy();
        await mockPYUSD.waitForDeployment();
        const pyusdAddress = await mockPYUSD.getAddress();
        console.log("✅ MockPYUSD deployed to:", pyusdAddress);

        // 2. Deploy EthereumLoanNFT
        console.log("\n2️⃣ Deploying EthereumLoanNFT...");
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );
        const nftFactory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, signer);
        const loanNFT = await nftFactory.deploy();
        await loanNFT.waitForDeployment();
        const nftAddress = await loanNFT.getAddress();
        console.log("✅ EthereumLoanNFT deployed to:", nftAddress);

        // 3. Deploy Mock StETHVault
        console.log("\n3️⃣ Deploying MockStETHVault...");
        const vaultArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockStETHVault.sol/MockStETHVault.json"), "utf8")
        );
        const vaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, signer);
        const stETHVault = await vaultFactory.deploy();
        await stETHVault.waitForDeployment();
        const vaultAddress = await stETHVault.getAddress();
        console.log("✅ MockStETHVault deployed to:", vaultAddress);

        // 4. Deploy Mock Pyth Oracle (simple contract)
        console.log("\n4️⃣ Deploying MockPythOracle...");
        // For local testing, we'll just use a dummy address
        const pythAddress = MOCK_PYTH_ORACLE;
        console.log("✅ Using Mock Pyth Oracle at:", pythAddress);

        // 5. Deploy EthereumLendingPool
        console.log("\n5️⃣ Deploying EthereumLendingPool...");
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, signer);
        const lendingPool = await poolFactory.deploy(
            pyusdAddress,
            nftAddress,
            vaultAddress,
            pythAddress
        );
        await lendingPool.waitForDeployment();
        const poolAddress = await lendingPool.getAddress();
        console.log("✅ EthereumLendingPool deployed to:", poolAddress);

        // 6. Configure access control
        console.log("\n🔧 Configuring access control...");

        // Grant MINTER_ROLE to lending pool for NFT
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        const grantTx = await loanNFT.grantRole(MINTER_ROLE, poolAddress);
        await grantTx.wait();
        console.log("✅ Granted MINTER_ROLE to lending pool");

        // Authorize lending pool in vault
        const authTx = await stETHVault.setAuthorizedCaller(poolAddress, true);
        await authTx.wait();
        console.log("✅ Authorized lending pool in vault");

        // Summary
        console.log("\n=================================");
        console.log("🎉 Local Deployment Complete!");
        console.log("=================================");
        console.log("📋 Contract Addresses:");
        console.log("  MockPYUSD:", pyusdAddress);
        console.log("  EthereumLoanNFT:", nftAddress);
        console.log("  MockStETHVault:", vaultAddress);
        console.log("  EthereumLendingPool:", poolAddress);
        console.log("=================================");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });