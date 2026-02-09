/**
 * Pair Service for Uniswap V3 on Arbitrum
 * Fetches pool/pair data from The Graph subgraph
 * Only validates liquidity between verified tokens
 */

import { getTokenList, getTokenAddressMap } from '../constants/tokens';

// SushiSwap V2 Arbitrum Subgraph Endpoints
// Using SushiSwap since it's V2-compatible and has liquidity on Arbitrum
// 
// Option 1: Decentralized Network (Recommended for Production)
const SUBGRAPH_URL_GATEWAY = import.meta.env.VITE_GRAPH_API_KEY
  ? `https://gateway.thegraph.com/api/${import.meta.env.VITE_GRAPH_API_KEY}/subgraphs/id/8nFDCAztWfyKxwerneLpBW2NhEEDRLMqeP53w4GCn8bz`
  : null;

// Option 2: Direct Studio API (if you deployed your own)
const SUBGRAPH_URL_STUDIO = import.meta.env.VITE_SUBGRAPH_STUDIO_URL || null;

// Option 3: SushiSwap public endpoints for Arbitrum V2
const FALLBACK_ENDPOINTS = [
  'https://api.studio.thegraph.com/query/32073/sushiswap-arbitrum/v0.0.1',
  'https://api.thegraph.com/subgraphs/name/sushi-v2/sushiswap-arbitrum',
];

// Minimum liquidity threshold (in USD) to consider a pool as active
const MIN_LIQUIDITY_USD = 1000;

// Cache for pair data
let pairMappingCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for better performance

// Cache for individual pair queries
const pairQueryCache = new Map();
const PAIR_QUERY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for individual queries

// Development mode flag
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_POOLS === 'true';

// Prefetch commonly traded pairs for instant loading
const PRIORITY_PAIRS = [
  ['USDT', 'USDC'], // Most common stablecoin pair
  ['WETH', 'USDC'],
  ['WETH', 'USDT'],
  ['WETH', 'ARB'],
];

// Request deduplication - prevent multiple simultaneous fetches
let ongoingFetchPromise = null;

// Priority tokens for instant loading
const PRIORITY_TOKEN_SYMBOLS = ['USDT', 'USDC', 'WETH', 'ARB', 'DAI'];

/**
 * Get priority token addresses from symbols
 * @returns {Array<string>} Array of priority token addresses
 */
function getPriorityTokenAddresses() {
  const tokenMap = getTokenAddressMap();
  const priorityAddresses = [];
  
  PRIORITY_TOKEN_SYMBOLS.forEach(symbol => {
    const token = Object.values(tokenMap).find(t => t.symbol === symbol);
    if (token) {
      priorityAddresses.push(token.addressLower);
    }
  });
  
  return priorityAddresses;
}

/**
 * Build initial pair mapping with just priority pairs for instant loading
 * @param {Array} pools - All pools
 * @returns {Object} Minimal pair mapping with priority tokens
 */
function buildPriorityPairMapping(pools) {
  const priorityAddresses = getPriorityTokenAddresses();
  const priorityPools = pools.filter(pool => {
    const token0Lower = pool.token0.id.toLowerCase();
    const token1Lower = pool.token1.id.toLowerCase();
    return priorityAddresses.includes(token0Lower) && priorityAddresses.includes(token1Lower);
  });
  
  return buildPairMapping(priorityPools);
}

/**
 * Mock pool data for development/testing
 * Represents common trading pairs on Arbitrum
 */
