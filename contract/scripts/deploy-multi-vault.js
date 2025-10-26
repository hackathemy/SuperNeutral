import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Deploy Multi-Protocol Vault System
 *
 * Deploys:
 * 1. VaultRouter - Strategy router for switching between protocols
 * 2. AaveV3Vault - Real yield on Sepolia
 * 3. MockRocketPoolVault - Simulated Rocket Pool
 * 4. MockStETHVault - Simulated LIDO
 * 5. EthereumLendingPool - Updated to use VaultRouter
 *
 * Default Strategy: Aave V3 (as requested)
 */

async function main() {
    console.log("\n🚀 Deploying Multi-Protocol Vault System...\n");

    // Configuration
    const DEFAULT_STRATEGY = 0; // 0 = Aave V3, 1 = Rocket Pool, 2 = LIDO

    const AAVE_ADDRESSES = {
        pool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
        weth: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
        aWETH: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830"
    };

    const PYTH_ORACLE = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21";

    // Connect to network
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const deployer = await signer.getAddress();

    console.log("📋 Deployment Configuration:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌐 Network: Sepolia Testnet");
    console.log("👤 Deployer:", deployer);
    console.log("🎯 Default Strategy: Aave V3");
    console.log("\n📊 Strategies to Deploy:");
    console.log("   [0] Aave V3 - Real (Default)");
    console.log("   [1] Rocket Pool - Mock (Sepolia)");
    console.log("   [2] LIDO - Mock (Sepolia)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check balance
    const balance = await provider.getBalance(deployer);
    console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance < ethers.parseEther("0.15")) {
        console.warn("⚠️  Warning: May need more ETH for full deployment.");
        console.log("   Get Sepolia ETH: https://www.alchemy.com/faucets/ethereum-sepolia\n");
    }

    const deployedContracts = {};

    try {
        // 1. Deploy Vault Strategies
        console.log("1️⃣  Deploying Vault Strategies...\n");

        // 1a. Aave V3 Vault (Real)
        console.log("   📦 Deploying Aave V3 Vault (Real)...");
        const AaveV3Vault = await hre.ethers.getContractFactory("AaveV3Vault");
        const aaveVault = await AaveV3Vault.connect(signer).deploy(
            AAVE_ADDRESSES.weth,
            AAVE_ADDRESSES.aWETH
        );
        await aaveVault.waitForDeployment();
        deployedContracts.AaveV3Vault = await aaveVault.getAddress();
        console.log("      ✅", deployedContracts.AaveV3Vault);

        // 1b. Mock Rocket Pool Vault
        console.log("   📦 Deploying Rocket Pool Vault (Mock)...");
        const MockRocketPoolVault = await hre.ethers.getContractFactory("MockRocketPoolVault");
        const rocketVault = await MockRocketPoolVault.connect(signer).deploy();
        await rocketVault.waitForDeployment();
        deployedContracts.MockRocketPoolVault = await rocketVault.getAddress();
        console.log("      ✅", deployedContracts.MockRocketPoolVault);

        // 1c. Mock LIDO Vault
        console.log("   📦 Deploying LIDO Vault (Mock)...");
        const MockStETHVault = await hre.ethers.getContractFactory("MockStETHVault");
        const lidoVault = await MockStETHVault.connect(signer).deploy();
        await lidoVault.waitForDeployment();
        deployedContracts.MockStETHVault = await lidoVault.getAddress();
        console.log("      ✅", deployedContracts.MockStETHVault);

        // 2. Deploy Vault Router
        console.log("\n2️⃣  Deploying Vault Router...");
        const VaultRouter = await hre.ethers.getContractFactory("VaultRouter");
        const vaultRouter = await VaultRouter.connect(signer).deploy(DEFAULT_STRATEGY);
        await vaultRouter.waitForDeployment();
        const routerAddress = await vaultRouter.getAddress();
        deployedContracts.VaultRouter = routerAddress;
        console.log("   ✅ VaultRouter deployed:", routerAddress);

        // 3. Register all vaults in router
        console.log("\n3️⃣  Registering Vault Strategies...");

        console.log("   📝 Registering Aave V3...");
        let tx = await vaultRouter.registerVault(0, deployedContracts.AaveV3Vault);
        await tx.wait();
        console.log("      ✅ Aave V3 registered");

        console.log("   📝 Registering Rocket Pool...");
        tx = await vaultRouter.registerVault(1, deployedContracts.MockRocketPoolVault);
        await tx.wait();
        console.log("      ✅ Rocket Pool registered");

        console.log("   📝 Registering LIDO...");
        tx = await vaultRouter.registerVault(2, deployedContracts.MockStETHVault);
        await tx.wait();
        console.log("      ✅ LIDO registered");

        // 4. Deploy supporting contracts
        console.log("\n4️⃣  Deploying Supporting Contracts...");

        // Mock PYUSD
        console.log("   📦 Deploying Mock PYUSD...");
        const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
        const mockPYUSD = await MockPYUSD.connect(signer).deploy();
        await mockPYUSD.waitForDeployment();
        deployedContracts.MockPYUSD = await mockPYUSD.getAddress();
        console.log("      ✅", deployedContracts.MockPYUSD);

        // Loan NFT
        console.log("   📦 Deploying Loan NFT...");
        const EthereumLoanNFT = await hre.ethers.getContractFactory("EthereumLoanNFT");
        const loanNFT = await EthereumLoanNFT.connect(signer).deploy();
        await loanNFT.waitForDeployment();
        deployedContracts.EthereumLoanNFT = await loanNFT.getAddress();
        console.log("      ✅", deployedContracts.EthereumLoanNFT);

        // Staked PYUSD
        console.log("   📦 Deploying Staked PYUSD...");
        const StakedPYUSD = await hre.ethers.getContractFactory("StakedPYUSD");
        const stakedPYUSD = await StakedPYUSD.connect(signer).deploy(deployedContracts.MockPYUSD);
        await stakedPYUSD.waitForDeployment();
        deployedContracts.StakedPYUSD = await stakedPYUSD.getAddress();
        console.log("      ✅", deployedContracts.StakedPYUSD);

        // 5. Deploy Lending Pool with VaultRouter
        console.log("\n5️⃣  Deploying Lending Pool...");
        const EthereumLendingPool = await hre.ethers.getContractFactory("EthereumLendingPool");
        const lendingPool = await EthereumLendingPool.connect(signer).deploy(
            deployedContracts.MockPYUSD,
            deployedContracts.EthereumLoanNFT,
            routerAddress,  // Using VaultRouter!
            PYTH_ORACLE,
            deployedContracts.StakedPYUSD
        );
        await lendingPool.waitForDeployment();
        deployedContracts.EthereumLendingPool = await lendingPool.getAddress();
        console.log("   ✅ EthereumLendingPool deployed:", deployedContracts.EthereumLendingPool);

        // 6. Setup authorizations
        console.log("\n6️⃣  Setting up authorizations...");

        // Authorize LendingPool for all vaults
        console.log("   🔐 Authorizing Lending Pool...");
        tx = await aaveVault.setAuthorizedCaller(deployedContracts.EthereumLendingPool, true);
        await tx.wait();
        tx = await rocketVault.setAuthorizedCaller(deployedContracts.EthereumLendingPool, true);
        await tx.wait();
        tx = await lidoVault.setAuthorizedCaller(deployedContracts.EthereumLendingPool, true);
        await tx.wait();
        console.log("      ✅ All vaults authorized");

        // Authorize VaultRouter
        console.log("   🔐 Authorizing Vault Router...");
        tx = await vaultRouter.setAuthorizedCaller(deployedContracts.EthereumLendingPool, true);
        await tx.wait();
        console.log("      ✅ Router authorized");

        // Authorize LoanNFT
        tx = await loanNFT.setAuthorizedMinter(deployedContracts.EthereumLendingPool, true);
        await tx.wait();
        console.log("      ✅ LoanNFT authorized");

        // Authorize StakedPYUSD
        tx = await stakedPYUSD.setLendingPool(deployedContracts.EthereumLendingPool);
        await tx.wait();
        console.log("      ✅ StakedPYUSD authorized");

        // 7. Mint test PYUSD
        console.log("\n7️⃣  Minting test PYUSD...");
        const mintAmount = ethers.parseUnits("100000", 6);
        tx = await mockPYUSD.mint(deployer, mintAmount);
        await tx.wait();
        console.log(`   ✅ Minted ${ethers.formatUnits(mintAmount, 6)} PYUSD`);

        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            configuration: {
                defaultStrategy: "Aave V3",
                strategiesAvailable: ["Aave V3 (Real)", "Rocket Pool (Mock)", "LIDO (Mock)"]
            },
            contracts: deployedContracts,
            aaveAddresses: AAVE_ADDRESSES,
            pythOracle: PYTH_ORACLE,
            deployer: deployer,
            explorerUrls: {}
        };

        // Generate explorer URLs
        Object.entries(deployedContracts).forEach(([name, address]) => {
            deploymentInfo.explorerUrls[name] = `https://sepolia.etherscan.io/address/${address}`;
        });

        fs.writeFileSync(
            "./deployment-multi-vault.json",
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Multi-Vault Deployment Complete!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        console.log("\n📦 Deployed Contracts:");
        console.log(`   VaultRouter: ${deployedContracts.VaultRouter}`);
        console.log(`   ├─ [0] Aave V3: ${deployedContracts.AaveV3Vault} ⭐ Active`);
        console.log(`   ├─ [1] Rocket Pool: ${deployedContracts.MockRocketPoolVault}`);
        console.log(`   └─ [2] LIDO: ${deployedContracts.MockStETHVault}`);
        console.log(`   MockPYUSD: ${deployedContracts.MockPYUSD}`);
        console.log(`   LoanNFT: ${deployedContracts.EthereumLoanNFT}`);
        console.log(`   StakedPYUSD: ${deployedContracts.StakedPYUSD}`);
        console.log(`   LendingPool: ${deployedContracts.EthereumLendingPool}`);

        console.log("\n💾 Deployment info saved to: deployment-multi-vault.json");

        console.log("\n🎯 Strategy Management:");
        console.log("   Current: Aave V3 (earning real yields!)");
        console.log("   Switch: Call vaultRouter.changeStrategy(0/1/2)");
        console.log("   Migrate: Call vaultRouter.migrateStrategy(from, to, amount)");

        console.log("\n📊 Next Steps:");
        console.log("   1. Supply PYUSD to the pool");
        console.log("   2. Borrow with ETH collateral");
        console.log("   3. ETH earns Aave V3 yields automatically");
        console.log("   4. Switch strategies anytime via VaultRouter");

        console.log("\n🔧 Management Commands:");
        console.log("   Check active strategy: npm run vault:status");
        console.log("   Switch to Rocket Pool: npm run vault:switch -- 1");
        console.log("   Switch to LIDO: npm run vault:switch -- 2");
        console.log("   Switch to Aave V3: npm run vault:switch -- 0");

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (error) {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
