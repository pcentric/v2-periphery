import { ethers } from 'ethers';
import { fetchFromSubgraph, withCache } from './subgraphApi.js';
import { validateTokensBatch } from './validation.js';

/**
 * GraphQL Query for fetching high-liquidity trading pools from Uniswap V3 subgraph
 * Filters pools with totalValueLockedUSD > minTVL and returns essential pool and token data
 * V3 uses "pools" instead of "pairs" and uses "totalValueLockedUSD" instead of "reserveUSD"
 */
const POOLS_WITH_LIQUIDITY_QUERY = `
  query GetPoolsWithLiquidity($first: Int!, $skip: Int!, $minTVL: String!) {
    pools(
      first: $first
      skip: $skip
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: { totalValueLockedUSD_gt: $minTVL }
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
`;

/**
 * Arbitrum Mainnet famous token addresses (checksummed)
 * These tokens are prioritized in token lists
 */
const FAMOUS_TOKENS = {
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
  LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4'
};

const FAMOUS_TOKEN_ADDRESSES = new Set(
  Object.values(FAMOUS_TOKENS).map(addr => addr.toLowerCase())
);

/**
 * Get TrustWallet logo URI for a token address
 * Uses checksummed address for TrustWallet CDN
 *
 * @param {string} address - Token address
 * @returns {string|null} Logo URI or null if address cannot be checksummed
 */
