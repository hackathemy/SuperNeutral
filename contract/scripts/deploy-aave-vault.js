import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Deploy Lending Pool with Real Aave V3 Vault on Sepolia
 *
 * This script deploys:
 * 1. AaveV3Vault - Real yield-generating vault using Aave V3
 * 2. EthereumLendingPool - Updated to use AaveV3Vault
 * 3. Other necessary contracts
 */

async function main() {
    console.log("\n🚀 Deploying Lending Pool with Aave V3 Vault...\n");

    // Aave V3 Sepolia addresses (verified from BGD Labs)
    const AAVE_ADDRESSES = {
        pool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
        weth: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
        aWETH: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830"
    };

    // Real Pyth Oracle on Sepolia
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
    console.log("\n🏦 Aave V3 Addresses:");
    console.log("   Pool:", AAVE_ADDRESSES.pool);
    console.log("   WETH:", AAVE_ADDRESSES.weth);
    console.log("   aWETH:", AAVE_ADDRESSES.aWETH);
    console.log("\n🔮 Oracle:");
    console.log("   Pyth:", PYTH_ORACLE);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check deployer balance
    const balance = await provider.getBalance(deployer);
    console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance < ethers.parseEther("0.1")) {
        console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
        console.log("   Get Sepolia ETH: https://www.alchemy.com/faucets/ethereum-sepolia\n");
    }

    const deployedContracts = {};

    try {
        // 1. Deploy Mock PYUSD (or use existing)
        console.log("1️⃣  Deploying Mock PYUSD...");
        const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
        const mockPYUSD = await MockPYUSD.connect(signer).deploy();
        await mockPYUSD.waitForDeployment();
        const pyusdAddress = await mockPYUSD.getAddress();
        deployedContracts.MockPYUSD = pyusdAddress;
        console.log("   ✅ MockPYUSD deployed:", pyusdAddress);

        // 2. Deploy Loan NFT
        console.log("\n2️⃣  Deploying Loan NFT...");
        const EthereumLoanNFT = await hre.ethers.getContractFactory("EthereumLoanNFT");
        const loanNFT = await EthereumLoanNFT.connect(signer).deploy();
        await loanNFT.waitForDeployment();
        const loanNFTAddress = await loanNFT.getAddress();
        deployedContracts.EthereumLoanNFT = loanNFTAddress;
        console.log("   ✅ EthereumLoanNFT deployed:", loanNFTAddress);

        // 3. Deploy Aave V3 Vault
        console.log("\n3️⃣  Deploying Aave V3 Vault...");
        const AaveV3Vault = await hre.ethers.getContractFactory("AaveV3Vault");
        const aaveVault = await AaveV3Vault.connect(signer).deploy(
            AAVE_ADDRESSES.weth,
            AAVE_ADDRESSES.aWETH
        );
        await aaveVault.waitForDeployment();
        const vaultAddress = await aaveVault.getAddress();
        deployedContracts.AaveV3Vault = vaultAddress;
        console.log("   ✅ AaveV3Vault deployed:", vaultAddress);

        // 4. Deploy Staked PYUSD
        console.log("\n4️⃣  Deploying Staked PYUSD...");
        const StakedPYUSD = await hre.ethers.getContractFactory("StakedPYUSD");
        const stakedPYUSD = await StakedPYUSD.connect(signer).deploy(pyusdAddress);
        await stakedPYUSD.waitForDeployment();
        const stakedPYUSDAddress = await stakedPYUSD.getAddress();
        deployedContracts.StakedPYUSD = stakedPYUSDAddress;
        console.log("   ✅ StakedPYUSD deployed:", stakedPYUSDAddress);

        // 5. Deploy Lending Pool
        console.log("\n5️⃣  Deploying Lending Pool...");
        const EthereumLendingPool = await hre.ethers.getContractFactory("EthereumLendingPool");
        const lendingPool = await EthereumLendingPool.connect(signer).deploy(
            pyusdAddress,
            loanNFTAddress,
            vaultAddress,
            PYTH_ORACLE,
            stakedPYUSDAddress
        );
        await lendingPool.waitForDeployment();
        const lendingPoolAddress = await lendingPool.getAddress();
        deployedContracts.EthereumLendingPool = lendingPoolAddress;
        console.log("   ✅ EthereumLendingPool deployed:", lendingPoolAddress);

        // 6. Set up authorizations
        console.log("\n6️⃣  Setting up authorizations...");

        // Authorize LendingPool to mint/burn NFTs
        const tx1 = await loanNFT.setAuthorizedMinter(lendingPoolAddress, true);
        await tx1.wait();
        console.log("   ✅ LoanNFT authorized for LendingPool");

        // Authorize LendingPool to call Vault
        const tx2 = await aaveVault.setAuthorizedCaller(lendingPoolAddress, true);
        await tx2.wait();
        console.log("   ✅ Vault authorized for LendingPool");

        // Authorize LendingPool to mint/burn StakedPYUSD
        const tx3 = await stakedPYUSD.setLendingPool(lendingPoolAddress);
        await tx3.wait();
        console.log("   ✅ StakedPYUSD authorized for LendingPool");

        // 7. Initial PYUSD supply (for testing)
        console.log("\n7️⃣  Minting test PYUSD...");
        const mintAmount = ethers.parseUnits("100000", 6); // 100,000 PYUSD
        const tx4 = await mockPYUSD.mint(deployer, mintAmount);
        await tx4.wait();
        console.log(`   ✅ Minted ${ethers.formatUnits(mintAmount, 6)} PYUSD to deployer`);

        // Save deployment info
        const deploymentInfo = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            contracts: deployedContracts,
            aaveAddresses: AAVE_ADDRESSES,
            pythOracle: PYTH_ORACLE,
            deployer: deployer,
            explorerUrls: {
                MockPYUSD: `https://sepolia.etherscan.io/address/${deployedContracts.MockPYUSD}`,
                EthereumLoanNFT: `https://sepolia.etherscan.io/address/${deployedContracts.EthereumLoanNFT}`,
                AaveV3Vault: `https://sepolia.etherscan.io/address/${deployedContracts.AaveV3Vault}`,
                StakedPYUSD: `https://sepolia.etherscan.io/address/${deployedContracts.StakedPYUSD}`,
                EthereumLendingPool: `https://sepolia.etherscan.io/address/${deployedContracts.EthereumLendingPool}`
            }
        };

        fs.writeFileSync(
            "./deployment-aave-vault.json",
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Deployment Complete!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("\n📋 Deployed Contracts:");
        console.log(`   MockPYUSD: ${deployedContracts.MockPYUSD}`);
        console.log(`   LoanNFT: ${deployedContracts.EthereumLoanNFT}`);
        console.log(`   AaveV3Vault: ${deployedContracts.AaveV3Vault}`);
        console.log(`   StakedPYUSD: ${deployedContracts.StakedPYUSD}`);
        console.log(`   LendingPool: ${deployedContracts.EthereumLendingPool}`);

        console.log("\n🔗 Explorer Links:");
        Object.entries(deploymentInfo.explorerUrls).forEach(([name, url]) => {
            console.log(`   ${name}: ${url}`);
        });

        console.log("\n💾 Deployment info saved to: deployment-aave-vault.json");

        console.log("\n🎯 Next Steps:");
        console.log("   1. Approve PYUSD spending for LendingPool");
        console.log("   2. Supply PYUSD to the pool");
        console.log("   3. Borrow against ETH collateral");
        console.log("   4. ETH will be deposited to Aave V3 earning real yield!");
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
