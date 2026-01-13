require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

const {
  PRIVATE_KEY,
  ARBITRUM_MAINNET_RPC_URL,
  ARBITRUM_SEPOLIA_RPC_URL,
  ARBISCAN_API_KEY,
} = process.env;

module.exports = {
  solidity: {
    version: "0.6.6",
    settings: {
      optimizer: { enabled: true, runs: 999999 },
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },

    arbitrum: {
      url: ARBITRUM_MAINNET_RPC_URL || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    arbitrumSepolia: {
      url: ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },

  // optional (only needed if you run contract verification later)
  etherscan: {
    apiKey: {
      arbitrumOne: ARBISCAN_API_KEY || "",
      arbitrumSepolia: ARBISCAN_API_KEY || "",
    },
  },
};
