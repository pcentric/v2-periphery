/**
 * CoinGecko Price Service
 * Uses Arbitrum-specific token price endpoint
 * Free tier: 10-30 calls/minute
 * API: https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one';

// Price cache (5 minute TTL)
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch USD price for a token by contract address
 * @param {string} tokenAddress - Token contract address on Arbitrum
 * @returns {Promise<number|null>} USD price or null
 */
export async function fetchTokenPrice(tokenAddress) {
  if (!tokenAddress) return null;

  const address = tokenAddress.toLowerCase();

  // Check cache
  const cached = priceCache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}?contract_addresses=${address}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const price = data[address]?.usd || null;

    // Cache result (even if null to avoid repeated failed lookups)
    priceCache.set(address, {
      price,
      timestamp: Date.now()
    });

    return price;
  } catch (error) {
    console.error(`Failed to fetch price for ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Fetch multiple token prices at once (batch request)
 * @param {string[]} tokenAddresses - Array of token addresses
 * @returns {Promise<Map<string, number|null>>} Map of address to price
 */
export async function fetchTokenPrices(tokenAddresses) {
  if (!tokenAddresses || tokenAddresses.length === 0) {
    return new Map();
  }

  const uniqueAddresses = [...new Set(tokenAddresses.map(a => a.toLowerCase()))];

  // Check cache first
  const priceMap = new Map();
  const addressesToFetch = [];

  uniqueAddresses.forEach(address => {
    const cached = priceCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      priceMap.set(address, cached.price);
    } else {
      addressesToFetch.push(address);
    }
  });

  // If all cached, return immediately
  if (addressesToFetch.length === 0) {
    return priceMap;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}?contract_addresses=${addressesToFetch.join(',')}&vs_currencies=usd`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    addressesToFetch.forEach(address => {
      const price = data[address]?.usd || null;
      priceMap.set(address, price);

      // Update cache
      priceCache.set(address, {
        price,
        timestamp: Date.now()
      });
    });

    return priceMap;
  } catch (error) {
    console.error('Failed to fetch token prices:', error);
    // Return partial results (cached values)
    return priceMap;
  }
}

/**
 * Clear price cache (useful for testing)
 */
export function clearPriceCache() {
  priceCache.clear();
}
