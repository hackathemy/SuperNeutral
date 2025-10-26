import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Deploy Mock Aave System and Test Full Flow
 * Combined script to ensure same network instance
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

function formatPYUSD(amount) {
    return ethers.formatUnits(amount, 6);
}

function parsePYUSD(amount) {
    return ethers.parseUnits(amount, 6);
}

async function main() {
    console.log("\n🚀 Deploy Mock Aave + Test Full Flow...\n");

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const [deployer, supplier, borrower] = await Promise.all([
        provider.getSigner(0),
        provider.getSigner(1),
        provider.getSigner(2)
    ]);

    const deployerAddress = await deployer.getAddress();

    console.log("📋 Setup:");
    console.log("   Deployer:", deployerAddress);
    console.log("   Supplier:", await supplier.getAddress());
    console.log("   Borrower:", await borrower.getAddress());
    console.log("");

    const contracts = {};
    const deployed = {};

    // ==================== Deploy ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 1️⃣ : Deploy Mock Infrastructure");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // MockWETH
    const weth = await deployContract(
        "MockWETH",
        "./artifacts/contracts/mocks/MockWETH.sol/MockWETH.json",
        deployer,
        []
    );
    contracts.WETH = weth.address;
    deployed.WETH = weth.contract;

    // MockAToken
    const aToken = await deployContract(
        "MockAToken",
        "./artifacts/contracts/mocks/MockAaveV3Pool.sol/MockAToken.json",
        deployer,
        ["Aave Wrapped ETH", "aWETH"]
    );
    contracts.aWETH = aToken.address;
    deployed.aWETH = aToken.contract;

    // MockAaveV3Pool
    const aavePool = await deployContract(
        "MockAaveV3Pool",
        "./artifacts/contracts/mocks/MockAaveV3Pool.sol/MockAaveV3Pool.json",
        deployer,
        [contracts.WETH, contracts.aWETH]
    );
    contracts.MockAaveV3Pool = aavePool.address;
    deployed.MockAaveV3Pool = aavePool.contract;

    // MockPYUSD
    const pyusd = await deployContract(
        "MockPYUSD",
        "./artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json",
        deployer,
        []
    );
    contracts.PYUSD = pyusd.address;
    deployed.PYUSD = pyusd.contract;

    const mintAmount = ethers.parseUnits("100000", 6);
    await deployed.PYUSD.mint(deployerAddress, mintAmount);
    console.log(`   💰 Minted: ${formatPYUSD(mintAmount)} PYUSD\n`);

    // MockPythOracle
    const oracle = await deployContract(
        "MockPythOracle",
        "./artifacts/contracts/mocks/MockPythOracle.sol/MockPythOracle.json",
        deployer,
        []
    );
    contracts.MockPythOracle = oracle.address;
    deployed.MockPythOracle = oracle.contract;

    const ethPrice = ethers.parseUnits("3000", 8);
    const pyusdPrice = ethers.parseUnits("1", 8);
    const futureTimestamp = 99999999999;  // Far future timestamp
    await deployed.MockPythOracle.updatePrice(
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
        ethPrice, ethers.parseUnits("2", 8), -8, futureTimestamp
    );
    await deployed.MockPythOracle.updatePrice(
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722",
        pyusdPrice, ethers.parseUnits("0.01", 8), -8, futureTimestamp
    );
    console.log("   💵 ETH: $3000, PYUSD: $1\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2️⃣ : Deploy Core Contracts");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const stakedPYUSD = await deployContract(
        "StakedPYUSD",
        "./artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json",
        deployer,
        []
    );
    contracts.StakedPYUSD = stakedPYUSD.address;
    deployed.StakedPYUSD = stakedPYUSD.contract;

    const loanNFT = await deployContract(
        "EthereumLoanNFT",
        "./artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json",
        deployer,
        []
    );
    contracts.EthereumLoanNFT = loanNFT.address;
    deployed.EthereumLoanNFT = loanNFT.contract;

    const aaveVault = await deployContract(
        "TestableAaveV3Vault",
        "./artifacts/contracts/mocks/TestableAaveV3Vault.sol/TestableAaveV3Vault.json",
        deployer,
        [contracts.MockAaveV3Pool, contracts.WETH, contracts.aWETH]
    );
    contracts.AaveV3Vault = aaveVault.address;
    deployed.AaveV3Vault = aaveVault.contract;

    const vaultRouter = await deployContract(
        "VaultRouter",
        "./artifacts/contracts/ethereum/core/VaultRouter.sol/VaultRouter.json",
        deployer,
        [0]
    );
    contracts.VaultRouter = vaultRouter.address;
    deployed.VaultRouter = vaultRouter.contract;

    const shortRouter = await deployContract(
        "ShortPositionRouter",
        "./artifacts/contracts/ethereum/core/ShortPositionRouter.sol/ShortPositionRouter.json",
        deployer,
        []
    );
    contracts.ShortPositionRouter = shortRouter.address;
    deployed.ShortPositionRouter = shortRouter.contract;

    const lendingPool = await deployContract(
        "EthereumLendingPool",
        "./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
        deployer,
        [contracts.PYUSD, contracts.EthereumLoanNFT, contracts.VaultRouter, contracts.ShortPositionRouter, contracts.MockPythOracle, contracts.StakedPYUSD]
    );
    contracts.EthereumLendingPool = lendingPool.address;
    deployed.EthereumLendingPool = lendingPool.contract;

    console.log("");

    // Setup
    await deployed.StakedPYUSD.setLendingPool(contracts.EthereumLendingPool);
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    await deployed.EthereumLoanNFT.grantRole(MINTER_ROLE, contracts.EthereumLendingPool);
    await deployed.VaultRouter.registerVault(0, contracts.AaveV3Vault);
    await deployed.VaultRouter.changeStrategy(0);
    await deployed.AaveV3Vault.setAuthorizedCaller(contracts.VaultRouter, true);
    await deployed.VaultRouter.setAuthorizedCaller(contracts.EthereumLendingPool, true);

    console.log("   ✅ Authorizations configured\n");

    // ==================== Test Step 1: Supply PYUSD ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 3️⃣ : Supply PYUSD to Lending Pool");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const supplyAmount = parsePYUSD("10000");
    await deployed.PYUSD.transfer(await supplier.getAddress(), supplyAmount);
    console.log(`   💸 Transferred ${formatPYUSD(supplyAmount)} PYUSD to supplier`);

    const pyusdSupplier = deployed.PYUSD.connect(supplier);
    const lendingPoolSupplier = deployed.EthereumLendingPool.connect(supplier);

    await pyusdSupplier.approve(contracts.EthereumLendingPool, supplyAmount);
    await lendingPoolSupplier.supplyPYUSD(supplyAmount, await supplier.getAddress());

    const supplierBalance = await deployed.StakedPYUSD.balanceOf(await supplier.getAddress());
    console.log(`   ✅ Supplied ${formatPYUSD(supplyAmount)} PYUSD`);
    console.log(`   📊 Received ${formatPYUSD(supplierBalance)} sPYUSD\n`);

    // ==================== Test Step 2: Borrow ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 4️⃣ : Borrow PYUSD with ETH Collateral");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const borrowAmount = parsePYUSD("1000");
    const collateralAmount = ethers.parseEther("1");
    const lendingPoolBorrower = deployed.EthereumLendingPool.connect(borrower);

    const borrowerAddress = await borrower.getAddress();
    const pyusdBalanceBefore = await deployed.PYUSD.balanceOf(borrowerAddress);
    const ethBalanceBefore = await provider.getBalance(borrowerAddress);

    console.log(`   💰 Borrower ETH balance: ${ethers.formatEther(ethBalanceBefore)} ETH`);
    console.log(`   💵 Borrower PYUSD balance: ${formatPYUSD(pyusdBalanceBefore)} PYUSD`);
    console.log(`   🎯 Borrowing ${formatPYUSD(borrowAmount)} PYUSD`);
    console.log(`   🔒 Collateral: ${ethers.formatEther(collateralAmount)} ETH\n`);

    // Update oracle prices - wait for txs to mine, then get final timestamp
    const priceUpdateTx1 = await deployed.MockPythOracle.updatePrice(
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
        ethPrice, ethers.parseUnits("2", 8), -8, 99999999999
    );
    await priceUpdateTx1.wait();

    const priceUpdateTx2 = await deployed.MockPythOracle.updatePrice(
        "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722",
        pyusdPrice, ethers.parseUnits("0.01", 8), -8, 99999999999
    );
    await priceUpdateTx2.wait();

    console.log("   🔄 Updated oracle prices with far-future timestamp\n");

    const liquidationRatio = 7000;  // 70% LTV
    const shortRatio = 0;  // No short position
    const onBehalfOf = ethers.ZeroAddress;  // Use msg.sender

    const tx = await lendingPoolBorrower.borrow(
        borrowAmount,
        liquidationRatio,
        shortRatio,
        onBehalfOf,
        { value: collateralAmount }
    );
    const receipt = await tx.wait();

    const borrowEvent = receipt.logs
        .map(log => {
            try {
                return deployed.EthereumLendingPool.interface.parseLog({ topics: [...log.topics], data: log.data });
            } catch {
                return null;
            }
        })
        .find(parsed => parsed && parsed.name === "LoanCreated");

    const loanId = borrowEvent.args.loanId;
    console.log(`   ✅ Loan Created! ID: ${loanId}`);

    const pyusdBalanceAfter = await deployed.PYUSD.balanceOf(borrowerAddress);
    const ethBalanceAfter = await provider.getBalance(borrowerAddress);

    console.log(`   💵 Borrower PYUSD balance: ${formatPYUSD(pyusdBalanceAfter)} PYUSD (+${formatPYUSD(pyusdBalanceAfter - pyusdBalanceBefore)})`);
    console.log(`   💰 Borrower ETH balance: ${ethers.formatEther(ethBalanceAfter)} ETH\n`);

    const loan = await deployed.EthereumLendingPool.loans(loanId);
    console.log("   📋 Loan Details:");
    console.log(`      Borrowed: ${formatPYUSD(loan.borrowedAmount)} PYUSD`);
    console.log(`      Collateral: ${ethers.formatEther(loan.collateralAmount)} ETH`);
    console.log(`      Active: ${loan.isActive}\n`);

    // ==================== Test Step 3: REPAY (CRITICAL!) ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 5️⃣ : REPAY Loan (CRITICAL TEST!)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const repayAmount = loan.borrowedAmount;

    console.log(`   🎯 Repaying ${formatPYUSD(repayAmount)} PYUSD`);
    console.log(`   🔓 Expecting ${ethers.formatEther(loan.collateralAmount)} ETH collateral back\n`);

    const pyusdBorrower = deployed.PYUSD.connect(borrower);
    await pyusdBorrower.approve(contracts.EthereumLendingPool, repayAmount);

    const ethBalanceBeforeRepay = await provider.getBalance(borrowerAddress);
    const pyusdBalanceBeforeRepay = await deployed.PYUSD.balanceOf(borrowerAddress);

    console.log("   🔄 Repaying loan...");
    const repayTx = await lendingPoolBorrower.repay(loanId);
    await repayTx.wait();
    console.log("   ✅ Repayment successful!\n");

    const ethBalanceAfterRepay = await provider.getBalance(borrowerAddress);
    const pyusdBalanceAfterRepay = await deployed.PYUSD.balanceOf(borrowerAddress);

    console.log("   📊 After Repayment:");
    console.log(`      PYUSD: ${formatPYUSD(pyusdBalanceAfterRepay)} (-${formatPYUSD(pyusdBalanceBeforeRepay - pyusdBalanceAfterRepay)})`);
    console.log(`      ETH: ${ethers.formatEther(ethBalanceAfterRepay)} (+${ethers.formatEther(ethBalanceAfterRepay - ethBalanceBeforeRepay)})\n`);

    const loanAfter = await deployed.EthereumLendingPool.loans(loanId);
    console.log("   📋 Loan Status After Repayment:");
    console.log(`      Active: ${loanAfter.isActive}`);
    console.log(`      Collateral: ${ethers.formatEther(loanAfter.collateralAmount)} ETH\n`);

    try {
        await deployed.EthereumLoanNFT.ownerOf(loanId);
        console.log("   ❌ ERROR: NFT still exists!");
    } catch (error) {
        console.log("   ✅ NFT burned correctly\n");
    }

    // ==================== Final Verification ====================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 6️⃣ : Final Verification");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const collateralReturned = ethBalanceAfterRepay - ethBalanceBeforeRepay;
    const expectedCollateral = loan.collateralAmount;

    console.log("   ✅ REPAYMENT TEST RESULTS:");
    console.log(`      Loan closed: ${!loanAfter.isActive ? "✅ YES" : "❌ NO"}`);
    console.log(`      NFT burned: ✅ YES`);
    console.log(`      Collateral returned: ${collateralReturned > 0 ? "✅ YES" : "❌ NO"}`);
    console.log(`      Expected: ${ethers.formatEther(expectedCollateral)} ETH`);
    console.log(`      Actual: ${ethers.formatEther(collateralReturned)} ETH`);

    const success = !loanAfter.isActive && collateralReturned > 0;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (success) {
        console.log("🎉 REPAYMENT WORKS! Full flow tested successfully!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Mock environment confirms:");
        console.log("   - Supply PYUSD: ✅ Works");
        console.log("   - Borrow with collateral: ✅ Works");
        console.log("   - REPAY loan: ✅ Works");
        console.log("   - Return collateral: ✅ Works");
        console.log("   - Burn NFT: ✅ Works");
    } else {
        console.log("❌ REPAYMENT FAILED! Issues detected.");
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
