// Import ABIs from the frontend-abis package
import UniswapV2Router02ABI from '../../../frontend-abis/periphery/UniswapV2Router02.json';
import IUniswapV2FactoryABI from '../../../frontend-abis/core/IUniswapV2Factory.json';
import IUniswapV2PairABI from '../../../frontend-abis/core/IUniswapV2Pair.json';
import IERC20ABI from '../../../frontend-abis/periphery/IERC20.json';
import IWETHABI from '../../../frontend-abis/periphery/IWETH.json';

// Deployed contract addresses (auto-generated)
// Generated at: 2026-01-12T11:28:37.315Z
export const CONTRACT_ADDRESSES = {
  WETH: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  FACTORY: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  ROUTER: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

// Test token addresses (for local testing)
export const TEST_TOKENS = {
  TOKEN_A: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  TOKEN_B: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  PAIR_AB: '0x0AE19C8eC0C46412197552784D36A6296AA1f1eF',
  PAIR_WETH_A: '0xDEDC0D7FCdFe17a09D69a34112EE8A1621BD83e0'
};

// Network configuration
export const NETWORK_CONFIG = {
  name: 'localhost',
  chainId: 31337,
  rpcUrl: 'http://127.0.0.1:8545'
};

// Contract ABIs
export const CONTRACT_ABIS = {
  ROUTER: UniswapV2Router02ABI.abi,
  FACTORY: IUniswapV2FactoryABI.abi,
  PAIR: IUniswapV2PairABI.abi,
  ERC20: IERC20ABI.abi,
  WETH: IWETHABI.abi
};

// Pair init code hash (needed for computing pair addresses)
export const INIT_CODE_HASH = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f';

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
