import hardhat from "hardhat";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const hre = hardhat;

/**
 * Deploy Lending Protocol on Sepolia with REAL Pyth Oracle
 *
 * Uses real Pyth Network oracle at: 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21
 */
async function main() {
    console.log("🚀 Starting Lending Protocol deployment on Sepolia with REAL Pyth Oracle...\n");

    // REAL contracts on Ethereum Sepolia
    const REAL_PYTH_ORACLE = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21";
    const OFFICIAL_PYUSD = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";

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
        console.log("\n📝 Deploying contracts...\n");

        // 1. Use REAL Pyth Oracle (already deployed)
        console.log("1️⃣ Using REAL Pyth Oracle on Sepolia:");
        console.log("   Address:", REAL_PYTH_ORACLE);
        console.log("   ✅ No deployment needed - using existing Pyth Network oracle");

        // 2. Use Official PYUSD (already deployed)
        console.log("\n2️⃣ Using Official PYUSD on Sepolia:");
        console.log("   Address:", OFFICIAL_PYUSD);
        console.log("   ✅ No deployment needed - using official PayPal USD");
        console.log("   Get testnet PYUSD from: https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd");
        const pyusdAddress = OFFICIAL_PYUSD;

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

        // 5. Deploy StakedPYUSD
        console.log("\n5️⃣ Deploying StakedPYUSD...");
        const spyusdArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json"), "utf8")
        );
        const spyusdFactory = new ethers.ContractFactory(spyusdArtifact.abi, spyusdArtifact.bytecode, signer);
        const stakedPYUSD = await spyusdFactory.deploy();
        await stakedPYUSD.waitForDeployment();
        const spyusdAddress = await stakedPYUSD.getAddress();
        console.log("✅ StakedPYUSD deployed to:", spyusdAddress);

        // 6. Deploy EthereumLendingPool with REAL Pyth Oracle
        console.log("\n6️⃣ Deploying EthereumLendingPool with REAL Pyth Oracle...");
        console.log("   Using Pyth Oracle:", REAL_PYTH_ORACLE);
        const poolArtifact = JSON.parse(
            readFileSync(join(process.cwd(), "artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json"), "utf8")
        );
        const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, signer);
        const lendingPool = await poolFactory.deploy(
            pyusdAddress,        // Mock PYUSD
            nftAddress,          // Loan NFT
            vaultAddress,        // Mock Vault
            REAL_PYTH_ORACLE,    // REAL Pyth Oracle
            spyusdAddress        // Staked PYUSD
        );
        await lendingPool.waitForDeployment();
        const poolAddress = await lendingPool.getAddress();
        console.log("✅ EthereumLendingPool deployed to:", poolAddress);

        // 7. Configure access control
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

        // Set lending pool address in StakedPYUSD
        const setPoolTx = await stakedPYUSD.setLendingPool(poolAddress);
        await setPoolTx.wait();
        console.log("✅ Set lending pool address in sPYUSD");

        // 8. Initial liquidity setup instructions
        console.log("\n💰 Initial Liquidity Setup:");
        console.log("   To supply PYUSD liquidity to the pool:");
        console.log("   1. Get testnet PYUSD from faucet:");
        console.log("      https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd");
        console.log("   2. Approve PYUSD for lending pool");
        console.log("   3. Call supplyPYUSD() on the lending pool");
        console.log("");

        // 9. Verify REAL Pyth Oracle prices
        console.log("\n📊 Verifying REAL Pyth Oracle prices...");
        console.log("⚠️  Note: Real Pyth requires price updates via Hermes API");
        console.log("   Get price updates from: https://hermes.pyth.network/");

        try {
            const ethPrice = await lendingPool.getETHPrice();
            console.log("✅ ETH Price (from REAL Pyth):", ethers.formatUnits(ethPrice, 8), "USD");
        } catch (e) {
            console.log("⚠️  Price may be stale. Update prices using:");
            console.log("   https://hermes.pyth.network/api/latest_vaas");
        }

        // Summary
        console.log("\n=================================");
        console.log("🎉 Sepolia Deployment Complete with REAL Pyth Oracle!");
        console.log("=================================");
        console.log("📋 Contract Addresses:");
        console.log("  🔴 REAL Pyth Oracle:", REAL_PYTH_ORACLE);
        console.log("     (Deployed by Pyth Network on Sepolia)");
        console.log("  🟢 Official PYUSD:", pyusdAddress);
        console.log("     (Official PayPal USD on Sepolia)");
        console.log("  EthereumLoanNFT:", nftAddress);
        console.log("  MockStETHVault:", vaultAddress);
        console.log("  StakedPYUSD:", spyusdAddress);
        console.log("  EthereumLendingPool:", poolAddress);
        console.log("=================================");
        console.log("\n📝 Price Feed IDs (Pyth Network):");
        console.log("  ETH/USD:", "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6");
        console.log("  PYUSD/USD:", "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722");
        console.log("=================================");
        console.log("\n✨ Features Enabled:");
        console.log("  ✅ Real-time market prices from Pyth Network");
        console.log("  ✅ Official PYUSD stablecoin (PayPal USD)");
        console.log("  ✅ Flash loan functionality (0.09% fee)");
        console.log("  ✅ Cross-chain compatible with Arbitrum Sepolia");
        console.log("  ✅ Decentralized oracle network");
        console.log("=================================");
        console.log("\n🔗 Useful Links:");
        console.log("  Pyth Hermes API:", "https://hermes.pyth.network/");
        console.log("  Pyth Docs:", "https://docs.pyth.network/");
        console.log("  Sepolia Explorer:", `https://sepolia.etherscan.io/address/${poolAddress}`);
        console.log("  Pyth Oracle:", `https://sepolia.etherscan.io/address/${REAL_PYTH_ORACLE}`);
        console.log("=================================");

        // Save deployment info
        const deployment = {
            network: "sepolia",
            timestamp: new Date().toISOString(),
            oracleType: "real-pyth",
            contracts: {
                PythOracle: REAL_PYTH_ORACLE,
                OfficialPYUSD: pyusdAddress,
                EthereumLoanNFT: nftAddress,
                MockStETHVault: vaultAddress,
                StakedPYUSD: spyusdAddress,
                EthereumLendingPool: poolAddress
            },
            deployer: signerAddress,
            priceFeedIds: {
                ethUsd: "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
                pyusdUsd: "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722"
            },
            faucets: {
                pyusd: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd",
                eth: "https://www.alchemy.com/faucets/ethereum-sepolia"
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
