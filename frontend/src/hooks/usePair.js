import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, INIT_CODE_HASH } from '../config/contracts';
import { computePairAddress } from '../utils/calculations';

/**
 * Hook for interacting with UniswapV2Pair contracts
 * @param {string} tokenA - Address of first token
 * @param {string} tokenB - Address of second token
 * @param {object} provider - Ethers provider
 */
export function usePair(tokenA, tokenB, provider) {
  const [pairAddress, setPairAddress] = useState(null);
  const [reserves, setReserves] = useState({ reserve0: null, reserve1: null });
  const [token0, setToken0] = useState(null);
  const [token1, setToken1] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Compute and set pair address
  useEffect(() => {
    if (!tokenA || !tokenB) {
      setPairAddress(null);
      return;
    }

    try {
      const computed = computePairAddress(
        CONTRACT_ADDRESSES.FACTORY,
        tokenA,
        tokenB,
        INIT_CODE_HASH
      );
      setPairAddress(computed);
    } catch (err) {
      setError(err.message);
    }
  }, [tokenA, tokenB]);

  // Get pair contract instance
  const getPairContract = useCallback(() => {
    if (!pairAddress || !provider) return null;
    return new ethers.Contract(pairAddress, CONTRACT_ABIS.PAIR, provider);
  }, [pairAddress, provider]);

  /**
   * Fetch current reserves and token order
   */
  const fetchReserves = useCallback(async () => {
    if (!pairAddress || !provider) return;

    setLoading(true);
    setError(null);

    try {
      const pairContract = getPairContract();

      const [reservesData, token0Address] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0()
      ]);

      setReserves({
        reserve0: reservesData[0],
        reserve1: reservesData[1]
      });
      setToken0(token0Address);
      setToken1(token0Address.toLowerCase() === tokenA.toLowerCase() ? tokenB : tokenA);

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [pairAddress, provider, getPairContract, tokenA, tokenB]);

  /**
   * Get reserves for specific tokens (ordered by input)
   */
  const getOrderedReserves = useCallback(() => {
    if (!reserves.reserve0 || !reserves.reserve1 || !token0) {
      return { reserveA: null, reserveB: null };
    }

    const isToken0A = token0.toLowerCase() === tokenA.toLowerCase();

    return {
      reserveA: isToken0A ? reserves.reserve0 : reserves.reserve1,
      reserveB: isToken0A ? reserves.reserve1 : reserves.reserve0
    };
  }, [reserves, token0, tokenA]);

  /**
   * Get LP token balance for an address
   */
  const getBalance = useCallback(
    async (address) => {
      if (!pairAddress || !provider) return ethers.BigNumber.from(0);

      try {
        const pairContract = getPairContract();
        return await pairContract.balanceOf(address);
      } catch (err) {
        throw new Error(`Failed to get LP balance: ${err.message}`);
      }
    },
    [pairAddress, provider, getPairContract]
  );

  /**
   * Get total supply of LP tokens
   */
  const getTotalSupply = useCallback(async () => {
    if (!pairAddress || !provider) return ethers.BigNumber.from(0);

    try {
      const pairContract = getPairContract();
      return await pairContract.totalSupply();
    } catch (err) {
      throw new Error(`Failed to get total supply: ${err.message}`);
    }
  }, [pairAddress, provider, getPairContract]);

  /**
   * Check if pair exists on-chain
   */
  const pairExists = useCallback(async () => {
    if (!pairAddress || !provider) return false;

    try {
      const code = await provider.getCode(pairAddress);
      return code !== '0x';
    } catch (err) {
      return false;
    }
  }, [pairAddress, provider]);

  // Auto-fetch reserves when pair address changes
  useEffect(() => {
    if (pairAddress && provider) {
      fetchReserves();
    }
  }, [pairAddress, provider, fetchReserves]);

  return {
    pairAddress,
    reserves,
    token0,
    token1,
    loading,
    error,
    fetchReserves,
    getOrderedReserves,
    getBalance,
    getTotalSupply,
    pairExists,
    pairContract: getPairContract()
  };
}
