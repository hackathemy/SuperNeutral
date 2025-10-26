import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Deploy Mock Aave System - Hardhat 3 Compatible
 * Uses artifact loading instead of getContractFactory
 */

async function loadArtifact(contractPath) {
    const artifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
}

async function deployContract(name, artifactPath, signer, constructorArgs = []) {
    console.log(`   Deploying ${name}...`);
    const { abi, bytecode } = await loadArtifact(artifactPath);
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    const contract = constructorArgs.length > 0
        ? await factory.deploy(...constructorArgs)
        : await factory.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`   ✅ ${name}:`, address);
    return { contract, address };
}

async function main() {
    console.log("\n🚀 Deploying Mock Aave System (Hardhat 3)...\n");

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const deployerAddress = await signer.getAddress();

    console.log("📋 Deployment Info:");
    console.log("   Deployer:", deployerAddress);
    console.log("   Balance:", ethers.formatEther(await provider.getBalance(deployerAddress)), "ETH");
    console.log("");

    const contracts = {};
    const deployed = {};

    // ==================== Deploy Mock Infrastructure ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Deploy Mock Infrastructure");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Deploy MockWETH
    const weth = await deployContract(
        "MockWETH",
        "./artifacts/contracts/mocks/MockWETH.sol/MockWETH.json",
        signer,
        []
    );
    contracts.WETH = weth.address;
    deployed.WETH = weth.contract;

    // Deploy MockAToken
    const aToken = await deployContract(
        "MockAToken",
        "./artifacts/contracts/mocks/MockAaveV3Pool.sol/MockAToken.json",
        signer,
        ["Aave Wrapped ETH", "aWETH"]
    );
    contracts.aWETH = aToken.address;
    deployed.aWETH = aToken.contract;

    // Deploy MockAaveV3Pool
    const aavePool = await deployContract(
        "MockAaveV3Pool",
        "./artifacts/contracts/mocks/MockAaveV3Pool.sol/MockAaveV3Pool.json",
        signer,
        [contracts.WETH, contracts.aWETH]
    );
    contracts.MockAaveV3Pool = aavePool.address;
    deployed.MockAaveV3Pool = aavePool.contract;

    // Deploy MockPYUSD
    const pyusd = await deployContract(
        "MockPYUSD",
        "./artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json",
        signer,
        []
    );
    contracts.PYUSD = pyusd.address;
    deployed.PYUSD = pyusd.contract;

    // Mint PYUSD
    const mintAmount = ethers.parseUnits("100000", 6);
    await deployed.PYUSD.mint(deployerAddress, mintAmount);
    console.log("   💰 Minted:", ethers.formatUnits(mintAmount, 6), "PYUSD\n");

    // ==================== Deploy Oracle ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Deploy Mock Oracle");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const oracle = await deployContract(
        "MockPythOracle",
        "./artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json",
        signer,
        []
    );
    contracts.MockPythOracle = oracle.address;
    deployed.MockPythOracle = oracle.contract;

    // Set prices
    const ethPrice = ethers.parseUnits("3000", 8);
    const pyusdPrice = ethers.parseUnits("1", 8);
    await deployed.MockPythOracle.updatePrice(
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
        ethPrice, ethers.parseUnits("2", 8), -8, Math.floor(Date.now() / 1000)
    );
    await deployed.MockPythOracle.updatePrice(
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722",
        pyusdPrice, ethers.parseUnits("0.01", 8), -8, Math.floor(Date.now() / 1000)
    );
    console.log("   💵 ETH: $3000, PYUSD: $1\n");

    // ==================== Deploy Core Contracts ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 3️⃣ : Deploy Core Contracts");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const stakedPYUSD = await deployContract(
        "StakedPYUSD",
        "./artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json",
        signer,
        []
    );
    contracts.StakedPYUSD = stakedPYUSD.address;
    deployed.StakedPYUSD = stakedPYUSD.contract;

    const loanNFT = await deployContract(
        "EthereumLoanNFT",
        "./artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json",
        signer,
        []
    );
    contracts.EthereumLoanNFT = loanNFT.address;
    deployed.EthereumLoanNFT = loanNFT.contract;

    const aaveVault = await deployContract(
        "TestableAaveV3Vault",
        "./artifacts/contracts/mocks/TestableAaveV3Vault.sol/TestableAaveV3Vault.json",
        signer,
        [contracts.MockAaveV3Pool, contracts.WETH, contracts.aWETH]
    );
    contracts.AaveV3Vault = aaveVault.address;
    deployed.AaveV3Vault = aaveVault.contract;

    const vaultRouter = await deployContract(
        "VaultRouter",
        "./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json",
        signer,
        [0]  // Strategy.AAVE_V3
    );
    contracts.VaultRouter = vaultRouter.address;
    deployed.VaultRouter = vaultRouter.contract;

    const shortRouter = await deployContract(
        "ShortPositionRouter",
        "./artifacts/contracts/ethereum/core/ShortPositionRouter.sol/ShortPositionRouter.json",
        signer,
        []  // No constructor arguments
    );
    contracts.ShortPositionRouter = shortRouter.address;
    deployed.ShortPositionRouter = shortRouter.contract;

    const lendingPool = await deployContract(
        "EthereumLendingPool",
        "./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
        signer,
        [contracts.PYUSD, contracts.EthereumLoanNFT, contracts.VaultRouter, contracts.ShortPositionRouter, contracts.MockPythOracle, contracts.StakedPYUSD]
    );
    contracts.EthereumLendingPool = lendingPool.address;
    deployed.EthereumLendingPool = lendingPool.contract;

    console.log("");

    // ==================== Setup ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 4️⃣ : Setup Authorizations");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await deployed.StakedPYUSD.setLendingPool(contracts.EthereumLendingPool);
    console.log("   ✅ StakedPYUSD ← LendingPool");

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await deployed.EthereumLoanNFT.grantRole(MINTER_ROLE, contracts.EthereumLendingPool);
    console.log("   ✅ LoanNFT ← LendingPool (MINTER)");

    await deployed.VaultRouter.registerVault(0, contracts.AaveV3Vault);  // 0 = Strategy.AAVE_V3
    await deployed.VaultRouter.changeStrategy(0);  // 0 = Strategy.AAVE_V3
    console.log("   ✅ VaultRouter ← AaveV3Vault");

    await deployed.AaveV3Vault.setAuthorizedCaller(contracts.VaultRouter, true);
    console.log("   ✅ AaveV3Vault ← VaultRouter");

    await deployed.VaultRouter.setAuthorizedCaller(contracts.EthereumLendingPool, true);
    console.log("   ✅ VaultRouter ← LendingPool\n");

    // ==================== Save ====================
    fs.writeFileSync(
        "./deployment-mock-aave.json",
        JSON.stringify({
            network: "localhost-mock",
            deployer: deployerAddress,
            timestamp: new Date().toISOString(),
            contracts
        }, null, 2)
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Deployment Complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📄 Saved to: deployment-mock-aave.json\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
