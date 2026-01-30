/**
 * Pair Service for Uniswap V3 on Arbitrum
 * Fetches pool/pair data from The Graph subgraph
 * Only validates liquidity between verified tokens
 */

import { getTokenList, getTokenAddressMap } from '../constants/tokens';

// Uniswap V3 Arbitrum Subgraph Endpoints
// 
// IMPORTANT: The public hosted service is being deprecated by The Graph
// For production, you MUST get a free API key from: https://thegraph.com/studio/
// 
// Option 1: Decentralized Network (Recommended for Production)
const SUBGRAPH_URL_GATEWAY = import.meta.env.VITE_GRAPH_API_KEY
  ? `https://gateway.thegraph.com/api/${import.meta.env.VITE_GRAPH_API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`
  : null;

// Option 2: Direct Studio API (if you deployed your own)
const SUBGRAPH_URL_STUDIO = import.meta.env.VITE_SUBGRAPH_STUDIO_URL || null;

// Option 3: Alternative public endpoints (may have CORS issues)
const FALLBACK_ENDPOINTS = [
  'https://api.studio.thegraph.com/query/24660/uniswap-v3-arbitrum/version/latest',
  'https://api.thegraph.com/subgraphs/id/QmZeCuoZeadgHkGwLwMeguyqUKz1WPWQYKcKyMCeQqGhsF',
];

// Minimum liquidity threshold (in USD) to consider a pool as active
const MIN_LIQUIDITY_USD = 1000;

// Cache for pair data
let pairMappingCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Development mode flag
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_POOLS === 'true';

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
 * Fetch pools from Uniswap V3 subgraph
 * Tries multiple endpoints to avoid CORS issues
 * @param {number} first - Number of pools to fetch
 * @returns {Promise<Array>} Array of pool objects
 */
export async function fetchPools(first = 1000) {
  // Use mock data for development if enabled
  if (USE_MOCK_DATA) {
    console.log('🔧 Using mock pool data for development');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return getMockPools();
  }

  const query = `
    query GetPools($first: Int!) {
      pools(
        first: $first
        orderBy: totalValueLockedUSD
        orderDirection: desc
        where: { 
          totalValueLockedUSD_gt: "${MIN_LIQUIDITY_USD}"
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
        totalValueLockedUSD
        volumeUSD
        feeTier
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

  // If no endpoints configured, show helpful error
  if (endpoints.length === 0) {
    throw new Error(
      'No subgraph endpoint configured. Please set VITE_GRAPH_API_KEY in .env file. ' +
      'Get a free API key at: https://thegraph.com/studio/'
    );
  }

  // Try each endpoint until one works
  let lastError = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying subgraph endpoint: ${endpoint.name}...`);
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { first },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('Subgraph errors:', result.errors);
        throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
      }

      const pools = result.data?.pools || [];
      console.log(`✅ Successfully fetched ${pools.length} pools from ${endpoint.name}`);
      return pools;
      
    } catch (error) {
      console.warn(`❌ Failed to fetch from ${endpoint.name}:`, error.message);
      lastError = error;
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  const errorMessage = 
    'Failed to fetch pools from all available subgraph endpoints. ' +
    'This usually means:\n' +
    '1. CORS issues with public endpoints (get an API key to fix)\n' +
    '2. Network connectivity issues\n' +
    '3. The Graph service is down\n\n' +
    'Solution: Get a free API key from https://thegraph.com/studio/ and add it to .env:\n' +
    'VITE_GRAPH_API_KEY=your_key_here';
  
  console.error(errorMessage);
  console.error('Last error:', lastError);
  
  throw new Error(`All subgraph endpoints failed. Last error: ${lastError?.message || 'Unknown'}`);
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
 * Fetch and build pair mapping with caching
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Pair mapping object
 */
export async function fetchPairMapping(forceRefresh = false) {
  // Return cached data if available and fresh
  if (!forceRefresh && pairMappingCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_DURATION) {
      console.log('Using cached pair mapping');
      return pairMappingCache;
    }
  }
  
  try {
    console.log('Fetching pools from subgraph...');
    
    // Fetch pools from subgraph
    const pools = await fetchPools(1000);
    console.log(`Fetched ${pools.length} pools from subgraph`);
    
    // Filter to only include verified tokens
    const verifiedPools = filterVerifiedPools(pools);
    console.log(`Found ${verifiedPools.length} pools with verified tokens`);
    
    // Build pair mapping
    const mapping = buildPairMapping(verifiedPools);
    console.log(`Built pair mapping for ${Object.keys(mapping).length} tokens`);
    
    // Log the pairs for each verified token
    const tokenMap = getTokenAddressMap();
    Object.entries(mapping).forEach(([tokenAddr, swappableAddrs]) => {
      const token = tokenMap.get(tokenAddr);
      const swappableTokens = swappableAddrs
        .map(addr => tokenMap.get(addr)?.symbol)
        .filter(Boolean);
      
      if (token) {
        console.log(`${token.symbol} can swap with: ${swappableTokens.join(', ')}`);
      }
    });
    
    // Update cache
    pairMappingCache = mapping;
    cacheTimestamp = Date.now();
    
    return mapping;
  } catch (error) {
    console.error('Failed to fetch pair mapping:', error);
    
    // Return cached data if available, even if stale
    if (pairMappingCache) {
      console.warn('Using stale cached data due to fetch error');
      return pairMappingCache;
    }
    
    throw error;
  }
}

/**
 * Clear the pair mapping cache
 */
export function clearPairMappingCache() {
  pairMappingCache = null;
  cacheTimestamp = null;
  console.log('Pair mapping cache cleared');
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

