import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, DEFAULT_SLIPPAGE } from '../config/contracts';
import { getDeadline, applySlippage } from '../utils/calculations';

/**
 * Hook for interacting with UniswapV2Router02
 * @param {object} provider - Ethers provider
 * @param {object} signer - Ethers signer
 */
export function useRouter(provider, signer) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get router contract instance
  const getRouterContract = useCallback(() => {
    if (!signer) throw new Error('Signer required');
    return new ethers.Contract(CONTRACT_ADDRESSES.ROUTER, CONTRACT_ABIS.ROUTER, signer);
  }, [signer]);

  /**
   * Swap exact tokens for tokens
   */
  const swapExactTokensForTokens = useCallback(
    async (amountIn, amountOutMin, path, deadline = getDeadline()) => {
      setLoading(true);
      setError(null);

      try {
        const router = getRouterContract();
        const signerAddress = await signer.getAddress();

        const tx = await router.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          path,
          signerAddress,
          deadline
        );

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [signer, getRouterContract]
  );

  /**
   * Swap tokens for exact tokens
   */
  const swapTokensForExactTokens = useCallback(
    async (amountOut, amountInMax, path, deadline = getDeadline()) => {
      setLoading(true);
      setError(null);

      try {
        const router = getRouterContract();
        const signerAddress = await signer.getAddress();

        const tx = await router.swapTokensForExactTokens(
          amountOut,
          amountInMax,
          path,
          signerAddress,
          deadline
        );

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [signer, getRouterContract]
  );

  /**
   * Swap exact ETH for tokens
   */
  const swapExactETHForTokens = useCallback(
    async (amountOutMin, path, value, deadline = getDeadline()) => {
      setLoading(true);
      setError(null);

      try {
        const router = getRouterContract();
        const signerAddress = await signer.getAddress();

        const tx = await router.swapExactETHForTokens(
          amountOutMin,
          path,
          signerAddress,
          deadline,
          { value }
        );

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [signer, getRouterContract]
  );

  /**
   * Swap tokens for exact ETH
   */
  const swapTokensForExactETH = useCallback(
    async (amountOut, amountInMax, path, deadline = getDeadline()) => {
      setLoading(true);
      setError(null);

      try {
        const router = getRouterContract();
        const signerAddress = await signer.getAddress();

        const tx = await router.swapTokensForExactETH(
          amountOut,
          amountInMax,
          path,
          signerAddress,
          deadline
        );

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [signer, getRouterContract]
  );

  /**
   * Add liquidity to a token pair
   */
  const addLiquidity = useCallback(
    async (
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      slippageBps = DEFAULT_SLIPPAGE,
      deadline = getDeadline()
    ) => {
      setLoading(true);
      setError(null);

      try {
        const router = getRouterContract();
        const signerAddress = await signer.getAddress();

        const amountAMin = applySlippage(amountADesired, slippageBps, true);
        const amountBMin = applySlippage(amountBDesired, slippageBps, true);

        const tx = await router.addLiquidity(
          tokenA,
          tokenB,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          signerAddress,
          deadline
        );

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [signer, getRouterContract]
  );

  /**
   * Remove liquidity from a token pair
   */
  const removeLiquidity = useCallback(
    async (
      tokenA,
      tokenB,
      liquidity,
      amountAMin,
      amountBMin,
      deadline = getDeadline()
    ) => {
      setLoading(true);
      setError(null);

      try {
        const router = getRouterContract();
        const signerAddress = await signer.getAddress();

        const tx = await router.removeLiquidity(
          tokenA,
          tokenB,
          liquidity,
          amountAMin,
          amountBMin,
          signerAddress,
          deadline
        );

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [signer, getRouterContract]
  );

  /**
   * Get amounts out for a given input amount
   */
  const getAmountsOut = useCallback(
    async (amountIn, path) => {
      try {
        const router = new ethers.Contract(
          CONTRACT_ADDRESSES.ROUTER,
          CONTRACT_ABIS.ROUTER,
          provider
        );
        return await router.getAmountsOut(amountIn, path);
      } catch (err) {
        throw new Error(`Failed to get amounts out: ${err.message}`);
      }
    },
    [provider]
  );

  /**
   * Get amounts in for a given output amount
   */
  const getAmountsIn = useCallback(
    async (amountOut, path) => {
      try {
        const router = new ethers.Contract(
          CONTRACT_ADDRESSES.ROUTER,
          CONTRACT_ABIS.ROUTER,
          provider
        );
        return await router.getAmountsIn(amountOut, path);
      } catch (err) {
        throw new Error(`Failed to get amounts in: ${err.message}`);
      }
    },
    [provider]
  );

  return {
    loading,
    error,
    swapExactTokensForTokens,
    swapTokensForExactTokens,
    swapExactETHForTokens,
    swapTokensForExactETH,
    addLiquidity,
    removeLiquidity,
    getAmountsOut,
    getAmountsIn
  };
}
