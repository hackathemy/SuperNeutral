// Updated with Real Pyth Oracle & Official PYUSD (2025-10-26)
// Updated with Short Position disabled for testnet (2025-10-26)
// Redeployed with VaultRouter & ShortPositionRouter (2025-10-26)
export const CONTRACTS = {
  // Core Contracts
  LendingPool: "0xfAF2cf03dE8B230A8412Ad53cc11800E018692a0" as `0x${string}`,
  LoanNFT: "0x1D999BC11B60EC34e299E6720283D5927DAc4c78" as `0x${string}`,
  StakedPYUSD: "0x43a77FBF42b35ACbDB16555Cc7d46aCB41654215" as `0x${string}`,

  // Official Tokens & Oracles (Deployed by Pyth & PayPal)
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`,
  PythOracle: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21" as `0x${string}`,

  // Mock Contracts (Only for testing)
  MockStETHVault: "0x2D8d456c7697920bF5a0E2fb37F3F30E9b12Dae7" as `0x${string}`,

  // Router Contracts (Deployed but Short disabled in testnet)
  VaultRouter: "0x125Ed9eecFB179637037f81FEBf2E63753a08549" as `0x${string}`,
  ShortPositionRouter: "0x7d7E6B2A5D73FD8D32f33babCdB2B46DF992A72b" as `0x${string}`,
} as const;

export const EXPLORER_URLS = {
  LendingPool: "https://sepolia.etherscan.io/address/0xfAF2cf03dE8B230A8412Ad53cc11800E018692a0",
  LoanNFT: "https://sepolia.etherscan.io/address/0x1D999BC11B60EC34e299E6720283D5927DAc4c78",
  StakedPYUSD: "https://sepolia.etherscan.io/address/0x43a77FBF42b35ACbDB16555Cc7d46aCB41654215",
  PYUSD: "https://sepolia.etherscan.io/address/0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  PythOracle: "https://sepolia.etherscan.io/address/0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
  MockStETHVault: "https://sepolia.etherscan.io/address/0x2D8d456c7697920bF5a0E2fb37F3F30E9b12Dae7",
  VaultRouter: "https://sepolia.etherscan.io/address/0x125Ed9eecFB179637037f81FEBf2E63753a08549",
  ShortPositionRouter: "https://sepolia.etherscan.io/address/0x7d7E6B2A5D73FD8D32f33babCdB2B46DF992A72b",
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
  // Official Pyth Network Price Feed IDs (https://pyth.network/developers/price-feed-ids)
  ETH_USD: "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6" as `0x${string}`,
  PYUSD_USD: "0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722" as `0x${string}`,
} as const;
