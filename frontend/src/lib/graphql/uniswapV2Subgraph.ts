/**
 * TypeScript bridge module for Uniswap V2 Subgraph API
 * Used for both token and pair data queries
 * Fetches real-time data from The Graph subgraph
 */


/**
 * Token interface matching Uniswap Token List API format
 * Compatible with both token list API and subgraph data
 */
export interface Token {
  chainId: number;             // Network chain ID (42161 for Arbitrum)
  address: string;             // Token contract address
  symbol: string;              // Token symbol (e.g., "USDC")
  name: string;                // Token name (e.g., "USD Coin")
  decimals: number;            // Token decimals (e.g., 6 or 18)
  logoURI?: string;            // Token logo URL

  // Backwards compatibility fields
  id?: string;                 // Alias for address (lowercase)
  totalLiquidity?: string;     // Optional, for compatibility
  volumeUSD?: string;          // Trading volume in USD (for sorting famous tokens)
  totalValueLockedUSD?: string; // Total value locked in USD
  totalSupply?: string;        // Total supply (optional)
  txCount?: string;            // Transaction count
}

/**
 * Retry configuration for React Query
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

/**
 * Note: Token fetching is now handled through tokenListApi.ts
 * which uses the subgraph (not the external token list API)
 * These placeholder functions remain for backwards compatibility
 */
