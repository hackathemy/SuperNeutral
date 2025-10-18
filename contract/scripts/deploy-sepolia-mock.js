import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

async function main() {
    console.log("🚀 Starting Lending Protocol deployment on Sepolia with Mock Pyth Oracle...\n");

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

        // 1. Deploy Mock Pyth Oracle
        console.log("\n1️⃣ Deploying MockPythOracle...");
        const pythArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json"), "utf8")
        );
        const pythFactory = new ethers.ContractFactory(pythArtifact.abi, pythArtifact.bytecode, signer);
        const mockPyth = await pythFactory.deploy();
        await mockPyth.waitForDeployment();
        const pythAddress = await mockPyth.getAddress();
        console.log("✅ MockPythOracle deployed to:", pythAddress);

        // 2. Deploy Mock PYUSD
        console.log("\n2️⃣ Deploying MockPYUSD...");
        const pyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json"), "utf8")
        );
        const pyusdFactory = new ethers.ContractFactory(pyusdArtifact.abi, pyusdArtifact.bytecode, signer);
        const mockPYUSD = await pyusdFactory.deploy();
        await mockPYUSD.waitForDeployment();
        const pyusdAddress = await mockPYUSD.getAddress();
        console.log("✅ MockPYUSD deployed to:", pyusdAddress);

        // 3. Deploy EthereumLoanNFT
        console.log("\n3️⃣ Deploying EthereumLoanNFT...");
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );
        const nftFactory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, signer);
        const loanNFT = await nftFactory.deploy();
        await loanNFT.waitForDeployment();
        const nftAddress = await loanNFT.getAddress();
        console.log("✅ EthereumLoanNFT deployed to:", nftAddress);

        // 4. Deploy Mock StETHVault
        console.log("\n4️⃣ Deploying MockStETHVault...");
        const vaultArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockStETHVault.sol/MockStETHVault.json"), "utf8")
        );
        const vaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, signer);
        const stETHVault = await vaultFactory.deploy();
        await stETHVault.waitForDeployment();
        const vaultAddress = await stETHVault.getAddress();
        console.log("✅ MockStETHVault deployed to:", vaultAddress);

        // 5. Deploy EthereumLendingPool with Mock Pyth Oracle
        console.log("\n5️⃣ Deploying EthereumLendingPool...");
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, signer);
        const lendingPool = await poolFactory.deploy(
            pyusdAddress,      // Mock PYUSD
            nftAddress,        // Loan NFT
            vaultAddress,      // Mock Vault
            pythAddress        // Mock Pyth Oracle
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

        // 7. Setup initial liquidity
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

        // 8. Verify Mock Pyth Oracle prices
        console.log("\n📊 Verifying Mock Pyth Oracle prices...");
        const ethPrice = await lendingPool.getETHPrice();
        console.log("✅ ETH Price:", ethers.formatUnits(ethPrice, 8), "USD");

        // Summary
        console.log("\n=================================");
        console.log("🎉 Sepolia Deployment Complete!");
        console.log("=================================");
        console.log("📋 Contract Addresses:");
        console.log("  MockPythOracle:", pythAddress);
        console.log("  MockPYUSD:", pyusdAddress);
        console.log("  EthereumLoanNFT:", nftAddress);
        console.log("  MockStETHVault:", vaultAddress);
        console.log("  EthereumLendingPool:", poolAddress);
        console.log("=================================");
        console.log("\n📝 Next Steps:");
        console.log("1. Test borrowing with ETH collateral");
        console.log("2. Test liquidation by simulating price crash");
        console.log("3. Test repayment and NFT transfer");
        console.log("=================================");

        // Save deployment info
        const deployment = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            contracts: {
                MockPythOracle: pythAddress,
                MockPYUSD: pyusdAddress,
                EthereumLoanNFT: nftAddress,
                MockStETHVault: vaultAddress,
                EthereumLendingPool: poolAddress
            },
            deployer: signerAddress,
            explorerUrls: {
                MockPythOracle: `https://sepolia.etherscan.io/address/${pythAddress}`,
                MockPYUSD: `https://sepolia.etherscan.io/address/${pyusdAddress}`,
                EthereumLoanNFT: `https://sepolia.etherscan.io/address/${nftAddress}`,
                MockStETHVault: `https://sepolia.etherscan.io/address/${vaultAddress}`,
                EthereumLendingPool: `https://sepolia.etherscan.io/address/${poolAddress}`
            }
        };

        console.log("\n📄 Deployment info:\n", JSON.stringify(deployment, null, 2));

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
