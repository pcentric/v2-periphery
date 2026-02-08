/**
 * Verified Token List for Uniswap V2 on Arbitrum
 * Includes proper Native ETH support
 */

export const ARBITRUM_CHAIN_ID = 42161;

// WETH address on Arbitrum
export const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

// Native ETH marker address (NOT an actual contract)
export const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

// TrustWallet assets base URL for token logos
const TRUSTWALLET_BASE = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isNative?: boolean;
  wrappedAddress?: string; // For native ETH, points to WETH for routing
}

export interface TokenWithMeta extends Token {
  id: string;
  addressLower: string;
}

export const VERIFIED_TOKENS: Record<string, Token> = {
  ETH: {
    address: NATIVE_ETH_ADDRESS, // ✅ Native ETH marker (not ERC20)
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/${WETH_ADDRESS}/logo.png`, // Reuse WETH logo
    isNative: true,
    wrappedAddress: WETH_ADDRESS, // ✅ For routing, use WETH address
  },
  WETH: {
    address: WETH_ADDRESS,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: `${TRUSTWALLET_BASE}/${WETH_ADDRESS}/logo.png`,
    isNative: false,
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
 * ==========================================
 * UTILITY FUNCTIONS FOR NATIVE ETH SUPPORT
 * ==========================================
 */

/**
 * Check if a token is native ETH
 */
export function isNativeToken(token: Token | TokenWithMeta | string): boolean {
  if (typeof token === 'string') {
    return token.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase();
  }
  return token.address.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase();
}

/**
 * Get the address to use for routing/pair lookups
 * - Native ETH => WETH address
 * - ERC20 tokens => their own address
 */
export function getAddressForRouting(token: Token | TokenWithMeta | string): string {
  if (typeof token === 'string') {
    // If string address, check if it's native ETH
    if (token.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase()) {
      return WETH_ADDRESS;
    }
    return token;
  }
  
  // If token object, check isNative flag
  if (token.isNative && token.wrappedAddress) {
    return token.wrappedAddress;
  }
  
  return token.address;
}

/**
 * Normalize token object with lowercase addresses
 */
export function normalizeToken(token: Token): TokenWithMeta {
  return {
    ...token,
    id: token.address.toLowerCase(),
    addressLower: token.address.toLowerCase(),
  };
}

/**
 * Get token list as array with normalized addresses
 * ETH and WETH are prioritized at the top for better UX
 */
export function getTokenList(): TokenWithMeta[] {
  const allTokens = Object.values(VERIFIED_TOKENS).map(normalizeToken);
  
  // Sort to prioritize ETH and WETH at the top, then major tokens
  const priorityOrder = ['ETH', 'WETH', 'USDC', 'USDT', 'ARB', 'WBTC', 'DAI'];
  
  return allTokens.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.symbol);
    const bIndex = priorityOrder.indexOf(b.symbol);
    
    // If both are in priority list, sort by priority
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only a is in priority list, a comes first
    if (aIndex !== -1) return -1;
    
    // If only b is in priority list, b comes first
    if (bIndex !== -1) return 1;
    
    // Otherwise, sort alphabetically
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * Get token by address (case-insensitive)
 * Handles both native ETH address and ERC20 addresses
 */
export function getTokenByAddress(address: string): TokenWithMeta | null {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  return getTokenList().find(token => token.addressLower === addressLower) || null;
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | null {
  return VERIFIED_TOKENS[symbol] || null;
}

/**
 * Check if address is a verified token
 */
export function isVerifiedToken(address: string): boolean {
  if (!address) return false;
  return getTokenByAddress(address) !== null;
}

/**
 * Create address to token mapping for quick lookups
 * Maps both native ETH (0x000...000) and WETH addresses
 */
export function getTokenAddressMap(): Map<string, TokenWithMeta> {
  const map = new Map<string, TokenWithMeta>();
  getTokenList().forEach(token => {
    map.set(token.addressLower, token);
    
    // Also map WETH address to ETH if native
    if (token.isNative && token.wrappedAddress) {
      const ethToken = { ...token };
      map.set(token.wrappedAddress.toLowerCase(), ethToken);
    }
  });
  return map;
}

