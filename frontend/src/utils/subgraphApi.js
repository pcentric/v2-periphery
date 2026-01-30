import { SUBGRAPH_URL, GRAPHQL_QUERIES } from '../config/uniswapV2.js';

/**
 * Fetch data from Uniswap V2 Subgraph
 */
export async function fetchFromSubgraph(query, variables = {}) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Subgraph error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('Failed to fetch from subgraph');
    }

    return data.data;
  } catch (error) {
    console.error('Subgraph fetch error:', error);
    throw error;
  }
}

/**
 * Fetch tokens from subgraph with pagination
 */
export async function fetchTokens(first = 100, skip = 0) {
  return fetchFromSubgraph(GRAPHQL_QUERIES.TOKENS, { first, skip });
}

/**
 * Search tokens by symbol or name
 */
export async function searchTokens(search, first = 100) {
  return fetchFromSubgraph(GRAPHQL_QUERIES.SEARCH_TOKENS, { search, first });
}

/**
 * Get pool by address (V3 uses pools, not pairs)
 */
export async function getPoolByAddress(poolAddress) {
  console.log("getPoolByAddress", poolAddress)
  return fetchFromSubgraph(GRAPHQL_QUERIES.POOL_BY_ADDRESS, {
    poolAddress: poolAddress.toLowerCase(),
  });
}

/**
 * Get pools by token addresses (V3 may return multiple pools with different fee tiers)
 */
export async function getPoolsByTokens(token0, token1) {
  const data = await fetchFromSubgraph(GRAPHQL_QUERIES.POOLS_BY_TOKENS, {
    token0: token0.toLowerCase(),
    token1: token1.toLowerCase(),
  });

  return {
    pools: data?.pools || [],
    bestPool: data?.pools?.[0] || null, // Returns highest liquidity pool
  };
}

/**
 * Fetch all pools with pagination (V3 uses pools)
 * minLiquidity: minimum TVL in USD (default $50,000)
 */
export async function fetchPools(first = 100, skip = 0, minLiquidity = '50000') {
  return fetchFromSubgraph(GRAPHQL_QUERIES.POOLS, { first, skip, minLiquidity });
}

/**
 * Cache wrapper for API calls (simple in-memory caching)
 * Handles provider objects by normalizing them in cache key
 */
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function withCache(fn, duration = CACHE_DURATION) {
  return async (...args) => {
    // Detect provider objects and normalize for cache key
    // This prevents errors when serializing provider objects
    const normalizedArgs = args.map(arg => {
      const isProvider = arg?.constructor?.name === 'Web3Provider' ||
                        arg?.constructor?.name === 'JsonRpcProvider' ||
                        arg?.constructor?.name === 'FallbackProvider' ||
                        (arg && typeof arg === 'object' && typeof arg.call === 'function');
      return isProvider ? 'provider-present' : arg;
    });

    const key = JSON.stringify([fn.name, ...normalizedArgs]);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.time < duration) {
      return cached.data;
    }

    const data = await fn(...args);
    cache.set(key, { data, time: Date.now() });
    return data;
  };
}

// DEPRECATED: Cached versions are no longer used - token fetching moved to Token List API
// export const fetchTokensCached = withCache(fetchTokens, 60 * 60 * 1000); // 1 hour
// export const searchTokensCached = withCache(searchTokens, 60 * 60 * 1000); // 1 hour

// Cached versions for V3 pool queries
export const getPoolByTokensCached = withCache(getPoolsByTokens, 5 * 60 * 1000); // 5 minutes
export const fetchPoolsCached = withCache(fetchPools, 5 * 60 * 1000); // 5 minutes
