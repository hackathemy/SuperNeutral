import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

const hre = hardhat;

// Contract addresses (mainnet - update for testnet)
const PYUSD_ADDRESS = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"; // PayPal USD on Ethereum
const PYTH_ORACLE_ADDRESS = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6"; // Pyth on Ethereum mainnet

async function main() {
    console.log("🚀 Starting Lending Protocol deployment...");

    try {
        // Connect to network
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

        // 1. Deploy EthereumLoanNFT
        console.log("\n1️⃣ Deploying EthereumLoanNFT...");
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );
        const nftFactory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, signer);
        const loanNFT = await nftFactory.deploy();
        await loanNFT.waitForDeployment();
        const nftAddress = await loanNFT.getAddress();
        console.log("✅ EthereumLoanNFT deployed to:", nftAddress);

        // 2. Deploy StETHVaultManager
        console.log("\n2️⃣ Deploying StETHVaultManager...");
        const vaultArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/StETHVaultManager.sol/StETHVaultManager.json"), "utf8")
        );
        const vaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, signer);
        const stETHVault = await vaultFactory.deploy();
        await stETHVault.waitForDeployment();
        const vaultAddress = await stETHVault.getAddress();
        console.log("✅ StETHVaultManager deployed to:", vaultAddress);

        // 3. Deploy EthereumLendingPool
        console.log("\n3️⃣ Deploying EthereumLendingPool...");
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, signer);
        const lendingPool = await poolFactory.deploy(
            PYUSD_ADDRESS,
            nftAddress,
            vaultAddress,
            PYTH_ORACLE_ADDRESS
        );
        await lendingPool.waitForDeployment();
        const poolAddress = await lendingPool.getAddress();
        console.log("✅ EthereumLendingPool deployed to:", poolAddress);

        // 4. Configure access control
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
        console.log("🎉 Deployment Complete!");
        console.log("=================================");
        console.log("📋 Contract Addresses:");
        console.log("  EthereumLoanNFT:", nftAddress);
        console.log("  StETHVaultManager:", vaultAddress);
        console.log("  EthereumLendingPool:", poolAddress);
        console.log("=================================");

        // Save deployment addresses
        const deployment = {
            network: hre.network.name,
            timestamp: new Date().toISOString(),
            contracts: {
                EthereumLoanNFT: nftAddress,
                StETHVaultManager: vaultAddress,
                EthereumLendingPool: poolAddress,
                PYUSD: PYUSD_ADDRESS,
                PythOracle: PYTH_ORACLE_ADDRESS
            }
        };

        console.log("\n📄 Deployment info:", JSON.stringify(deployment, null, 2));

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