function getMockPools() {
  const { WETH, USDC, USDT, ARB, WBTC, DAI, LINK } = {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  };

  return [
    // WETH pairs
    { id: '1', token0: { id: WETH }, token1: { id: USDC }, totalValueLockedUSD: '50000000' },
    { id: '2', token0: { id: WETH }, token1: { id: USDT }, totalValueLockedUSD: '30000000' },
    { id: '3', token0: { id: WETH }, token1: { id: ARB }, totalValueLockedUSD: '20000000' },
    { id: '4', token0: { id: WETH }, token1: { id: WBTC }, totalValueLockedUSD: '15000000' },
    { id: '5', token0: { id: WETH }, token1: { id: DAI }, totalValueLockedUSD: '10000000' },
    { id: '6', token0: { id: WETH }, token1: { id: LINK }, totalValueLockedUSD: '5000000' },
    
    // Stablecoin pairs
    { id: '7', token0: { id: USDC }, token1: { id: USDT }, totalValueLockedUSD: '40000000' },
    { id: '8', token0: { id: USDC }, token1: { id: DAI }, totalValueLockedUSD: '25000000' },
    
    // ARB pairs
    { id: '9', token0: { id: ARB }, token1: { id: USDC }, totalValueLockedUSD: '18000000' },
    { id: '10', token0: { id: ARB }, token1: { id: USDT }, totalValueLockedUSD: '12000000' },
    
    // WBTC pairs
    { id: '11', token0: { id: WBTC }, token1: { id: USDC }, totalValueLockedUSD: '22000000' },
    { id: '12', token0: { id: WBTC }, token1: { id: USDT }, totalValueLockedUSD: '8000000' },
    
    // LINK pairs
    { id: '13', token0: { id: LINK }, token1: { id: USDC }, totalValueLockedUSD: '6000000' },
  ];
}

/**
 * Fetch from a single endpoint with timeout
 * @param {Object} endpoint - Endpoint configuration
 * @param {string} query - GraphQL query
 * @param {Object} variables - Query variables
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Result object
 */
async function fetchFromEndpoint(endpoint, query, variables, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    // SushiSwap V2 uses "pairs" instead of "pools"
    const pools = result.data?.pairs || result.data?.pools || [];
    
    // Normalize the response
    const normalizedPools = pools.map(pair => ({
      ...pair,
      totalValueLockedUSD: pair.reserveUSD || pair.totalValueLockedUSD || '0'
    }));
    
    return { success: true, pools: normalizedPools, endpoint: endpoint.name };
  } catch (error) {
    clearTimeout(timeoutId);
    return { success: false, error: error.message, endpoint: endpoint.name };
  }
}

/**
 * Fetch pairs from SushiSwap V2 subgraph on Arbitrum
 * 🚀 OPTIMIZED: Tries ALL endpoints IN PARALLEL for faster response
 * @param {number} first - Number of pairs to fetch
 * @returns {Promise<Array>} Array of pair objects
 */
export async function fetchPools(first = 300) {
  // Use mock data for development if enabled
  if (USE_MOCK_DATA) {
    console.log('🔧 Using mock pool data for development');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return getMockPools();
  }

  // SushiSwap V2 uses "pairs" instead of "pools" and has different schema
  const query = `
    query GetPairs($first: Int!) {
      pairs(
        first: $first
        orderBy: reserveUSD
        orderDirection: desc
        where: { 
          reserveUSD_gt: "${MIN_LIQUIDITY_USD}"
        }
      ) {
        id
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
        reserveUSD
        volumeUSD
      }
    }
  `;

  // Build list of endpoints to try
  const endpoints = [];
  
  // Priority 1: Gateway with API key (most reliable)
  if (SUBGRAPH_URL_GATEWAY) {
    endpoints.push({ url: SUBGRAPH_URL_GATEWAY, name: 'Gateway (API Key)' });
  }
  
  // Priority 2: Studio endpoint (if configured)
  if (SUBGRAPH_URL_STUDIO) {
    endpoints.push({ url: SUBGRAPH_URL_STUDIO, name: 'Studio' });
  }
  
  // Priority 3: Fallback public endpoints
  FALLBACK_ENDPOINTS.forEach((url, idx) => {
    endpoints.push({ url, name: `Fallback ${idx + 1}` });
  });

  if (endpoints.length === 0) {
    throw new Error(
      'No subgraph endpoint configured. Please set VITE_GRAPH_API_KEY in .env file. ' +
      'Get a free API key at: https://thegraph.com/studio/'
    );
  }

  console.log(`⚡ Trying ${endpoints.length} endpoints in parallel for faster response...`);
  
  // 🚀 OPTIMIZATION: Try all endpoints in parallel instead of sequentially
  // This dramatically reduces wait time from ~30+ seconds to ~2-5 seconds!
  try {
    const results = await Promise.all(
      endpoints.map(endpoint => 
        fetchFromEndpoint(endpoint, query, { first }, 10000)
      )
    );

    // Find first successful result
    const successfulResult = results.find(r => r.success);
    
    if (successfulResult) {
      console.log(`✅ Successfully fetched ${successfulResult.pools.length} pairs from ${successfulResult.endpoint}`);
      return successfulResult.pools;
    }

    // All failed - log all errors for debugging
    console.error('❌ All endpoints failed:');
    results.forEach(r => {
      if (!r.success) {
        console.error(`  - ${r.endpoint}: ${r.error}`);
      }
    });

    const errorMessage = 
      'Failed to fetch pools from all available subgraph endpoints. ' +
      'This usually means:\n' +
      '1. CORS issues with public endpoints (get an API key to fix)\n' +
      '2. Network connectivity issues\n' +
      '3. The Graph service is down\n\n' +
      'Solution: Get a free API key from https://thegraph.com/studio/ and add it to .env:\n' +
      'VITE_GRAPH_API_KEY=your_key_here';
    
    console.error(errorMessage);
    throw new Error(errorMessage);
    
  } catch (error) {
    // Catch any unexpected errors from Promise.all
    console.error('Unexpected error during parallel fetch:', error);
    throw error;
  }
}

