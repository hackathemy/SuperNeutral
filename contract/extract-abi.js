import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const contracts = [
  {
    name: "EthereumLendingPool",
    path: "contract/artifacts/contracts/ethereum/core/EthereumLendingPool.sol/EthereumLendingPool.json",
    output: "frontend/src/lib/abis/EthereumLendingPool.ts"
  },
  {
    name: "EthereumLoanNFT",
    path: "contract/artifacts/contracts/ethereum/core/EthereumLoanNFT.sol/EthereumLoanNFT.json",
    output: "frontend/src/lib/abis/EthereumLoanNFT.ts"
  },
  {
    name: "MockPYUSD",
    path: "contract/artifacts/contracts/mocks/MockPYUSD.sol/MockPYUSD.json",
    output: "frontend/src/lib/abis/MockPYUSD.ts"
  },
  {
    name: "StakedPYUSD",
    path: "contract/artifacts/contracts/ethereum/tokens/StakedPYUSD.sol/StakedPYUSD.json",
    output: "frontend/src/lib/abis/StakedPYUSD.ts"
  }
];

console.log("🔧 Extracting ABIs from compiled contracts...\n");

for (const contract of contracts) {
  try {
    const artifact = JSON.parse(readFileSync(contract.path, "utf8"));
    const abi = artifact.abi;

    const content = `// Auto-generated from ${contract.path}
// DO NOT EDIT MANUALLY

export const ${contract.name}ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

    writeFileSync(contract.output, content);
    console.log(`✅ ${contract.name}: ${contract.output}`);
  } catch (error) {
    console.error(`❌ Failed to extract ${contract.name}:`, error.message);
  }
}

console.log("\n✨ ABI extraction complete!");
