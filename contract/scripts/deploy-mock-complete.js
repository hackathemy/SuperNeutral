import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Deploy Complete System with Mock Oracle on Local Network
 * This allows testing the full flow without Aave V3 Sepolia limitations
 */

async function main() {
    console.log("\n🚀 Deploying Complete System with Mock Oracle...\n");

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const deployerAddress = await signer.getAddress();

    console.log("📋 Deployment Info:");
    console.log("   Network:", hre.network.name);
    console.log("   Deployer:", deployerAddress);
    console.log("   Balance:", ethers.formatEther(await provider.getBalance(deployerAddress)), "ETH");
    console.log("");

    const deployedContracts = {};

    // ==================== Step 1: Deploy Mock Tokens ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Deploy Mock Tokens");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Deploy Mock PYUSD
    console.log("   Deploying Mock PYUSD...");
    const MockERC20 = await hre.ethers.getContractFactory("MockPYUSD");
    const mockPYUSD = await MockERC20.deploy();
    await mockPYUSD.waitForDeployment();
    deployedContracts.PYUSD = await mockPYUSD.getAddress();
    console.log("   ✅ Mock PYUSD:", deployedContracts.PYUSD);

    // Mint PYUSD to deployer
    const mintAmount = ethers.parseUnits("100000", 6); // 100k PYUSD
    await mockPYUSD.mint(deployerAddress, mintAmount);
    console.log("   💰 Minted:", ethers.formatUnits(mintAmount, 6), "PYUSD to deployer");
    console.log("");

    // ==================== Step 2: Deploy Mock Oracle ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Deploy Mock Oracle");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("   Deploying MockPythOracle...");
    const MockPythOracle = await hre.ethers.getContractFactory("MockPythOracle");
    const mockOracle = await MockPythOracle.deploy();
    await mockOracle.waitForDeployment();
    deployedContracts.MockPythOracle = await mockOracle.getAddress();
    console.log("   ✅ Mock Oracle:", deployedContracts.MockPythOracle);

    // Set initial prices
    const ethPrice = ethers.parseUnits("3000", 8); // $3000
    const pyusdPrice = ethers.parseUnits("1", 8); // $1
    await mockOracle.updatePrice(
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD
        ethPrice,
        ethers.parseUnits("2", 8), // confidence
        -8, // expo
        Math.floor(Date.now() / 1000) // publishTime
    );
    await mockOracle.updatePrice(
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722", // PYUSD/USD
        pyusdPrice,
        ethers.parseUnits("0.01", 8),
        -8,
        Math.floor(Date.now() / 1000)
    );
    console.log("   💵 Set ETH price:", ethers.formatUnits(ethPrice, 8), "USD");
    console.log("   💵 Set PYUSD price:", ethers.formatUnits(pyusdPrice, 8), "USD");
    console.log("");

    // ==================== Step 3: Deploy Core Contracts ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 3️⃣ : Deploy Core Contracts");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Deploy Staked PYUSD
    console.log("   Deploying StakedPYUSD...");
    const StakedPYUSD = await hre.ethers.getContractFactory("StakedPYUSD");
    const stakedPYUSD = await StakedPYUSD.deploy(deployedContracts.PYUSD);
    await stakedPYUSD.waitForDeployment();
    deployedContracts.StakedPYUSD = await stakedPYUSD.getAddress();
    console.log("   ✅ StakedPYUSD:", deployedContracts.StakedPYUSD);

    // Deploy Loan NFT
    console.log("   Deploying EthereumLoanNFT...");
    const LoanNFT = await hre.ethers.getContractFactory("EthereumLoanNFT");
    const loanNFT = await LoanNFT.deploy();
    await loanNFT.waitForDeployment();
    deployedContracts.EthereumLoanNFT = await loanNFT.getAddress();
    console.log("   ✅ Loan NFT:", deployedContracts.EthereumLoanNFT);

    // Deploy VaultRouter
    console.log("   Deploying VaultRouter...");
    const VaultRouter = await hre.ethers.getContractFactory("VaultRouter");
    const vaultRouter = await VaultRouter.deploy();
    await vaultRouter.waitForDeployment();
    deployedContracts.VaultRouter = await vaultRouter.getAddress();
    console.log("   ✅ VaultRouter:", deployedContracts.VaultRouter);

    // Deploy MockVault (simple vault for testing)
    console.log("   Deploying MockVault...");
    const MockVault = await hre.ethers.getContractFactory("MockStETHVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    deployedContracts.MockVault = await mockVault.getAddress();
    console.log("   ✅ MockVault:", deployedContracts.MockVault);

    // Deploy ShortPositionRouter (placeholder)
    console.log("   Deploying ShortPositionRouter...");
    const ShortRouter = await hre.ethers.getContractFactory("ShortPositionRouter");
    const shortRouter = await ShortRouter.deploy();
    await shortRouter.waitForDeployment();
    deployedContracts.ShortPositionRouter = await shortRouter.getAddress();
    console.log("   ✅ ShortPositionRouter:", deployedContracts.ShortPositionRouter);

    // Deploy Lending Pool
    console.log("   Deploying EthereumLendingPool...");
    const LendingPool = await hre.ethers.getContractFactory("EthereumLendingPool");
    const lendingPool = await LendingPool.deploy(
        deployedContracts.PYUSD,
        deployedContracts.StakedPYUSD,
        deployedContracts.EthereumLoanNFT,
        deployedContracts.VaultRouter,
        deployedContracts.ShortPositionRouter,
        deployedContracts.MockPythOracle
    );
    await lendingPool.waitForDeployment();
    deployedContracts.EthereumLendingPool = await lendingPool.getAddress();
    console.log("   ✅ Lending Pool:", deployedContracts.EthereumLendingPool);
    console.log("");

    // ==================== Step 4: Setup Authorizations ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 4️⃣ : Setup Authorizations");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Authorize Lending Pool in StakedPYUSD
    console.log("   Authorizing LendingPool in StakedPYUSD...");
    await stakedPYUSD.setLendingPool(deployedContracts.EthereumLendingPool);
    console.log("   ✅ StakedPYUSD authorization complete");

    // Grant MINTER_ROLE to Lending Pool in Loan NFT
    console.log("   Granting MINTER_ROLE to LendingPool...");
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await loanNFT.grantRole(MINTER_ROLE, deployedContracts.EthereumLendingPool);
    console.log("   ✅ MINTER_ROLE granted");

    // Register vault in VaultRouter
    console.log("   Registering MockVault in VaultRouter...");
    await vaultRouter.registerVault("MOCK", deployedContracts.MockVault);
    await vaultRouter.setActiveStrategy("MOCK");
    console.log("   ✅ MockVault registered and activated");

    // Authorize VaultRouter in MockVault
    console.log("   Authorizing VaultRouter in MockVault...");
    await mockVault.setAuthorizedCaller(deployedContracts.VaultRouter, true);
    console.log("   ✅ VaultRouter authorized in MockVault");

    // Authorize LendingPool in VaultRouter
    console.log("   Authorizing LendingPool in VaultRouter...");
    await vaultRouter.setAuthorizedCaller(deployedContracts.EthereumLendingPool, true);
    console.log("   ✅ LendingPool authorized in VaultRouter");
    console.log("");

    // ==================== Step 5: Verification ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 5️⃣ : Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Verify authorizations
    const hasMinterRole = await loanNFT.hasRole(MINTER_ROLE, deployedContracts.EthereumLendingPool);
    const activeStrategy = await vaultRouter.activeStrategy();
    const isAuthorized = await vaultRouter.authorizedCallers(deployedContracts.EthereumLendingPool);

    console.log("   ✅ MINTER_ROLE granted:", hasMinterRole ? "Yes" : "No");
    console.log("   ✅ Active strategy:", activeStrategy);
    console.log("   ✅ LendingPool authorized:", isAuthorized ? "Yes" : "No");
    console.log("");

    // ==================== Save Deployment ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Saving Deployment Info");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const deployment = {
        network: hre.network.name,
        deployer: deployerAddress,
        timestamp: new Date().toISOString(),
        contracts: deployedContracts
    };

    fs.writeFileSync(
        "./deployment-mock-complete.json",
        JSON.stringify(deployment, null, 2)
    );

    console.log("   ✅ Deployment saved to deployment-mock-complete.json");
    console.log("");

    // ==================== Summary ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Deployment Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("Mock Tokens:");
    console.log(`   PYUSD: ${deployedContracts.PYUSD}`);
    console.log("");

    console.log("Oracle:");
    console.log(`   MockPythOracle: ${deployedContracts.MockPythOracle}`);
    console.log("");

    console.log("Core Contracts:");
    console.log(`   StakedPYUSD: ${deployedContracts.StakedPYUSD}`);
    console.log(`   LoanNFT: ${deployedContracts.EthereumLoanNFT}`);
    console.log(`   VaultRouter: ${deployedContracts.VaultRouter}`);
    console.log(`   MockVault: ${deployedContracts.MockVault}`);
    console.log(`   ShortRouter: ${deployedContracts.ShortPositionRouter}`);
    console.log(`   LendingPool: ${deployedContracts.EthereumLendingPool}`);
    console.log("");

    console.log("✅ Mock environment deployment complete!");
    console.log("💡 You can now run: npm run test:mock:full\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
