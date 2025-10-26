import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Check Long/Short Positions in Lending Pool
 *
 * This script analyzes all active loans and calculates:
 * - Total collateral deposited (ETH)
 * - Total PYUSD borrowed
 * - Long positions (100% - short ratio)
 * - Short positions (short ratio)
 * - Average long/short distribution
 */

async function main() {
    console.log("\n🔍 Checking Long/Short Positions...\n");

    // Load deployment info
    const deploymentPath = "./deployment-sepolia.json";
    if (!fs.existsSync(deploymentPath)) {
        throw new Error("Deployment file not found. Please deploy contracts first.");
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const lendingPoolAddress = deployment.contracts.EthereumLendingPool;

    console.log("📋 Contract Address:", lendingPoolAddress);
    console.log("🌐 Network: Sepolia Testnet\n");

    // Connect to network
    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);

    // Load contract ABI
    const artifactPath = "./artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json";
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Create contract instance
    const lendingPool = new ethers.Contract(
        lendingPoolAddress,
        artifact.abi,
        provider
    );

    // Get pool statistics
    console.log("📊 Pool Statistics:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const totalSupplied = await lendingPool.getTotalSupply();
    const totalBorrowed = await lendingPool.getTotalBorrowed();
    const totalETHCollateral = await lendingPool.totalETHCollateral();
    const utilizationRate = await lendingPool.getUtilizationRate();

    console.log(`💰 Total PYUSD Supplied: ${ethers.formatUnits(totalSupplied, 6)} PYUSD`);
    console.log(`💸 Total PYUSD Borrowed: ${ethers.formatUnits(totalBorrowed, 6)} PYUSD`);
    console.log(`🔒 Total ETH Collateral: ${ethers.formatEther(totalETHCollateral)} ETH`);
    console.log(`📈 Utilization Rate: ${(Number(utilizationRate) / 100).toFixed(2)}%\n`);

    // Get ETH price (with error handling)
    let ethPriceUSD = 0;
    try {
        const ethPrice = await lendingPool.getETHPrice();
        ethPriceUSD = Number(ethers.formatEther(ethPrice));
        console.log(`💵 ETH Price: $${ethPriceUSD.toFixed(2)}
`);
    } catch (error) {
        console.log(`⚠️  ETH Price: Unable to fetch (oracle price may be stale)`);
        console.log(`   Run 'npm run oracle:update' to update prices
`);
        // Use a default price for calculation purposes (approximate current ETH price)
        ethPriceUSD = 3900; // Default fallback price
        console.log(`   Using fallback price: $${ethPriceUSD.toFixed(2)} for calculations
`);
    }

    // Check active loans
    console.log("🏦 Active Loans Analysis:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let activeLoans = [];
    let totalLongValue = 0n;
    let totalShortValue = 0n;
    let totalCollateralValue = 0n;

    // Try to get loans from tokenId 1 to 100 (adjust range as needed)
    for (let tokenId = 1; tokenId <= 100; tokenId++) {
        try {
            const loan = await lendingPool.getLoan(tokenId);

            // Check if loan is active
            if (loan.isActive) {
                const collateralETH = ethers.formatEther(loan.collateralAmount);
                const borrowedPYUSD = ethers.formatUnits(loan.borrowAmount, 6);
                const shortRatio = Number(loan.shortPositionRatio);
                const longRatio = 10000 - shortRatio; // BASIS_POINTS = 10000

                // Calculate values
                const collateralValueUSD = (Number(loan.collateralAmount) * ethPriceUSD) / 1e18;
                const longValue = (collateralValueUSD * longRatio) / 10000;
                const shortValue = (collateralValueUSD * shortRatio) / 10000;

                totalCollateralValue += loan.collateralAmount;
                totalLongValue += BigInt(Math.floor(longValue * 1e18));
                totalShortValue += BigInt(Math.floor(shortValue * 1e18));

                activeLoans.push({
                    tokenId,
                    borrower: loan.borrower,
                    collateralETH,
                    collateralValueUSD,
                    borrowedPYUSD,
                    longRatio: (longRatio / 100).toFixed(2),
                    shortRatio: (shortRatio / 100).toFixed(2),
                    longValue,
                    shortValue,
                    liquidationRatio: (Number(loan.liquidationRatio) / 100).toFixed(2),
                    healthFactor: ethers.formatEther(await lendingPool.getHealthFactor(tokenId))
                });

                console.log(`\n📝 Loan #${tokenId}:`);
                console.log(`   👤 Borrower: ${loan.borrower.slice(0, 6)}...${loan.borrower.slice(-4)}`);
                console.log(`   🔒 Collateral: ${collateralETH} ETH ($${collateralValueUSD.toFixed(2)})`);
                console.log(`   💸 Borrowed: ${borrowedPYUSD} PYUSD`);
                console.log(`   📊 Long Ratio: ${(longRatio / 100).toFixed(2)}%`);
                console.log(`   📉 Short Ratio: ${(shortRatio / 100).toFixed(2)}%`);
                console.log(`   💰 Long Value: $${longValue.toFixed(2)}`);
                console.log(`   🔻 Short Value: $${shortValue.toFixed(2)}`);
                console.log(`   ⚖️  Liquidation Ratio: ${(Number(loan.liquidationRatio) / 100).toFixed(2)}%`);
                console.log(`   ❤️  Health Factor: ${ethers.formatEther(await lendingPool.getHealthFactor(tokenId))}`);
            }
        } catch (error) {
            // Loan doesn't exist or error occurred, skip
            if (!error.message.includes("Loan does not exist")) {
                // Only break if we hit consecutive non-existent loans
                break;
            }
        }
    }

    console.log("\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Overall Long/Short Distribution:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (activeLoans.length === 0) {
        console.log("⚠️  No active loans found in the system.");
    } else {
        const totalValueUSD = Number(ethers.formatEther(totalCollateralValue)) * ethPriceUSD;
        const longValueUSD = Number(ethers.formatEther(totalLongValue));
        const shortValueUSD = Number(ethers.formatEther(totalShortValue));

        const longPercentage = totalValueUSD > 0 ? (longValueUSD / totalValueUSD) * 100 : 0;
        const shortPercentage = totalValueUSD > 0 ? (shortValueUSD / totalValueUSD) * 100 : 0;

        console.log(`\n📊 Total Active Loans: ${activeLoans.length}`);
        console.log(`💰 Total Collateral Value: $${totalValueUSD.toFixed(2)}`);
        console.log(`\n📈 Long Positions:`);
        console.log(`   Value: $${longValueUSD.toFixed(2)}`);
        console.log(`   Percentage: ${longPercentage.toFixed(2)}%`);
        console.log(`\n📉 Short Positions:`);
        console.log(`   Value: $${shortValueUSD.toFixed(2)}`);
        console.log(`   Percentage: ${shortPercentage.toFixed(2)}%`);

        // Calculate average ratios
        const avgLongRatio = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.longRatio), 0) / activeLoans.length;
        const avgShortRatio = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.shortRatio), 0) / activeLoans.length;

        console.log(`\n📊 Average Ratios:`);
        console.log(`   Long: ${avgLongRatio.toFixed(2)}%`);
        console.log(`   Short: ${avgShortRatio.toFixed(2)}%`);

        // Risk analysis
        console.log(`\n⚠️  Risk Analysis:`);
        const liquidatableLoans = activeLoans.filter(loan => parseFloat(loan.healthFactor) < 1);
        console.log(`   💀 Liquidatable Loans: ${liquidatableLoans.length}`);
        console.log(`   ✅ Healthy Loans: ${activeLoans.length - liquidatableLoans.length}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