/**
 * Filter pools to only include verified tokens
 * @param {Array} pools - Array of pool objects from subgraph
 * @returns {Array} Filtered pools containing only verified tokens
 */
export function filterVerifiedPools(pools) {
  const tokenMap = getTokenAddressMap();
  
  return pools.filter(pool => {
    const token0Lower = pool.token0.id.toLowerCase();
    const token1Lower = pool.token1.id.toLowerCase();
    
    // Both tokens must be in our verified list
    return tokenMap.has(token0Lower) && tokenMap.has(token1Lower);
  });
}

/**
 * Build a mapping of token addresses to their swappable counterparts
 * @param {Array} pools - Array of filtered pool objects
 * @returns {Object} Mapping of tokenAddress -> [swappableTokenAddresses]
 */
export function buildPairMapping(pools) {
  const mapping = {};
  
  pools.forEach(pool => {
    const token0 = pool.token0.id.toLowerCase();
    const token1 = pool.token1.id.toLowerCase();
    
    // Add bidirectional mapping
    if (!mapping[token0]) {
      mapping[token0] = [];
    }
    if (!mapping[token1]) {
      mapping[token1] = [];
    }
    
    // Add unique connections
    if (!mapping[token0].includes(token1)) {
      mapping[token0].push(token1);
    }
    if (!mapping[token1].includes(token0)) {
      mapping[token1].push(token0);
    }
  });
  
  return mapping;
}

/**
 * Get swappable tokens for a given token address
 * @param {string} tokenAddress - Address of the input token
 * @param {Object} pairMapping - The pair mapping object
 * @returns {Array} Array of token addresses that can be swapped with
 */
export function getSwappableTokens(tokenAddress, pairMapping) {
  if (!tokenAddress || !pairMapping) {
    return [];
  }
  
  const addressLower = tokenAddress.toLowerCase();
  return pairMapping[addressLower] || [];
}

/**
 * Fetch and build pair mapping with caching and request deduplication
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Pair mapping object
 */
export async function fetchPairMapping(forceRefresh = false) {
  // 🚀 OPTIMIZATION: Request deduplication - prevent multiple simultaneous fetches
  // If a fetch is already in progress, return that promise instead of starting a new one
  if (ongoingFetchPromise && !forceRefresh) {
    console.log('⏳ Using ongoing fetch request (deduplication)');
    return ongoingFetchPromise;
  }

  // Return cached data if available and fresh
  if (!forceRefresh && pairMappingCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      console.log('✅ Using cached pair mapping (fresh)');
      return pairMappingCache;
    }
  }
  
  // Start new fetch
  ongoingFetchPromise = (async () => {
    try {
      console.log('⚡ Fetching pools from subgraph (optimized with parallel requests)...');
      const startTime = Date.now();
      
      // Fetch pools from subgraph with reduced count for faster loading
      const pools = await fetchPools(300);
      const fetchTime = Date.now() - startTime;
      console.log(`✅ Fetched ${pools.length} pools in ${fetchTime}ms`);
      
      // Filter to only include verified tokens
      const verifiedPools = filterVerifiedPools(pools);
      console.log(`✅ Found ${verifiedPools.length} pools with verified tokens`);
      
      // Build pair mapping
      const mapping = buildPairMapping(verifiedPools);
      console.log(`✅ Built pair mapping for ${Object.keys(mapping).length} tokens`);
      
      // Log summary
      const pairCount = Object.values(mapping).reduce((sum, arr) => sum + arr.length, 0) / 2;
      console.log(`📊 Summary: ${Object.keys(mapping).length} tokens with ${pairCount} unique pairs`);
      console.log(`⏱️  Total time: ${Date.now() - startTime}ms`);
      
      // Update cache
      pairMappingCache = mapping;
      cacheTimestamp = Date.now();
      
      return mapping;
    } catch (error) {
      console.error('❌ Failed to fetch pair mapping:', error);
      
      // Return cached data if available, even if stale
      if (pairMappingCache) {
        console.warn('⚠️  Using stale cached data due to fetch error');
        return pairMappingCache;
      }
      
      throw error;
    } finally {
      // Clear ongoing promise
      ongoingFetchPromise = null;
    }
  })();

  return ongoingFetchPromise;
}

