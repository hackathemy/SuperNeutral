import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

// Sepolia testnet addresses
const PYTH_ORACLE_SEPOLIA = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"; // Pyth on Sepolia

async function main() {
    console.log("🚀 Starting Lending Protocol deployment on Sepolia testnet...");

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

        if (balance < ethers.parseEther("0.1")) {
            console.error("❌ Insufficient balance. Need at least 0.1 ETH on Sepolia");
            return;
        }

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

        // 3. Deploy Mock StETHVaultManager (simplified for testnet)
        console.log("\n3️⃣ Deploying MockStETHVault...");
        const vaultArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockStETHVault.sol/MockStETHVault.json"), "utf8")
        );
        const vaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, signer);
        const stETHVault = await vaultFactory.deploy();
        await stETHVault.waitForDeployment();
        const vaultAddress = await stETHVault.getAddress();
        console.log("✅ MockStETHVault deployed to:", vaultAddress);

        // 4. Deploy EthereumLendingPool
        console.log("\n4️⃣ Deploying EthereumLendingPool...");
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, signer);
        const lendingPool = await poolFactory.deploy(
            pyusdAddress,      // Mock PYUSD
            nftAddress,        // Loan NFT
            vaultAddress,      // Mock Vault
            PYTH_ORACLE_SEPOLIA // Pyth Oracle on Sepolia
        );
        await lendingPool.waitForDeployment();
        const poolAddress = await lendingPool.getAddress();
        console.log("✅ EthereumLendingPool deployed to:", poolAddress);

        // 5. Configure access control
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

        // 6. Setup initial liquidity
        console.log("\n💰 Setting up initial liquidity...");

        // Mint PYUSD to the pool for liquidity
        const mintAmount = ethers.parseUnits("100000", 6); // 100k PYUSD
        const mintTx = await mockPYUSD.mint(signerAddress, mintAmount);
        await mintTx.wait();
        console.log("✅ Minted 100,000 PYUSD to deployer");

        // Approve and supply PYUSD to the pool
        const approveTx = await mockPYUSD.approve(poolAddress, mintAmount);
        await approveTx.wait();

        const supplyTx = await lendingPool.supplyPYUSD(mintAmount);
        await supplyTx.wait();
        console.log("✅ Supplied 100,000 PYUSD to lending pool");

        // Summary
        console.log("\n=================================");
        console.log("🎉 Sepolia Deployment Complete!");
        console.log("=================================");
        console.log("📋 Contract Addresses:");
        console.log("  MockPYUSD:", pyusdAddress);
        console.log("  EthereumLoanNFT:", nftAddress);
        console.log("  MockStETHVault:", vaultAddress);
        console.log("  EthereumLendingPool:", poolAddress);
        console.log("  Pyth Oracle:", PYTH_ORACLE_SEPOLIA);
        console.log("=================================");
        console.log("\n📝 Next Steps:");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Test borrowing with ETH collateral");
        console.log("3. Test liquidation scenarios");
        console.log("4. Get PYUSD from faucet: mockPYUSD.faucet()");
        console.log("=================================");

        // Save deployment info
        const deployment = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            contracts: {
                MockPYUSD: pyusdAddress,
                EthereumLoanNFT: nftAddress,
                MockStETHVault: vaultAddress,
                EthereumLendingPool: poolAddress,
                PythOracle: PYTH_ORACLE_SEPOLIA
            },
            deployer: signerAddress
        };

        console.log("\n📄 Deployment info saved:", JSON.stringify(deployment, null, 2));

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