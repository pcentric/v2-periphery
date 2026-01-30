// Import ABIs from the frontend-abis package
import UniswapV2Router02ABI from '../../../frontend-abis/periphery/UniswapV2Router02.json';
import IUniswapV2FactoryABI from '../../../frontend-abis/core/IUniswapV2Factory.json';
import IUniswapV2PairABI from '../../../frontend-abis/core/IUniswapV2Pair.json';
import IERC20ABI from '../../../frontend-abis/periphery/IERC20.json';
import IWETHABI from '../../../frontend-abis/periphery/IWETH.json';

// Network configurations (multi-network support)
const NETWORKS = {
  localhost: {
    name: 'localhost',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {
      WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      FACTORY: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      ROUTER: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
    },
    testTokens: {
      TOKEN_A: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      TOKEN_B: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      PAIR_AB: '0x0AE19C8eC0C46412197552784D36A6296AA1f1eF',
      PAIR_WETH_A: '0xDEDC0D7FCdFe17a09D69a34112EE8A1621BD83e0'
    },
    initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
  },
  'arbitrum': {
    name: 'Arbitrum Mainnet',
    chainId: 42161,
    rpcUrl: process.env.VITE_ARBITRUM_MAINNET_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    contracts: {
      WETH: process.env.VITE_WETH_ARBITRUM_MAINNET || '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      
      // NOTE: Official Uniswap V2 is NOT deployed on Arbitrum
      // Using SushiSwap (V2-compatible) as it has the same interface
      // SushiSwap Factory on Arbitrum
      FACTORY: process.env.VITE_FACTORY_ARBITRUM_MAINNET || '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      // SushiSwap Router on Arbitrum (V2-compatible)
      ROUTER: process.env.VITE_ROUTER_ARBITRUM_MAINNET || '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      
      // Alternative: Uniswap V3 (requires different ABI and code)
      // FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      // ROUTER: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    },
    testTokens: {},
    // SushiSwap V2 init code hash for Arbitrum
    initCodeHash: '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303'
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: process.env.VITE_ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    contracts: {
      WETH: process.env.VITE_WETH_ARBITRUM_SEPOLIA || '0x980B62Da83eFf3D4576C647993b0c1D7faf17c7c',
      FACTORY: process.env.VITE_FACTORY_ARBITRUM_SEPOLIA || '',
      ROUTER: process.env.VITE_ROUTER_ARBITRUM_SEPOLIA || ''
    },
    testTokens: {},
    initCodeHash: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
  }
};

// Get active network from environment or default to localhost
const ACTIVE_NETWORK = process.env.VITE_NETWORK || 'arbitrum';
const activeNetworkConfig = NETWORKS[ACTIVE_NETWORK] || NETWORKS.localhost;

// Exported network configuration
export const NETWORK_CONFIG = activeNetworkConfig;
export const AVAILABLE_NETWORKS = NETWORKS;

// Exported contract addresses for active network
export const CONTRACT_ADDRESSES = activeNetworkConfig.contracts;

// Test tokens (only available on localhost)
export const TEST_TOKENS = activeNetworkConfig.testTokens;

// Contract ABIs
export const CONTRACT_ABIS = {
  ROUTER: UniswapV2Router02ABI.abi,
  FACTORY: IUniswapV2FactoryABI.abi,
  PAIR: IUniswapV2PairABI.abi,
  ERC20: IERC20ABI.abi,
  WETH: IWETHABI.abi
};

// Pair init code hash (needed for computing pair addresses)
export const INIT_CODE_HASH = activeNetworkConfig.initCodeHash;

// Gas limits for different operations
export const GAS_LIMITS = {
  SWAP: 200000,
  ADD_LIQUIDITY: 300000,
  REMOVE_LIQUIDITY: 300000,
  APPROVE: 100000
};

// Slippage tolerance (in basis points, 50 = 0.5%)
export const DEFAULT_SLIPPAGE = 50;

// Transaction deadline (in seconds from now)
export const DEFAULT_DEADLINE = 1200; // 20 minutes

// Helper function to get network by chain ID
export function getNetworkByChainId(chainId) {
  return Object.values(NETWORKS).find(net => net.chainId === chainId);
}

// Helper function to validate network configuration
export function isNetworkConfigValid() {
  return (
    CONTRACT_ADDRESSES.WETH &&
    CONTRACT_ADDRESSES.FACTORY &&
    CONTRACT_ADDRESSES.ROUTER &&
    NETWORK_CONFIG.rpcUrl
  );
}
