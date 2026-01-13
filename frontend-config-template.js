/**
 * Uniswap V2 Frontend Configuration Template
 *
 * Copy this file to your frontend project and update with your deployed addresses
 */

// Network configurations
export const networks = {
  // Ethereum Mainnet
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
    contracts: {
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // Official Uniswap V2 Factory
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Official Uniswap V2 Router02
      weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on mainnet
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://etherscan.io'
  },

  // Sepolia Testnet
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Deploy your own
      router: '0x0000000000000000000000000000000000000000', // Deploy your own
      weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH on Sepolia
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://sepolia.etherscan.io'
  },

  // Goerli Testnet (deprecated but still used)
  goerli: {
    chainId: 5,
    name: 'Goerli Testnet',
    rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR-API-KEY',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Deploy your own
      router: '0x0000000000000000000000000000000000000000', // Deploy your own
      weth: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', // WETH on Goerli
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://goerli.etherscan.io'
  },

  // BSC Mainnet
  bsc: {
    chainId: 56,
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Deploy your own
      router: '0x0000000000000000000000000000000000000000', // Deploy your own
      weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://bscscan.com'
  },

  // Polygon Mainnet
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com/',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Deploy your own
      router: '0x0000000000000000000000000000000000000000', // Deploy your own
      weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://polygonscan.com'
  },

  // Arbitrum One
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Deploy your own
      router: '0x0000000000000000000000000000000000000000', // Deploy your own
      weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://arbiscan.io'
  },

  // Optimism
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Deploy your own
      router: '0x0000000000000000000000000000000000000000', // Deploy your own
      weth: '0x4200000000000000000000000000000000000006', // WETH on Optimism
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'https://optimistic.etherscan.io'
  },

  // Local Hardhat/Ganache
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {
      factory: '0x0000000000000000000000000000000000000000', // Will be set after deployment
      router: '0x0000000000000000000000000000000000000000', // Will be set after deployment
      weth: '0x0000000000000000000000000000000000000000', // Will be set after deployment
      initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    },
    blockExplorer: 'http://localhost:3000'
  }
}

// Default network (change based on your deployment)
export const defaultNetwork = 'localhost' // Change to 'mainnet', 'sepolia', etc.

// Get current network config
export function getNetworkConfig(chainId) {
  const network = Object.values(networks).find(n => n.chainId === chainId)
  if (!network) {
    throw new Error(`Unsupported network: ${chainId}`)
  }
  return network
}

// Export specific network for convenience
export const currentConfig = networks[defaultNetwork]

// Trading settings
export const tradingSettings = {
  // Default slippage tolerance (0.5%)
  defaultSlippageTolerance: 0.5,

  // Deadline in minutes
  defaultDeadline: 20,

  // Gas price multiplier (1.0 = normal, 1.5 = fast)
  gasPriceMultiplier: 1.0,

  // Minimum liquidity to display pair
  minLiquidityUSD: 1000,

  // Popular tokens to display
  popularTokens: {
    mainnet: [
      { symbol: 'ETH', address: 'ETH', decimals: 18 },
      { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 }
    ],
    sepolia: [
      { symbol: 'ETH', address: 'ETH', decimals: 18 },
      { symbol: 'WETH', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', decimals: 18 }
    ],
    localhost: [
      { symbol: 'ETH', address: 'ETH', decimals: 18 }
    ]
  }
}

// UI Settings
export const uiSettings = {
  // Theme
  theme: 'dark', // 'light' or 'dark'

  // Number formatting
  decimalPlaces: {
    price: 6,
    amount: 4,
    percentage: 2
  },

  // Update intervals (milliseconds)
  updateIntervals: {
    prices: 10000, // 10 seconds
    balances: 30000, // 30 seconds
    pairs: 60000 // 1 minute
  },

  // Chart settings
  chart: {
    defaultTimeframe: '1D',
    availableTimeframes: ['1H', '4H', '1D', '1W', '1M']
  }
}

// Fee information
export const feeInfo = {
  // Uniswap V2 trading fee
  tradingFee: 0.003, // 0.3%

  // Fee goes to liquidity providers
  lpFeeShare: 1.0 // 100%
}

// Error messages
export const errorMessages = {
  INSUFFICIENT_LIQUIDITY: 'Insufficient liquidity for this trade',
  INSUFFICIENT_INPUT_AMOUNT: 'Insufficient input amount',
  INSUFFICIENT_OUTPUT_AMOUNT: 'Insufficient output amount',
  EXPIRED: 'Transaction expired',
  INSUFFICIENT_A_AMOUNT: 'Insufficient tokenA amount',
  INSUFFICIENT_B_AMOUNT: 'Insufficient tokenB amount',
  EXCESSIVE_INPUT_AMOUNT: 'Excessive input amount',
  INVALID_PATH: 'Invalid token path',
  TRANSFER_FAILED: 'Token transfer failed',
  INSUFFICIENT_ALLOWANCE: 'Please approve tokens first',
  USER_REJECTED: 'Transaction rejected by user'
}

// Export utility function to check if address is valid
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Export utility to get WETH address for current network
export function getWETHAddress(chainId) {
  const network = getNetworkConfig(chainId)
  return network.contracts.weth
}

// Export utility to check if token is WETH
export function isWETH(tokenAddress, chainId) {
  return tokenAddress.toLowerCase() === getWETHAddress(chainId).toLowerCase()
}

// Export utility to get router address
export function getRouterAddress(chainId) {
  const network = getNetworkConfig(chainId)
  return network.contracts.router
}

// Export utility to get factory address
export function getFactoryAddress(chainId) {
  const network = getNetworkConfig(chainId)
  return network.contracts.factory
}

// Export constants
export const INIT_CODE_HASH = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
export const MINIMUM_LIQUIDITY = 1000n // Minimum liquidity locked in pair
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

// Export all as default
export default {
  networks,
  defaultNetwork,
  currentConfig,
  tradingSettings,
  uiSettings,
  feeInfo,
  errorMessages,
  getNetworkConfig,
  isValidAddress,
  getWETHAddress,
  isWETH,
  getRouterAddress,
  getFactoryAddress,
  INIT_CODE_HASH,
  MINIMUM_LIQUIDITY,
  MAX_UINT256
}
