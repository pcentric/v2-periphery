import { useState, useEffect } from 'react';
import { fetchTokenPrice } from '../services/priceService';

/**
 * Hook to fetch USD price for a token
 * @param {string} tokenAddress - Token contract address
 * @param {boolean} enabled - Whether to fetch (default true)
 * @returns {{ price: number|null, loading: boolean, error: string|null }}
 */
export function useTokenPrice(tokenAddress, enabled = true) {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tokenAddress || !enabled) {
      setPrice(null);
      return;
    }

    let cancelled = false;

    const loadPrice = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedPrice = await fetchTokenPrice(tokenAddress);

        if (!cancelled) {
          setPrice(fetchedPrice);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(loadPrice, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tokenAddress, enabled]);

  return { price, loading, error };
}

/**
 * Calculate USD value for a token amount
 * @param {string} amount - Token amount (human readable)
 * @param {number|null} price - USD price per token
 * @returns {string|null} Formatted USD value or null
 */
export function calculateUsdValue(amount, price) {
  if (!amount || !price || parseFloat(amount) === 0) {
    return null;
  }

  const value = parseFloat(amount) * price;

  if (value < 0.01) {
    return '< $0.01';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}