/**
 * Clear the pair mapping cache
 */
export function clearPairMappingCache() {
  pairMappingCache = null;
  cacheTimestamp = null;
  ongoingFetchPromise = null;
  console.log('Pair mapping cache cleared');
}

/**
 * 🚀 OPTIMIZATION: Fetch pair mapping with progressive loading
 * Returns priority pairs immediately while full data loads in background
 * @param {Function} onPriorityLoaded - Callback when priority pairs are ready
 * @param {Function} onFullyLoaded - Callback when all pairs are ready
 * @returns {Promise<Object>} Full pair mapping
 */
export async function fetchPairMappingProgressive(onPriorityLoaded, onFullyLoaded) {
  // Check cache first
  if (pairMappingCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      console.log('✅ Using cached pair mapping (fresh)');
      // Call both callbacks immediately with cached data
      if (onPriorityLoaded) onPriorityLoaded(pairMappingCache);
      if (onFullyLoaded) onFullyLoaded(pairMappingCache);
      return pairMappingCache;
    }
  }

  try {
    console.log('⚡ Starting progressive pair loading...');
    const startTime = Date.now();
    
    // Fetch all pools
    const pools = await fetchPools(300);
    console.log(`✅ Fetched ${pools.length} pools in ${Date.now() - startTime}ms`);
    
    // Filter verified pools
    const verifiedPools = filterVerifiedPools(pools);
    
    // 🚀 Build and return priority pairs FIRST for instant UI feedback
    if (onPriorityLoaded) {
      const priorityMapping = buildPriorityPairMapping(verifiedPools);
      console.log(`⚡ Priority pairs ready: ${Object.keys(priorityMapping).length} tokens`);
      onPriorityLoaded(priorityMapping);
    }
    
    // Build full mapping
    const fullMapping = buildPairMapping(verifiedPools);
    const pairCount = Object.values(fullMapping).reduce((sum, arr) => sum + arr.length, 0) / 2;
    console.log(`✅ Full mapping ready: ${Object.keys(fullMapping).length} tokens with ${pairCount} pairs`);
    console.log(`⏱️  Total time: ${Date.now() - startTime}ms`);
    
    // Update cache
    pairMappingCache = fullMapping;
    cacheTimestamp = Date.now();
    
    // Notify full load complete
    if (onFullyLoaded) onFullyLoaded(fullMapping);
    
    return fullMapping;
  } catch (error) {
    console.error('❌ Failed progressive fetch:', error);
    
    // Return cached data if available
    if (pairMappingCache) {
      console.warn('⚠️  Using stale cached data');
      if (onPriorityLoaded) onPriorityLoaded(pairMappingCache);
      if (onFullyLoaded) onFullyLoaded(pairMappingCache);
      return pairMappingCache;
    }
    
    throw error;
  }
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  if (!pairMappingCache || !cacheTimestamp) {
    return { cached: false, age: 0 };
  }
  
  const age = Date.now() - cacheTimestamp;
  return {
    cached: true,
    age,
    stale: age > CACHE_DURATION,
  };
}

/**
 * Get cached pair query result
 * @param {string} key - Cache key
 * @returns {any|null} Cached result or null
 */
export function getCachedPairQuery(key) {
  const cached = pairQueryCache.get(key);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > PAIR_QUERY_CACHE_DURATION) {
    pairQueryCache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set cached pair query result
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function setCachedPairQuery(key, data) {
  pairQueryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

