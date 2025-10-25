// Updated with Cross-Chain onBehalfOf Parameter Support (2025-10-19)
export const CONTRACTS = {
  LendingPool: "0x29DAC22Ff8Fd47Df08BAA9C14d269cca5DB06DF2" as `0x${string}`,
  LoanNFT: "0x8C363c801C4E46301a6e184C632E7699f28f76f2" as `0x${string}`,
  MockPYUSD: "0x0B0965002984157446c2300E37A545840BD69195" as `0x${string}`,
  MockStETHVault: "0x38B6C8A32c278EE804D2EEe8965f1db258E257E1" as `0x${string}`,
  MockPythOracle: "0x6BaC2D31e74c08cb75117b027c390DeCEDdF6e18" as `0x${string}`,
  StakedPYUSD: "0x511dc3421336B6A6b772e274b5f99b88257da66e" as `0x${string}`,
} as const;

export const EXPLORER_URLS = {
  LendingPool: "https://sepolia.etherscan.io/address/0x29DAC22Ff8Fd47Df08BAA9C14d269cca5DB06DF2",
  LoanNFT: "https://sepolia.etherscan.io/address/0x8C363c801C4E46301a6e184C632E7699f28f76f2",
  MockPYUSD: "https://sepolia.etherscan.io/address/0x0B0965002984157446c2300E37A545840BD69195",
  MockStETHVault: "https://sepolia.etherscan.io/address/0x38B6C8A32c278EE804D2EEe8965f1db258E257E1",
  MockPythOracle: "https://sepolia.etherscan.io/address/0x6BaC2D31e74c08cb75117b027c390DeCEDdF6e18",
  StakedPYUSD: "https://sepolia.etherscan.io/address/0x511dc3421336B6A6b772e274b5f99b88257da66e",
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
