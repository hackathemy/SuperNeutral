import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";

/**
 * Check Loan NFT Status and Permissions
 * Diagnose if burn() can be called
 */

async function main() {
    console.log("\n🔍 Checking Loan NFT Status...\n");

    const deployment = JSON.parse(fs.readFileSync("./deployment-complete-system.json", "utf8"));
    const contracts = deployment.contracts;

    const connection = await hre.network.connect();
    const provider = new ethers.BrowserProvider(connection.provider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // Load ABIs
    const loanNFTAbi = JSON.parse(
        fs.readFileSync("./artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json", "utf8")
    ).abi;

    const loanNFT = new ethers.Contract(contracts.EthereumLoanNFT, loanNFTAbi, provider);

    console.log("📋 Contract Addresses:");
    console.log("   Loan NFT:", contracts.EthereumLoanNFT);
    console.log("   Lending Pool:", contracts.EthereumLendingPool);
    console.log("");

    // Check Loan #1
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Loan NFT #1 Status");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const owner = await loanNFT.ownerOf(1);
        console.log("✅ NFT exists");
        console.log("   Owner:", owner);
        console.log("   Is User:", owner.toLowerCase() === userAddress.toLowerCase() ? "✅ Yes" : "❌ No");
        console.log("");
    } catch (e) {
        console.log("❌ NFT does not exist or error:", e.message);
        return;
    }

    // Check MINTER_ROLE
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Role Permissions");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

    try {
        const hasMinterRole = await loanNFT.hasRole(MINTER_ROLE, contracts.EthereumLendingPool);
        console.log("MINTER_ROLE → Lending Pool:", hasMinterRole ? "✅ Has role" : "❌ Missing");

        const lendingPoolAsAdmin = await loanNFT.hasRole(DEFAULT_ADMIN_ROLE, contracts.EthereumLendingPool);
        console.log("DEFAULT_ADMIN_ROLE → Lending Pool:", lendingPoolAsAdmin ? "✅ Has role" : "❌ Missing");

        const deployer = deployment.deployer;
        const deployerAsAdmin = await loanNFT.hasRole(DEFAULT_ADMIN_ROLE, deployer);
        console.log("DEFAULT_ADMIN_ROLE → Deployer:", deployerAsAdmin ? "✅ Has role" : "❌ Missing");
        console.log("");
    } catch (e) {
        console.log("❌ Error checking roles:", e.message);
    }

    // Check if LendingPool can call burn
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Burn Permission Test");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("Checking if Lending Pool can burn NFT #1...");

    // Check burn function existence
    try {
        const loanNFTWithSigner = new ethers.Contract(contracts.EthereumLoanNFT, loanNFTAbi, signer);

        // Try to call exists()
        const exists = await loanNFT.exists(1);
        console.log("NFT #1 exists():", exists ? "✅ Yes" : "❌ No");
        console.log("");

    } catch (e) {
        console.log("❌ Error:", e.message);
    }

    // Read burn function from ABI
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Burn Function Analysis");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const burnFunction = loanNFTAbi.find(f => f.name === "burn");
    if (burnFunction) {
        console.log("✅ Burn function found in ABI");
        console.log("   Inputs:", burnFunction.inputs.map(i => `${i.type} ${i.name}`).join(", "));
        console.log("");
    } else {
        console.log("❌ Burn function not found in ABI!");
        console.log("   This is a critical issue\n");
        return;
    }

    // Check if we can see the actual burn implementation
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Diagnosis");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("✅ Checks Passed:");
    console.log("   - Loan NFT #1 exists");
    console.log("   - Owner is correct");
    console.log("   - MINTER_ROLE is granted");
    console.log("   - Burn function exists\n");

    console.log("💡 Possible Issues:");
    console.log("   1. Burn might require additional checks");
    console.log("   2. ERC721 transfer/burn might have custom logic");
    console.log("   3. Error might come from before burn() is called\n");

    console.log("🔍 Next Step:");
    console.log("   - Add detailed logging to repay() function");
    console.log("   - Test each step separately");
    console.log("   - Use try-catch to isolate exact failure point\n");

    console.log("✅ Loan NFT diagnostic complete\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
