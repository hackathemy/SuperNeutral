import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Complete System Deployment - Multi-Vault + Short Position System
 */

// Helper function to deploy contracts
async function deployContract(name, signer, ...args) {
    const artifact = JSON.parse(
        fs.readFileSync(`./artifacts/contracts/ethereum/core/${name}.sol/${name}.json`, "utf8")
    );
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    return contract;
}

// Helper for mocks
async function deployMock(name, signer) {
    const artifact = JSON.parse(
        fs.readFileSync(`./artifacts/contracts/mocks/${name}.sol/${name}.json`, "utf8")
    );
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
}

// Helper for tokens
async function deployToken(name, signer, ...args) {
    const artifact = JSON.parse(
        fs.readFileSync(`./artifacts/contracts/ethereum/tokens/${name}.sol/${name}.json`, "utf8")
    );
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    return contract;
}

async function main() {
    console.log("\n🚀 Deploying Complete Multi-Strategy Lending Protocol on Sepolia...\n");

    // ==================== Configuration ====================
    const DEFAULT_VAULT_STRATEGY = 0; // 0 = Aave V3
    const DEFAULT_SHORT_STRATEGY = 0; // 0 = Aave + Uniswap

    const ADDRESSES = {
        aave: {
            pool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
            weth: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
            aWETH: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830"
        },
        pythOracle: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
        officialPYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
    };

    // ==================== Setup ====================
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const deployer = await signer.getAddress();

    console.log("📋 Deployment Configuration:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 Network: Sepolia Testnet");
    console.log("👤 Deployer:", deployer);
    console.log("🎯 Default Vault Strategy: Aave V3");
    console.log("🎯 Default Short Strategy: Aave + Uniswap");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const balance = await provider.getBalance(deployer);
    console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance < ethers.parseEther("0.2")) {
        console.warn("⚠️  Warning: May need more ETH. Get from: https://www.alchemy.com/faucets/ethereum-sepolia\n");
    }

    const deployed = {};

    try {
        // Phase 1: Vault Strategies
        console.log("Phase 1️⃣ : Deploying Vault Strategies\n");

        const aaveVault = await deployContract("AaveV3Vault", signer, ADDRESSES.aave.weth, ADDRESSES.aave.aWETH);
        deployed.AaveV3Vault = await aaveVault.getAddress();
        console.log("✅ Aave V3 Vault:", deployed.AaveV3Vault);

        const rocketVault = await deployMock("MockRocketPoolVault", signer);
        deployed.MockRocketPoolVault = await rocketVault.getAddress();
        console.log("✅ Rocket Pool Vault (Mock):", deployed.MockRocketPoolVault);

        const lidoVault = await deployMock("MockStETHVault", signer);
        deployed.MockStETHVault = await lidoVault.getAddress();
        console.log("✅ LIDO Vault (Mock):", deployed.MockStETHVault);

        // Phase 2: Vault Router
        console.log("\nPhase 2️⃣ : Deploying Vault Router\n");

        const vaultRouter = await deployContract("VaultRouter", signer, DEFAULT_VAULT_STRATEGY);
        deployed.VaultRouter = await vaultRouter.getAddress();
        console.log("✅ Vault Router:", deployed.VaultRouter);

        console.log("\nRegistering vault strategies...");
        let tx = await vaultRouter.registerVault(0, deployed.AaveV3Vault);
        await tx.wait();
        tx = await vaultRouter.registerVault(1, deployed.MockRocketPoolVault);
        await tx.wait();
        tx = await vaultRouter.registerVault(2, deployed.MockStETHVault);
        await tx.wait();
        console.log("✅ All vault strategies registered");

        // Phase 3: Short Position Strategies
        console.log("\nPhase 3️⃣ : Deploying Short Position Strategies\n");

        const aaveUniswapShort = await deployContract("AaveUniswapShort", signer);
        deployed.AaveUniswapShort = await aaveUniswapShort.getAddress();
        console.log("✅ Aave + Uniswap Short:", deployed.AaveUniswapShort);

        // Phase 4: Short Position Router
        console.log("\nPhase 4️⃣ : Deploying Short Position Router\n");

        const shortRouter = await deployContract("ShortPositionRouter", signer);
        deployed.ShortPositionRouter = await shortRouter.getAddress();
        console.log("✅ Short Position Router:", deployed.ShortPositionRouter);

        console.log("\nRegistering short strategies...");
        tx = await shortRouter.registerStrategy(0, deployed.AaveUniswapShort);
        await tx.wait();
        console.log("✅ Aave + Uniswap registered");

        // Phase 5: Supporting Contracts
        console.log("\nPhase 5️⃣ : Deploying Supporting Contracts\n");

        deployed.PYUSD = ADDRESSES.officialPYUSD;
        console.log("✅ Using Official PYUSD:", deployed.PYUSD);

        const loanNFT = await deployContract("EthereumLoanNFT", signer);
        deployed.EthereumLoanNFT = await loanNFT.getAddress();
        console.log("✅ Loan NFT:", deployed.EthereumLoanNFT);

        const stakedPYUSD = await deployToken("StakedPYUSD", signer);
        deployed.StakedPYUSD = await stakedPYUSD.getAddress();
        console.log("✅ Staked PYUSD:", deployed.StakedPYUSD);

        // Phase 6: Lending Pool
        console.log("\nPhase 6️⃣ : Deploying Lending Pool\n");

        const lendingPool = await deployContract(
            "EthereumLendingPool",
            signer,
            deployed.PYUSD,
            deployed.EthereumLoanNFT,
            deployed.VaultRouter,
            deployed.ShortPositionRouter,
            ADDRESSES.pythOracle,
            deployed.StakedPYUSD
        );
        deployed.EthereumLendingPool = await lendingPool.getAddress();
        console.log("✅ Lending Pool:", deployed.EthereumLendingPool);

        // Phase 7: Authorizations
        console.log("\nPhase 7️⃣ : Setting up Authorizations\n");

        tx = await aaveVault.setAuthorizedCaller(deployed.VaultRouter, true);
        await tx.wait();
        tx = await rocketVault.setAuthorizedCaller(deployed.VaultRouter, true);
        await tx.wait();
        tx = await lidoVault.setAuthorizedCaller(deployed.VaultRouter, true);
        await tx.wait();
        console.log("✅ Vault strategies authorized");

        tx = await vaultRouter.setAuthorizedCaller(deployed.EthereumLendingPool, true);
        await tx.wait();
        console.log("✅ Vault Router authorized");

        tx = await aaveUniswapShort.setAuthorizedCaller(deployed.ShortPositionRouter, true);
        await tx.wait();
        console.log("✅ Short strategies authorized");

        tx = await shortRouter.setAuthorizedCaller(deployed.EthereumLendingPool, true);
        await tx.wait();
        console.log("✅ Short Router authorized");

        const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
        tx = await loanNFT.grantRole(MINTER_ROLE, deployed.EthereumLendingPool);
        await tx.wait();
        console.log("✅ Loan NFT authorized");

        tx = await stakedPYUSD.setLendingPool(deployed.EthereumLendingPool);
        await tx.wait();
        console.log("✅ Staked PYUSD authorized");

        // Save deployment
        const deploymentInfo = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            deployer: deployer,
            contracts: deployed,
            addresses: ADDRESSES
        };

        fs.writeFileSync("./deployment-complete-system.json", JSON.stringify(deploymentInfo, null, 2));

        // Summary
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Complete System Deployment Successful!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        console.log("📦 Vault System:");
        console.log(`   VaultRouter: ${deployed.VaultRouter}`);
        console.log(`   ├─ [0] Aave V3: ${deployed.AaveV3Vault} ⭐`);
        console.log(`   ├─ [1] Rocket Pool: ${deployed.MockRocketPoolVault}`);
        console.log(`   └─ [2] LIDO: ${deployed.MockStETHVault}\n`);

        console.log("📦 Short Position System:");
        console.log(`   ShortRouter: ${deployed.ShortPositionRouter}`);
        console.log(`   └─ [0] Aave+Uniswap: ${deployed.AaveUniswapShort} ⭐\n`);

        console.log("📦 Core:");
        console.log(`   PYUSD: ${deployed.PYUSD}`);
        console.log(`   Lending Pool: ${deployed.EthereumLendingPool}`);
        console.log(`   Loan NFT: ${deployed.EthereumLoanNFT}`);
        console.log(`   sPYUSD: ${deployed.StakedPYUSD}\n`);

        console.log("🎯 How It Works:");
        console.log("   Collateral splits based on shortRatio (0-30%):");
        console.log("   - Long → VaultRouter → Aave V3 (earning yield)");
        console.log("   - Short → ShortRouter → Aave+Uniswap (hedging)\n");

        console.log("📊 Next Steps:");
        console.log("   1. Get PYUSD: https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd");
        console.log("   2. Supply PYUSD to pool");
        console.log("   3. Borrow with ETH (set shortRatio 0-3000)\n");

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (error) {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