function getTokenLogoURI(address) {
  try {
    const checksummedAddress = ethers.utils.getAddress(address);
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/${checksummedAddress}/logo.png`;
  } catch (error) {
    console.warn(`Failed to checksum address ${address}:`, error);
    return null;
  }
}

/**
 * Fetch top trading pools from Uniswap V3 subgraph with TVL filter
 *
 * @param {string} minTVL - Minimum total value locked USD threshold (default: '50000')
 * @param {number} first - Number of pools to fetch (default: 200)
 * @param {number} skip - Pagination offset (default: 0)
 * @returns {Promise<Array>} Array of pool objects with token details
 * @throws {Error} If subgraph fetch fails
 */
export async function fetchAllPools(
  minTVL = '50000',
  first = 200,
  skip = 0
) {
  try {
    const data = await fetchFromSubgraph(POOLS_WITH_LIQUIDITY_QUERY, {
      first,
      skip,
      minTVL
    });

    if (!data.pools) {
      throw new Error('Invalid response: pools array not found');
    }

    if (data.pools.length === 0) {
      console.warn(`No pools found with TVL > $${minTVL}`);
      return [];
    }

    console.log(`Fetched ${data.pools.length} pools with liquidity > $${minTVL}`);
    console.log("data.pools", data.pools)
    return data.pools;

  } catch (error) {
    throw new Error(`Failed to fetch pools from subgraph: ${error.message}`);
  }
}

/**
 * Build a deduplicated token list from pools with TrustWallet logos
 * Famous tokens are sorted first, then remaining tokens alphabetically by symbol
 * Works with both V2 pairs and V3 pools (they both have token0 and token1)
 *
 * @param {Array} pools - Array of pool objects from subgraph (can be V2 pairs or V3 pools)
 * @returns {Array} Formatted token list with logos
 */
export function buildTokenList(pools) {
  const tokenMap = new Map();

  // Extract unique tokens from both token0 and token1 in each pool
  pools.forEach(pool => {
    [pool.token0, pool.token1].forEach(token => {
      const lowerAddress = token.id.toLowerCase();

      if (!tokenMap.has(lowerAddress)) {
        tokenMap.set(lowerAddress, {
          chainId: 42161,
          address: token.id,
          id: lowerAddress,
          symbol: token.symbol,
          name: token.name,
          decimals: parseInt(token.decimals),
          logoURI: getTokenLogoURI(token.id)
        });
      }
    });
  });

  // Convert to array and sort: famous tokens first, then alphabetically
  const tokens = Array.from(tokenMap.values());

  tokens.sort((a, b) => {
    const aIsFamous = FAMOUS_TOKEN_ADDRESSES.has(a.id);
    const bIsFamous = FAMOUS_TOKEN_ADDRESSES.has(b.id);

    if (aIsFamous && !bIsFamous) return -1;
    if (!aIsFamous && bIsFamous) return 1;

    return a.symbol.localeCompare(b.symbol);
  });

  return tokens;
}

/**
 * Build a bidirectional mapping of swappable tokens
 * Creates a map where each token address maps to an array of token addresses it can be swapped with
 * Works with both V2 pairs and V3 pools
 *
 * @param {Array} pools - Array of pool objects from subgraph (V2 pairs or V3 pools)
 * @returns {Object} Mapping object: { [tokenAddress]: [swappableTokenAddresses] }
 */
export function buildPoolMapping(pools) {
  const mapping = {};

  pools.forEach(pool => {
    const token0Id = pool.token0.id.toLowerCase();
    const token1Id = pool.token1.id.toLowerCase();

    // Initialize sets if not present
    if (!mapping[token0Id]) mapping[token0Id] = new Set();
    if (!mapping[token1Id]) mapping[token1Id] = new Set();

    // Add bidirectional mapping (A can swap with B, B can swap with A)
    mapping[token0Id].add(token1Id);
    mapping[token1Id].add(token0Id);
  });

  // Convert Sets to Arrays for JSON serialization
  Object.keys(mapping).forEach(key => {
    mapping[key] = Array.from(mapping[key]);
  });

  return mapping;
}

/**
 * Get all tokens that can be swapped with a given token
 *
 * @param {string} tokenAddress - Token address to query
 * @param {Object} pairMapping - Pair mapping object from buildPairMapping()
 * @returns {Array} Array of token addresses that can be swapped with the given token
 */
export function getSwappableTokens(tokenAddress, pairMapping) {
  if (!tokenAddress || !pairMapping) {
    return [];
  }

  const normalizedAddress = tokenAddress.toLowerCase();
  return pairMapping[normalizedAddress] || [];
}

/**
 * Filter pools to only include those with valid ERC20 tokens on both sides
 * Performs on-chain validation to ensure tokens are legitimate and functional
 *
 * @param {Array} pools - Array of pool objects from subgraph
 * @param {object} provider - Ethers provider for validation
 * @returns {Promise<object>} { validPools, invalidPools, stats }
 */
export async function filterValidPools(pools, provider) {
  if (!provider) {
    console.warn('No provider available, skipping token validation');
    return { validPools: pools, invalidPools: [], stats: { skipped: true } };
  }

  // Extract unique token addresses
  const uniqueTokens = new Set();
  pools.forEach(pool => {
    uniqueTokens.add(pool.token0.id);
    uniqueTokens.add(pool.token1.id);
  });

  const startTime = Date.now();
  console.log(`Validating ${uniqueTokens.size} unique tokens from ${pools.length} pools...`);

  // Validate all tokens in batch
  const validationResults = await validateTokensBatch(
    Array.from(uniqueTokens),
    provider,
    FAMOUS_TOKEN_ADDRESSES
  );

  // Filter pools where BOTH tokens are valid
  const validPools = [];
  const invalidPools = [];

  pools.forEach(pool => {
    const token0Lower = pool.token0.id.toLowerCase();
    const token1Lower = pool.token1.id.toLowerCase();

    const token0Valid = validationResults.get(token0Lower)?.valid || false;
    const token1Valid = validationResults.get(token1Lower)?.valid || false;

    if (token0Valid && token1Valid) {
      validPools.push(pool);
    } else {
      invalidPools.push({
        pool,
        invalidTokens: [
          !token0Valid && { address: pool.token0.id, symbol: pool.token0.symbol },
          !token1Valid && { address: pool.token1.id, symbol: pool.token1.symbol }
        ].filter(Boolean)
      });
    }
  });

  const stats = {
    totalPools: pools.length,
    validPools: validPools.length,
    invalidPools: invalidPools.length,
    totalTokens: uniqueTokens.size,
    validTokens: Array.from(validationResults.values()).filter(r => r.valid).length,
    validationTimeMs: Date.now() - startTime
  };

  console.log('Token validation complete:', stats);

  if (invalidPools.length > 0) {
    console.warn(`Filtered ${invalidPools.length} pools with invalid tokens`);
  }

  return { validPools, invalidPools, stats };
}

/**
 * Cached version of fetchAllPools (5 minute cache)
 * Reuses in-memory cache from subgraphApi.js
 */
export const fetchAllPoolsCached = withCache(fetchAllPools, 5 * 60 * 1000);

/**
 * Cached version of buildTokenList
 * Fetches pools with given minTVL and builds token list (5 minute cache)
 * When provider is passed, validates tokens before building list
 *
 * @param {string} minTVL - Minimum TVL filter
 * @param {object} provider - Optional provider for token validation
 */
export const buildTokenListCached = withCache(
  async (minTVL, provider = null) => {
    const pools = await fetchAllPools(minTVL);

    // If provider available, validate tokens
    let poolsToUse = pools;
    if (provider) {
      const { validPools } = await filterValidPools(pools, provider);
      poolsToUse = validPools;
      console.log(`Built token list from ${validPools.length} validated pools`);
    }

    return buildTokenList(poolsToUse);
  },
  5 * 60 * 1000
);

/**
 * Cached version of buildPoolMapping
 * Fetches pools with given minTVL and builds pool mapping (5 minute cache)
 * When provider is passed, validates tokens before building mapping
 *
 * @param {string} minTVL - Minimum TVL filter
 * @param {object} provider - Optional provider for token validation
 */
export const buildPoolMappingCached = withCache(
  async (minTVL, provider = null) => {
    const pools = await fetchAllPools(minTVL);

    // If provider available, validate tokens
    let poolsToUse = pools;
    if (provider) {
      const { validPools } = await filterValidPools(pools, provider);
      poolsToUse = validPools;
    }

    return buildPoolMapping(poolsToUse);
  },
  5 * 60 * 1000
);

/**
 * DEPRECATED: Backward compatibility aliases
 * Use fetchAllPools instead
 */
export const fetchAllPairs = fetchAllPools;
export const fetchAllPairsCached = fetchAllPoolsCached;

/**
 * DEPRECATED: Backward compatibility alias
 * Use buildPoolMapping instead
 */
export const buildPairMapping = buildPoolMapping;
export const buildPairMappingCached = buildPoolMappingCached;
