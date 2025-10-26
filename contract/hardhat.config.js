import dotenv from "dotenv";
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337
    },
    mainnetFork: {
      type: "edr-simulated",
      chainId: 1,
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 20000000 // Pin to specific block for consistency
      }
    },
    sepolia: {
      type: "http",
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    },
    arbitrumSepolia: {
      type: "http",
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614
    }
  }
};
