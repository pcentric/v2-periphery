// Uniswap V3 Configuration - Arbitrum Mainnet
// Note: Using Uniswap V3 subgraph with V3 query schema
export const ARBITRUM_V3_CONFIG = {
  // V3 factory and router addresses
  factory: '0x1F98431c8aD98523631AE4a59f267346ea3113F0',    // Uniswap V3 Factory
  router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',     // SwapRouter
  weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',       // Canonical WETH
};

// Get API key from environment (Vite style)
const THEGRAPH_API_KEY = import.meta.env.VITE_THEGRAPH_API_KEY || '';
console.log("THEGRAPH_API_KEY", THEGRAPH_API_KEY);

// The Graph - Uniswap V3 Subgraph on Arbitrum (Gateway)
// This is the official Uniswap V3 subgraph for Arbitrum
export const SUBGRAPH_URL = THEGRAPH_API_KEY
  ? `https://gateway.thegraph.com/api/${THEGRAPH_API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`
  : 'https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV';

// Debug log to verify API key is loaded
console.log('The Graph API Key loaded:', THEGRAPH_API_KEY ? '✓ (present)' : '✗ (missing)');
console.log('Subgraph URL:', SUBGRAPH_URL);
console.log('Using Uniswap V3 subgraph schema');

// GraphQL Queries
// NOTE: Using Uniswap V3 schema with "pools" instead of V2 "pairs"
export const GRAPHQL_QUERIES = {
  // Fetch all tokens from subgraph with pagination
  TOKENS: `
    query GetTokens($first: Int!, $skip: Int!) {
      tokens(
        first: $first
        skip: $skip
        orderBy: totalValueLockedUSD
        orderDirection: desc
        where: { totalValueLockedUSD_gt: "0" }
      ) {
        id
        symbol
        name
        decimals
        txCount
      }
    }
  `,

  // Search tokens by symbol or name
  SEARCH_TOKENS: `
    query SearchTokens($search: String!, $first: Int!) {
      tokens(
        first: $first
        where: {
          or: [
            { symbol_contains_nocase: $search }
            { name_contains_nocase: $search }
          ]
        }
        orderBy: totalValueLockedUSD
        orderDirection: desc
      ) {
        id
        symbol
        name
        decimals
        txCount
      }
    }
  `,

  // Fetch single pool by address (V3 uses pools, not pairs)
  POOL_BY_ADDRESS: `
    query GetPool($poolAddress: String!) {
      pool(id: $poolAddress) {
        id
        feeTier
        liquidity
        token0 {
          id
          symbol
          name
          decimals
        }
        token1 {
          id
          symbol
          name
          decimals
        }
        totalValueLockedUSD
        volumeUSD
        txCount
      }
    }
  `,

  // Fetch pools for specific token pair (V3 may have multiple pools with different fees)
  POOLS_BY_TOKENS: `
    query GetPoolsByTokens($token0: String!, $token1: String!) {
      pools(
        first: 5
        orderBy: liquidity
        orderDirection: desc
        where: {
          or: [
            { token0: $token0, token1: $token1 }
            { token0: $token1, token1: $token0 }
          ]
        }
      ) {
        id
        feeTier
        liquidity
        token0 {
          id
          symbol
          name
          decimals
        }
        token1 {
          id
          symbol
          name
          decimals
        }
        totalValueLockedUSD
        volumeUSD
        txCount
      }
    }
  `,

  // Fetch high-liquidity pools (V3 uses pools with fee tiers)
  POOLS: `
    query GetPools($first: Int!, $skip: Int!, $minLiquidity: String!) {
      pools(
        first: $first
        skip: $skip
        orderBy: totalValueLockedUSD
        orderDirection: desc
        where: { totalValueLockedUSD_gt: $minLiquidity }
      ) {
        id
        feeTier
        liquidity
        token0 {
          id
          symbol
          name
          decimals
        }
        token1 {
          id
          symbol
          name
          decimals
        }
        totalValueLockedUSD
        volumeUSD
        txCount
      }
    }
  `,
};
