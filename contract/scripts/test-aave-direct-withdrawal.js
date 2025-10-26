import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Test Direct Aave V3 Withdrawal
 * Bypass our vault to see if Aave itself works
 */

async function main() {
    console.log("\n🧪 Testing Direct Aave V3 Withdrawal...\\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Aave V3 Sepolia addresses
    const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
    const WETH = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";  // Sepolia WETH
    const aWETH = "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830";  // Sepolia aWETH

    // ABIs
    const aavePoolAbi = [
        "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
        "function withdraw(address asset, uint256 amount, address to) external returns (uint256)"
    ];
    const wethAbi = [
        "function deposit() external payable",
        "function withdraw(uint256) external",
        "function approve(address, uint256) external returns (bool)",
        "function balanceOf(address) external view returns (uint256)"
    ];
    const aTokenAbi = [
        "function balanceOf(address) external view returns (uint256)"
    ];

    const aavePool = new ethers.Contract(AAVE_POOL, aavePoolAbi, signer);
    const weth = new ethers.Contract(WETH, wethAbi, signer);
    const aWETHContract = new ethers.Contract(aWETH, aTokenAbi, provider);

    console.log("📋 Setup:");
    console.log("   User:", userAddress);
    console.log("   Aave Pool:", AAVE_POOL);
    console.log("   WETH:", WETH);
    console.log("   aWETH:", aWETH);
    console.log("");

    // Check current aWETH balance
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Current Balance");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const aWETHBalance = await aWETHContract.balanceOf(userAddress);
    console.log("User aWETH balance:", ethers.formatEther(aWETHBalance), "aWETH");

    if (aWETHBalance === BigInt(0)) {
        console.log("\\n💡 No aWETH balance. Let's deposit some first...\\n");

        // Deposit ETH to get aWETH
        const depositAmount = ethers.parseEther("0.01");

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Step 1: Deposit to Aave");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        try {
            console.log(`   Wrapping ${ethers.formatEther(depositAmount)} ETH to WETH...`);
            const wrapTx = await weth.deposit({ value: depositAmount });
            await wrapTx.wait();
            console.log("   ✅ Wrapped to WETH\n");

            console.log("   Approving WETH for Aave...");
            const approveTx = await weth.approve(AAVE_POOL, depositAmount);
            await approveTx.wait();
            console.log("   ✅ Approved\n");

            console.log("   Supplying to Aave...");
            const supplyTx = await aavePool.supply(WETH, depositAmount, userAddress, 0);
            await supplyTx.wait();
            console.log("   ✅ Supplied\n");

            const newBalance = await aWETHContract.balanceOf(userAddress);
            console.log("   New aWETH balance:", ethers.formatEther(newBalance), "aWETH\n");
        } catch (e) {
            console.log("   ❌ Deposit failed:", e.message);
            return;
        }
    }

    // Now try to withdraw
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Step 2: Withdraw from Aave");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const currentBalance = await aWETHContract.balanceOf(userAddress);
    const withdrawAmount = currentBalance / BigInt(2);  // Withdraw half

    console.log(`   Attempting to withdraw ${ethers.formatEther(withdrawAmount)} WETH...`);
    console.log("");

    try {
        // Try static call first
        console.log("   Testing with staticCall...");
        await aavePool.withdraw.staticCall(WETH, withdrawAmount, userAddress);
        console.log("   ✅ Static call succeeded\n");

        // Actual withdrawal
        console.log("   Executing withdrawal...");
        const withdrawTx = await aavePool.withdraw(WETH, withdrawAmount, userAddress);
        const receipt = await withdrawTx.wait();
        console.log("   ✅ Withdrawal successful!");
        console.log("   TX:", receipt.hash);
        console.log("");

        const finalBalance = await aWETHContract.balanceOf(userAddress);
        console.log("   Final aWETH balance:", ethers.formatEther(finalBalance), "aWETH\n");

        console.log("✅ Direct Aave withdrawal works perfectly!");
        console.log("");
        console.log("💡 Conclusion:");
        console.log("   Aave V3 withdrawals work fine.");
        console.log("   The issue must be in our vault contracts.\n");
    } catch (e) {
        console.log("   ❌ Withdrawal failed:");
        console.log("   Error:", e.message);

        if (e.data) {
            console.log("   Error Data:", e.data);
        }

        console.log("");
        console.log("💡 Conclusion:");
        console.log("   Aave V3 itself has issues on Sepolia.");
        console.log("   This might be a testnet limitation.\n");
    }

    console.log("✅ Test complete\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
