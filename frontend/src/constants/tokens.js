/**
 * Verified Token List for Uniswap V3 on Arbitrum
 * These are safe, verified tokens with known addresses and metadata
 */

export const ARBITRUM_CHAIN_ID = 42161;

// TrustWallet assets base URL for token logos
const TRUSTWALLET_BASE = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets';

export const VERIFIED_TOKENS = {
  WETH: {
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/0x82aF49447D8a07e3bd95BD0d56f35241523fBab1/logo.png`,
    isNative: true, // Can be used for ETH
  },
  USDC: {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: `${TRUSTWALLET_BASE}/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png`,
  },
  USDT: {
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: `${TRUSTWALLET_BASE}/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9/logo.png`,
  },
  ARB: {
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    symbol: 'ARB',
    name: 'Arbitrum',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png`,
  },
  WBTC: {
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    decimals: 8,
    logoURI: `${TRUSTWALLET_BASE}/0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f/logo.png`,
  },
  DAI: {
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1/logo.png`,
  },
  GMX: {
    address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
    symbol: 'GMX',
    name: 'GMX',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a/logo.png`,
  },
  LINK: {
    address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    symbol: 'LINK',
    name: 'ChainLink Token',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/0xf97f4df75117a78c1A5a0DBb814Af92458539FB4/logo.png`,
  },
  'USDC.e': {
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    symbol: 'USDC.e',
    name: 'Bridged USDC',
    decimals: 6,
    logoURI: `${TRUSTWALLET_BASE}/0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8/logo.png`,
  },
  UNI: {
    address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0/logo.png`,
  },
};

/**
 * Get token list as array with normalized addresses
 */
export function getTokenList() {
  return Object.values(VERIFIED_TOKENS).map(token => ({
    ...token,
    id: token.address.toLowerCase(),
    addressLower: token.address.toLowerCase(),
  }));
}

/**
 * Get token by address (case-insensitive)
 */
export function getTokenByAddress(address) {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  return getTokenList().find(token => token.addressLower === addressLower);
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol) {
  return VERIFIED_TOKENS[symbol] || null;
}

/**
 * Check if address is a verified token
 */
export function isVerifiedToken(address) {
  if (!address) return false;
  return getTokenByAddress(address) !== null;
}

/**
 * Create address to token mapping for quick lookups
 */
export function getTokenAddressMap() {
  const map = new Map();
  getTokenList().forEach(token => {
    map.set(token.addressLower, token);
  });
  return map;
}

