export const CONTRACTS = {
  LendingPool: "0xe27462f8F471335cEa75Ea76BDDb05189cd599d4" as `0x${string}`,
  LoanNFT: "0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529" as `0x${string}`,
  MockPYUSD: "0x57391875ce6340E5ED878752A30D080f31B63934" as `0x${string}`,
  MockStETHVault: "0xF289c5dcF9CDd8e36128682A32A6B4D962825955" as `0x${string}`,
  MockPythOracle: "0x05029B98e42AC2b0C4315E52f30260918efcAd48" as `0x${string}`,
  StakedPYUSD: "0x48D54257dE5824fd2D19e8315709B92D474b0E05" as `0x${string}`,
} as const;

export const EXPLORER_URLS = {
  LendingPool: "https://sepolia.etherscan.io/address/0xe27462f8F471335cEa75Ea76BDDb05189cd599d4",
  LoanNFT: "https://sepolia.etherscan.io/address/0xDA4C5Fd30104b1aF06a73C9AB019E3ece16DC529",
  MockPYUSD: "https://sepolia.etherscan.io/address/0x57391875ce6340E5ED878752A30D080f31B63934",
  MockStETHVault: "https://sepolia.etherscan.io/address/0xF289c5dcF9CDd8e36128682A32A6B4D962825955",
  MockPythOracle: "https://sepolia.etherscan.io/address/0x05029B98e42AC2b0C4315E52f30260918efcAd48",
  StakedPYUSD: "https://sepolia.etherscan.io/address/0x48D54257dE5824fd2D19e8315709B92D474b0E05",
} as const;

export const NETWORK_INFO = {
  chainId: 11155111, // Sepolia
  name: "Sepolia",
  rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
} as const;
