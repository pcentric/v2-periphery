/**
 * useSafeSwap Hook
 * Provides safe token swap functionality with verified tokens only
 * Handles pair mapping and dynamic token filtering
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTokenList, getTokenByAddress } from '../constants/tokens';
import { fetchPairMapping, getSwappableTokens } from '../services/pairService';

/**
 * Hook for safe token swapping
 * @returns {Object} - { tokens, pairMapping, loading, error, getOutputTokens, refresh }
 */
export function useSafeSwap() {
  const [pairMapping, setPairMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get all verified tokens
  const tokens = useMemo(() => getTokenList(), []);

  /**
   * Load pair mapping from subgraph
   */
  const loadPairMapping = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const mapping = await fetchPairMapping(forceRefresh);
      setPairMapping(mapping);

      console.log('✅ Pair mapping loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load pair mapping:', err);
      setError(err.message || 'Failed to load token pairs');
      
      // Set empty mapping on error to prevent undefined errors
      setPairMapping({});
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get available output tokens for a given input token
   * @param {string} inputTokenAddress - Address of the input token
   * @returns {Array} - Array of token objects that can be swapped with
   */
  const getOutputTokens = useCallback(
    (inputTokenAddress) => {
      if (!inputTokenAddress || !pairMapping) {
        return tokens; // Return all tokens if no input selected
      }

      const swappableAddresses = getSwappableTokens(inputTokenAddress, pairMapping);
      
      if (swappableAddresses.length === 0) {
        console.warn(`No swappable tokens found for ${inputTokenAddress}`);
        return [];
      }

      // Map addresses to token objects
      const swappableTokens = swappableAddresses
        .map(addr => getTokenByAddress(addr))
        .filter(Boolean); // Remove any nulls

      return swappableTokens;
    },
    [pairMapping, tokens]
  );

  /**
   * Check if two tokens can be swapped
   * @param {string} tokenInAddress - Input token address
   * @param {string} tokenOutAddress - Output token address
   * @returns {boolean} - True if swap is possible
   */
  const canSwap = useCallback(
    (tokenInAddress, tokenOutAddress) => {
      if (!tokenInAddress || !tokenOutAddress || !pairMapping) {
        return false;
      }

      const swappableAddresses = getSwappableTokens(tokenInAddress, pairMapping);
      return swappableAddresses.includes(tokenOutAddress.toLowerCase());
    },
    [pairMapping]
  );

  /**
   * Get statistics about available pairs
   */
  const getStats = useCallback(() => {
    const totalTokens = tokens.length;
    const tokensWithPairs = Object.keys(pairMapping).length;
    const totalPairs = Object.values(pairMapping).reduce(
      (sum, pairs) => sum + pairs.length,
      0
    ) / 2; // Divide by 2 because pairs are bidirectional

    return {
      totalTokens,
      tokensWithPairs,
      totalPairs,
      loaded: !loading,
      hasError: !!error,
    };
  }, [tokens, pairMapping, loading, error]);

  // Load pair mapping on mount
  useEffect(() => {
    loadPairMapping();
  }, [loadPairMapping]);

  return {
    // Token data
    tokens,
    pairMapping,
    
    // Loading state
    loading,
    error,
    
    // Helper functions
    getOutputTokens,
    canSwap,
    getStats,
    refresh: () => loadPairMapping(true),
  };
}

/**
 * Hook to get filtered output tokens based on selected input token
 * @param {string} inputTokenAddress - Selected input token address
 * @param {Object} pairMapping - Pair mapping object
 * @returns {Array} - Filtered token list
 */
export function useFilteredOutputTokens(inputTokenAddress, pairMapping) {
  return useMemo(() => {
    const allTokens = getTokenList();
    
    if (!inputTokenAddress || !pairMapping) {
      return allTokens;
    }

    const swappableAddresses = getSwappableTokens(inputTokenAddress, pairMapping);
    
    if (swappableAddresses.length === 0) {
      return [];
    }

    // Filter tokens to only include swappable ones
    return allTokens.filter(token => 
      swappableAddresses.includes(token.addressLower)
    );
  }, [inputTokenAddress, pairMapping]);
}

/**
 * Hook to validate if a swap pair is valid
 * @param {string} tokenInAddress - Input token address
 * @param {string} tokenOutAddress - Output token address
 * @param {Object} pairMapping - Pair mapping object
 * @returns {Object} - { isValid, message }
 */
export function useSwapValidation(tokenInAddress, tokenOutAddress, pairMapping) {
  return useMemo(() => {
    // If either token is not selected, don't show error
    if (!tokenInAddress || !tokenOutAddress) {
      return { isValid: true, message: '' };
    }

    // Check if tokens are the same
    if (tokenInAddress.toLowerCase() === tokenOutAddress.toLowerCase()) {
      return { 
        isValid: false, 
        message: 'Cannot swap a token for itself' 
      };
    }

    // Check if pair mapping is loaded
    if (!pairMapping || Object.keys(pairMapping).length === 0) {
      return { 
        isValid: false, 
        message: 'Loading pair data...' 
      };
    }

    // Check if swap is possible
    const swappableAddresses = getSwappableTokens(tokenInAddress, pairMapping);
    const isValid = swappableAddresses.includes(tokenOutAddress.toLowerCase());

    if (!isValid) {
      const tokenIn = getTokenByAddress(tokenInAddress);
      const tokenOut = getTokenByAddress(tokenOutAddress);
      const tokenInSymbol = tokenIn?.symbol || 'Token';
      const tokenOutSymbol = tokenOut?.symbol || 'Token';
      
      return {
        isValid: false,
        message: `No liquidity pool available for ${tokenInSymbol}/${tokenOutSymbol}`,
      };
    }

    return { isValid: true, message: '' };
  }, [tokenInAddress, tokenOutAddress, pairMapping]);
}

