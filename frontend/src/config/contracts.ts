// Updated with Real Pyth Oracle & Official PYUSD (2025-10-26)
// Updated with 7-day price staleness for testnet (2025-10-26)
export const CONTRACTS = {
  // Core Contracts
  LendingPool: "0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A" as `0x${string}`,
  LoanNFT: "0xED425451e23239a8e5785d63659cE234067b47FA" as `0x${string}`,
  StakedPYUSD: "0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699" as `0x${string}`,

  // Official Tokens & Oracles (Deployed by Pyth & PayPal)
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`,
  PythOracle: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21" as `0x${string}`,

  // Mock Contracts (Only for testing)
  MockStETHVault: "0xD1Ee99250Ff85ccf2A700C86a9a50A39E4f247B7" as `0x${string}`,
} as const;

export const EXPLORER_URLS = {
  LendingPool: "https://sepolia.etherscan.io/address/0x316717AC8961B8396Ffd3349Dd562CB5195d9b1A",
  LoanNFT: "https://sepolia.etherscan.io/address/0xED425451e23239a8e5785d63659cE234067b47FA",
  StakedPYUSD: "https://sepolia.etherscan.io/address/0x9Fc31eE2Fa96d49207c2a3513F029F1f4eCf8699",
  PYUSD: "https://sepolia.etherscan.io/address/0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  PythOracle: "https://sepolia.etherscan.io/address/0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
  MockStETHVault: "https://sepolia.etherscan.io/address/0xD1Ee99250Ff85ccf2A700C86a9a50A39E4f247B7",
} as const;

export const FAUCETS = {
  PYUSD: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia/pyusd",
  ETH: "https://www.alchemy.com/faucets/ethereum-sepolia",
} as const;

export const NETWORK_INFO = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
  },
  arbitrumSepolia: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  },
} as const;

export const PRICE_FEED_IDS = {
  ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" as `0x${string}`,
  PYUSD_USD: "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722" as `0x${string}`,
} as const;
