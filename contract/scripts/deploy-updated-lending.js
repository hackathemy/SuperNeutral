import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

// Existing contract addresses on Sepolia (will be reused)
const EXISTING_CONTRACTS = {
    MockPYUSD: "0x57391875ce6340E5ED878752A30D080f31B63934",
    LoanNFT: "0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529",
    MockStETHVault: "0xF289c5dcF9CDd8e36128682A32A6B4D962825955",
    MockPythOracle: "0x05029B98e42AC2b0C4315E52f30260918efcAd48"
};

async function main() {
    console.log("🚀 Deploying updated contracts with sPYUSD and liquidation bonus...");

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

        if (balance < ethers.parseEther("0.05")) {
            console.error("❌ Insufficient balance. Need at least 0.05 ETH on Sepolia");
            return;
        }

        // Deploy new contracts
        console.log("\n📝 Deploying new contracts...");

        // 1. Deploy StakedPYUSD
        console.log("\n1️⃣ Deploying StakedPYUSD...");
        const spyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json"), "utf8")
        );
        const spyusdFactory = new ethers.ContractFactory(spyusdArtifact.abi, spyusdArtifact.bytecode, signer);
        const stakedPYUSD = await spyusdFactory.deploy();
        await stakedPYUSD.waitForDeployment();
        const spyusdAddress = await stakedPYUSD.getAddress();
        console.log("✅ StakedPYUSD deployed to:", spyusdAddress);

        // 2. Deploy updated EthereumLendingPool
        console.log("\n2️⃣ Deploying updated EthereumLendingPool...");
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, signer);
        const lendingPool = await poolFactory.deploy(
            EXISTING_CONTRACTS.MockPYUSD,
            EXISTING_CONTRACTS.LoanNFT,
            EXISTING_CONTRACTS.MockStETHVault,
            EXISTING_CONTRACTS.MockPythOracle,
            spyusdAddress  // New parameter: StakedPYUSD address
        );
        await lendingPool.waitForDeployment();
        const poolAddress = await lendingPool.getAddress();
        console.log("✅ EthereumLendingPool deployed to:", poolAddress);

        // 3. Configure StakedPYUSD
        console.log("\n🔧 Configuring StakedPYUSD...");
        const setPoolTx = await stakedPYUSD.setLendingPool(poolAddress);
        await setPoolTx.wait();
        console.log("✅ Set LendingPool address in StakedPYUSD");

        // 4. Update LoanNFT to use new LendingPool
        console.log("\n🔧 Updating LoanNFT...");
        const nftArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json"), "utf8")
        );
        const loanNFT = new ethers.Contract(EXISTING_CONTRACTS.LoanNFT, nftArtifact.abi, signer);

        // Grant MINTER_ROLE to new lending pool
        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        const grantTx = await loanNFT.grantRole(MINTER_ROLE, poolAddress);
        await grantTx.wait();
        console.log("✅ Granted MINTER_ROLE to new lending pool");

        // 5. Authorize new lending pool in vault
        console.log("\n🔧 Updating MockStETHVault...");
        const vaultArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockStETHVault.sol/MockStETHVault.json"), "utf8")
        );
        const vault = new ethers.Contract(EXISTING_CONTRACTS.MockStETHVault, vaultArtifact.abi, signer);
        const authTx = await vault.setAuthorizedCaller(poolAddress, true);
        await authTx.wait();
        console.log("✅ Authorized new lending pool in vault");

        // 6. Setup initial liquidity
        console.log("\n💰 Setting up initial liquidity...");
        const pyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json"), "utf8")
        );
        const mockPYUSD = new ethers.Contract(EXISTING_CONTRACTS.MockPYUSD, pyusdArtifact.abi, signer);

        // Check current balance
        const currentBalance = await mockPYUSD.balanceOf(signerAddress);
        console.log("📊 Current PYUSD balance:", ethers.formatUnits(currentBalance, 6));

        if (currentBalance < ethers.parseUnits("100000", 6)) {
            // Mint more PYUSD
            const mintAmount = ethers.parseUnits("100000", 6);
            const mintTx = await mockPYUSD.mint(signerAddress, mintAmount);
            await mintTx.wait();
            console.log("✅ Minted 100,000 PYUSD to deployer");
        }

        // Approve and supply PYUSD to the pool
        const supplyAmount = ethers.parseUnits("100000", 6);
        const approveTx = await mockPYUSD.approve(poolAddress, supplyAmount);
        await approveTx.wait();

        const supplyTx = await lendingPool.supplyPYUSD(supplyAmount);
        await supplyTx.wait();
        console.log("✅ Supplied 100,000 PYUSD to new lending pool");

        // Get sPYUSD balance
        const spyusdBalance = await stakedPYUSD.balanceOf(signerAddress);
        console.log("💎 Received sPYUSD:", ethers.formatUnits(spyusdBalance, 6));

        // Summary
        console.log("\n=================================");
        console.log("🎉 Updated Deployment Complete!");
        console.log("=================================");
        console.log("📋 New Contract Addresses:");
        console.log("  StakedPYUSD:", spyusdAddress);
        console.log("  EthereumLendingPool (NEW):", poolAddress);
        console.log("\n📋 Existing Contracts (Reused):");
        console.log("  MockPYUSD:", EXISTING_CONTRACTS.MockPYUSD);
        console.log("  EthereumLoanNFT:", EXISTING_CONTRACTS.LoanNFT);
        console.log("  MockStETHVault:", EXISTING_CONTRACTS.MockStETHVault);
        console.log("  MockPythOracle:", EXISTING_CONTRACTS.MockPythOracle);
        console.log("=================================");
        console.log("\n✨ New Features:");
        console.log("  ✅ sPYUSD (Staked PYUSD) - Interest-bearing token");
        console.log("  ✅ Liquidation Bonus - 0.1% incentive for liquidators");
        console.log("  ✅ Automatic compounding via exchange rate");
        console.log("=================================");
        console.log("\n📝 Next Steps:");
        console.log("1. Update frontend config with new addresses");
        console.log("2. Test supply/withdraw with sPYUSD");
        console.log("3. Test liquidation bonus mechanism");
        console.log("4. Verify new contracts on Etherscan");
        console.log("=================================");

        // Save deployment info
        const deployment = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            newContracts: {
                StakedPYUSD: spyusdAddress,
                EthereumLendingPool: poolAddress
            },
            existingContracts: EXISTING_CONTRACTS,
            deployer: signerAddress,
            features: {
                liquidationBonus: "0.1%",
                sPYUSD: true
            }
        };

        console.log("\n📄 Deployment info:");
        console.log(JSON.stringify(deployment, null, 2));

        // Output for easy copy to frontend config
        console.log("\n📋 Copy to frontend/src/config/contracts.ts:");
        console.log(`
export const CONTRACTS = {
  LendingPool: "${poolAddress}" as \`0x\${string}\`,
  LoanNFT: "${EXISTING_CONTRACTS.LoanNFT}" as \`0x\${string}\`,
  MockPYUSD: "${EXISTING_CONTRACTS.MockPYUSD}" as \`0x\${string}\`,
  MockStETHVault: "${EXISTING_CONTRACTS.MockStETHVault}" as \`0x\${string}\`,
  MockPythOracle: "${EXISTING_CONTRACTS.MockPythOracle}" as \`0x\${string}\`,
  StakedPYUSD: "${spyusdAddress}" as \`0x\${string}\`,
} as const;
        `);

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
