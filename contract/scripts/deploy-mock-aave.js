import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Deploy Complete System with Mock Aave V3 Pool
 * Uses real AaveV3Vault but with mock Aave Pool to avoid Sepolia limitations
 */

async function main() {
    console.log("\n🚀 Deploying Complete System with Mock Aave...\n");

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

    // ==================== Step 1: Deploy Mock Infrastructure ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Deploy Mock Infrastructure");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Deploy Mock WETH
    console.log("   Deploying Mock WETH...");
    const MockWETH = await hre.ethers.getContractFactory("MockWETH");
    const mockWETH = await MockWETH.deploy();
    await mockWETH.waitForDeployment();
    deployedContracts.WETH = await mockWETH.getAddress();
    console.log("   ✅ Mock WETH:", deployedContracts.WETH);

    // Deploy Mock aToken first (needed for MockAaveV3Pool constructor)
    console.log("   Deploying Mock aWETH...");
    const MockAToken = await hre.ethers.getContractFactory("MockAToken");
    const mockAToken = await MockAToken.deploy("Aave Wrapped ETH", "aWETH");
    await mockAToken.waitForDeployment();
    deployedContracts.aWETH = await mockAToken.getAddress();
    console.log("   ✅ Mock aWETH:", deployedContracts.aWETH);

    // Deploy Mock Aave V3 Pool
    console.log("   Deploying Mock Aave V3 Pool...");
    const MockAavePool = await hre.ethers.getContractFactory("MockAaveV3Pool");
    const mockAavePool = await MockAavePool.deploy(deployedContracts.WETH, deployedContracts.aWETH);
    await mockAavePool.waitForDeployment();
    deployedContracts.MockAaveV3Pool = await mockAavePool.getAddress();
    console.log("   ✅ Mock Aave Pool:", deployedContracts.MockAaveV3Pool);

    // Deploy Mock PYUSD
    console.log("   Deploying Mock PYUSD...");
    const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
    const mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.waitForDeployment();
    deployedContracts.PYUSD = await mockPYUSD.getAddress();
    console.log("   ✅ Mock PYUSD:", deployedContracts.PYUSD);

    // Mint PYUSD to deployer
    const mintAmount = ethers.parseUnits("100000", 6); // 100k PYUSD
    await mockPYUSD.mint(deployerAddress, mintAmount);
    console.log("   💰 Minted:", ethers.formatUnits(mintAmount, 6), "PYUSD");
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
        ethers.parseUnits("2", 8),
        -8,
        Math.floor(Date.now() / 1000)
    );
    await mockOracle.updatePrice(
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722", // PYUSD/USD
        pyusdPrice,
        ethers.parseUnits("0.01", 8),
        -8,
        Math.floor(Date.now() / 1000)
    );
    console.log("   💵 ETH price:", ethers.formatUnits(ethPrice, 8), "USD");
    console.log("   💵 PYUSD price:", ethers.formatUnits(pyusdPrice, 8), "USD");
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

    // Deploy TestableAaveV3Vault (using mock Aave Pool)
    console.log("   Deploying TestableAaveV3Vault (with Mock Pool)...");
    const TestableAaveV3Vault = await hre.ethers.getContractFactory("TestableAaveV3Vault");
    const aaveVault = await TestableAaveV3Vault.deploy(
        deployedContracts.MockAaveV3Pool,
        deployedContracts.WETH,
        deployedContracts.aWETH
    );
    await aaveVault.waitForDeployment();
    deployedContracts.AaveV3Vault = await aaveVault.getAddress();
    console.log("   ✅ TestableAaveV3Vault:", deployedContracts.AaveV3Vault);

    // Deploy VaultRouter
    console.log("   Deploying VaultRouter...");
    const VaultRouter = await hre.ethers.getContractFactory("VaultRouter");
    const vaultRouter = await VaultRouter.deploy();
    await vaultRouter.waitForDeployment();
    deployedContracts.VaultRouter = await vaultRouter.getAddress();
    console.log("   ✅ VaultRouter:", deployedContracts.VaultRouter);

    // Deploy ShortPositionRouter (placeholder for now)
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
    console.log("Step 4️⃣ : Setup Authorizations & Connections");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Authorize Lending Pool in StakedPYUSD
    console.log("   StakedPYUSD ← LendingPool");
    await stakedPYUSD.setLendingPool(deployedContracts.EthereumLendingPool);
    console.log("   ✅ Authorized");

    // Grant MINTER_ROLE to Lending Pool
    console.log("   LoanNFT ← LendingPool (MINTER_ROLE)");
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await loanNFT.grantRole(MINTER_ROLE, deployedContracts.EthereumLendingPool);
    console.log("   ✅ Granted");

    // Register AaveV3Vault in VaultRouter
    console.log("   VaultRouter ← AaveV3Vault");
    await vaultRouter.registerVault("AAVE_V3", deployedContracts.AaveV3Vault);
    await vaultRouter.setActiveStrategy("AAVE_V3");
    console.log("   ✅ Registered & Activated");

    // Authorize VaultRouter in AaveV3Vault
    console.log("   AaveV3Vault ← VaultRouter");
    await aaveVault.setAuthorizedCaller(deployedContracts.VaultRouter, true);
    console.log("   ✅ Authorized");

    // Authorize LendingPool in VaultRouter
    console.log("   VaultRouter ← LendingPool");
    await vaultRouter.setAuthorizedCaller(deployedContracts.EthereumLendingPool, true);
    console.log("   ✅ Authorized");
    console.log("");

    // ==================== Step 5: Verification ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 5️⃣ : Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const hasMinterRole = await loanNFT.hasRole(MINTER_ROLE, deployedContracts.EthereumLendingPool);
    const activeStrategy = await vaultRouter.activeStrategy();
    const isLPAuthorized = await vaultRouter.authorizedCallers(deployedContracts.EthereumLendingPool);
    const isVRAuthorized = await aaveVault.authorizedCallers(deployedContracts.VaultRouter);

    console.log("   ✅ MINTER_ROLE:", hasMinterRole ? "Granted" : "Missing");
    console.log("   ✅ Active Strategy:", activeStrategy);
    console.log("   ✅ LendingPool → VaultRouter:", isLPAuthorized ? "Authorized" : "Not Authorized");
    console.log("   ✅ VaultRouter → AaveVault:", isVRAuthorized ? "Authorized" : "Not Authorized");
    console.log("");

    // ==================== Save Deployment ====================
    const deployment = {
        network: "localhost-mock",
        deployer: deployerAddress,
        timestamp: new Date().toISOString(),
        note: "Using REAL AaveV3Vault with Mock Aave V3 Pool",
        contracts: deployedContracts
    };

    fs.writeFileSync(
        "./deployment-mock-aave.json",
        JSON.stringify(deployment, null, 2)
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Deployment Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("Mock Infrastructure:");
    console.log(`   WETH: ${deployedContracts.WETH}`);
    console.log(`   aWETH: ${deployedContracts.aWETH}`);
    console.log(`   Aave Pool: ${deployedContracts.MockAaveV3Pool}`);
    console.log(`   PYUSD: ${deployedContracts.PYUSD}`);
    console.log(`   Oracle: ${deployedContracts.MockPythOracle}`);
    console.log("");

    console.log("Real Contracts:");
    console.log(`   AaveV3Vault: ${deployedContracts.AaveV3Vault}`);
    console.log(`   VaultRouter: ${deployedContracts.VaultRouter}`);
    console.log(`   StakedPYUSD: ${deployedContracts.StakedPYUSD}`);
    console.log(`   LoanNFT: ${deployedContracts.EthereumLoanNFT}`);
    console.log(`   ShortRouter: ${deployedContracts.ShortPositionRouter}`);
    console.log(`   LendingPool: ${deployedContracts.EthereumLendingPool}`);
    console.log("");

    console.log("✅ Deployment saved to: deployment-mock-aave.json");
    console.log("✅ Mock Aave environment ready!");
    console.log("💡 Run: npm run test:mock:full\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
