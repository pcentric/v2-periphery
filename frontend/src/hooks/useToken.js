import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ABIS, CONTRACT_ADDRESSES, GAS_LIMITS } from '../config/contracts';
import { isValidAddress, getErrorMessage } from '../utils/validation';
import { NATIVE_ETH_ADDRESS, VERIFIED_TOKENS, isNativeToken } from '../constants/tokens';

/**
 * Hook for interacting with ERC20 tokens
 * @param {string} tokenAddress - Token contract address
 * @param {object} provider - Ethers provider
 * @param {object} signer - Ethers signer (optional)
 */
export function useToken(tokenAddress, provider, signer = null) {
  const [metadata, setMetadata] = useState({
    name: '',
    symbol: '',
    decimals: 18
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(false);

  // Get token contract instance
  const getTokenContract = useCallback(
    (withSigner = false) => {
      if (!tokenAddress) return null;
      const contractProvider = withSigner && signer ? signer : provider;
      return new ethers.Contract(tokenAddress, CONTRACT_ABIS.ERC20, contractProvider);
    },
    [tokenAddress, provider, signer]
  );

  /**
   * Fetch token metadata (name, symbol, decimals)
   */
  const fetchMetadata = useCallback(async () => {
    if (!tokenAddress || !provider) {
      setIsValid(false);
      return;
    }

    // Validate address format first
    if (!isValidAddress(tokenAddress)) {
      setError('Invalid token address format');
      setIsValid(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ Handle Native ETH - no contract calls needed
      if (isNativeToken(tokenAddress)) {
        const ethToken = VERIFIED_TOKENS.ETH;
        setMetadata({
          name: ethToken.name,
          symbol: ethToken.symbol,
          decimals: ethToken.decimals
        });
        setIsValid(true);
        setLoading(false);
        return;
      }
      // First check if there's contract code at the address
      // const code = await provider.getCode(tokenAddress);
      // if (code === '0x' || code === '0x0') {
      //   setError('No contract found at this address');
      //   setIsValid(false);
      //   setLoading(false);
      //   return;
      // }

      // Create contract with flexible ABI that handles both string and bytes32 returns
      const flexibleAbi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)'
      ];

      // Alternative ABI for tokens that return bytes32 (like MKR, SAI)
      const bytes32Abi = [
        'function name() view returns (bytes32)',
        'function symbol() view returns (bytes32)'
      ];

      const tokenContract = new ethers.Contract(tokenAddress, flexibleAbi, provider);
      const bytes32Contract = new ethers.Contract(tokenAddress, bytes32Abi, provider);

      // Helper to parse bytes32 to string
      const parseBytes32String = (bytes32) => {
        try {
          // Remove null bytes and convert to string
          return ethers.utils.parseBytes32String(bytes32);
        } catch {
          // If it fails, try to decode as UTF-8 using ethers utilities
          try {
            // Remove trailing zeros and decode
            const hex = bytes32.replace(/0x/, '').replace(/(00)+$/, '');
            if (hex.length === 0) return '';
            return ethers.utils.toUtf8String('0x' + hex).trim();
          } catch {
            return 'Unknown';
          }
        }
      };

      // Fetch decimals first (most reliable)
      let decimals = 18; // Default
      try {
        const dec = await tokenContract.decimals();
        decimals = typeof dec === 'number' ? dec : dec.toNumber ? dec.toNumber() : Number(dec);
      } catch {
        console.warn('Could not fetch decimals, using default 18');
      }

      // Try to verify it's an ERC20 by calling totalSupply or balanceOf
      try {
        await tokenContract.totalSupply();
      } catch {
        try {
          await tokenContract.balanceOf(tokenAddress);
        } catch {
          setError('Not a valid ERC20 token contract');
          setIsValid(false);
          setLoading(false);
          return;
        }
      }

      // Fetch name (try string first, then bytes32)
      let name = 'Unknown Token';
      try {
        name = await tokenContract.name();
      } catch {
        try {
          const nameBytes = await bytes32Contract.name();
          name = parseBytes32String(nameBytes);
        } catch {
          console.warn('Could not fetch token name');
        }
      }

      // Fetch symbol (try string first, then bytes32)
      let symbol = '???';
      try {
        symbol = await tokenContract.symbol();
      } catch {
        try {
          const symbolBytes = await bytes32Contract.symbol();
          symbol = parseBytes32String(symbolBytes);
        } catch {
          console.warn('Could not fetch token symbol');
        }
      }

      setMetadata({ name, symbol, decimals });
      setIsValid(true);
      setLoading(false);
    } catch (err) {
      console.error('Token metadata fetch error:', err);
      setError(getErrorMessage(err));
      setIsValid(false);
      setLoading(false);
    }
  }, [tokenAddress, provider]);

  /**
   * Get token balance for an addresss
   */
  const getBalance = useCallback(
    async (address) => {
      if (!tokenAddress || !provider) return ethers.BigNumber.from(0);

      try {
        // ✅ For Native ETH, use provider.getBalance
        if (isNativeToken(tokenAddress)) {
          return await provider.getBalance(address);
        }

        // For ERC20 tokens, use contract balanceOf
        const tokenContract = getTokenContract();
        return await tokenContract.balanceOf(address);
      } catch (err) {
        throw new Error(`Failed to get balance: ${err.message}`);
      }
    },
    [tokenAddress, provider, getTokenContract]
  );

  /**
   * Get allowance for a spender
   */
  const getAllowance = useCallback(
    async (owner, spender) => {
      if (!tokenAddress || !provider) return ethers.BigNumber.from(0);

      // ✅ Native ETH doesn't need allowance - treat as max approved
      if (isNativeToken(tokenAddress)) {
        return ethers.constants.MaxUint256;
      }

      // Don't try to check allowance if token is invalid
      if (!isValidAddress(tokenAddress)) {
        return ethers.BigNumber.from(0);
      }

      try {
        const tokenContract = getTokenContract();
        return await tokenContract.allowance(owner, spender);
      } catch (err) {
        console.warn('Failed to get allowance:', getErrorMessage(err));
        return ethers.BigNumber.from(0);
      }
    },
    [tokenAddress, provider, getTokenContract]
  );

  /**
   * Approve tokens for a spender
   */
  const approve = useCallback(
    async (spender, amount) => {
      // ✅ Native ETH doesn't need approval - return success immediately
      if (isNativeToken(tokenAddress)) {
        return { transactionHash: 'native-eth-no-approval-needed' };
      }

      if (!signer) throw new Error('Signer required for approval');

      setLoading(true);
      setError(null);

      try {
        const tokenContract = getTokenContract(true);

        const tx = await tokenContract.approve(spender, amount, {
          gasLimit: GAS_LIMITS.APPROVE
        });

        const receipt = await tx.wait();
        setLoading(false);
        return receipt;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [tokenAddress, signer, getTokenContract]
  );

  /**
   * Approve maximum amount for a spender
   */
  const approveMax = useCallback(
    async (spender) => {
      return approve(spender, ethers.constants.MaxUint256);
    },
    [approve]
  );

  /**
   * Check if token needs approval
   */
  const needsApproval = useCallback(
    async (owner, spender, amount) => {
      const allowance = await getAllowance(owner, spender);
      return allowance.lt(amount);
    },
    [getAllowance]
  );

  /**
   * Approve tokens if needed
   */
  const ensureApproval = useCallback(
    async (owner, spender, amount) => {
      const needs = await needsApproval(owner, spender, amount);

      if (needs) {
        // Approve max for better UX (avoid repeated approvals)
        return await approveMax(spender);
      }

      return null; // Already approved
    },
    [needsApproval, approveMax]
  );

  // Auto-fetch metadata when token address changes
  useEffect(() => {
    if (tokenAddress && provider) {
      fetchMetadata();
    }
  }, [tokenAddress, provider, fetchMetadata]);

  return {
    ...metadata,
    loading,
    error,
    isValid,
    fetchMetadata,
    getBalance,
    getAllowance,
    approve,
    approveMax,
    needsApproval,
    ensureApproval,
    tokenContract: getTokenContract()
  };
}

/**
 * Hook for managing multiple token approvals
 */
export function useTokenApprovals(provider, signer) {
  const [approving, setApproving] = useState({});

  const approveToken = useCallback(
    async (tokenAddress, spender, amount = ethers.constants.MaxUint256) => {
      if (!signer) throw new Error('Signer required');

      setApproving((prev) => ({ ...prev, [tokenAddress]: true }));

      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          CONTRACT_ABIS.ERC20,
          signer
        );

        const tx = await tokenContract.approve(spender, amount, {
          gasLimit: GAS_LIMITS.APPROVE
        });

        await tx.wait();
        setApproving((prev) => ({ ...prev, [tokenAddress]: false }));

        return true;
      } catch (err) {
        setApproving((prev) => ({ ...prev, [tokenAddress]: false }));
        throw err;
      }
    },
    [signer]
  );

  const checkAndApprove = useCallback(
    async (tokenAddress, owner, spender, amount) => {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        CONTRACT_ABIS.ERC20,
        provider
      );

      const allowance = await tokenContract.allowance(owner, spender);

      if (allowance.lt(amount)) {
        return await approveToken(tokenAddress, spender);
      }

      return false; // Already approved
    },
    [provider, approveToken]
  );

  return {
    approving,
    approveToken,
    checkAndApprove
  };
}
