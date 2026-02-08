/**
 * Balance Service for Native ETH and ERC20 Tokens
 * Uses viem for native balance, ethers for ERC20
 */

import { ethers } from 'ethers';
import { isNativeToken, getAddressForRouting, type Token, type TokenWithMeta } from '../constants/tokens';
import { CONTRACT_ABIS } from '../config/contracts';

export interface BalanceResult {
  balance: ethers.BigNumber;
  formatted: string;
  decimals: number;
}

/**
 * Get token balance for an address
 * - Native ETH: uses provider.getBalance()
 * - ERC20: uses contract.balanceOf()
 */
export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string,
  provider: ethers.providers.Provider,
  decimals: number = 18
): Promise<ethers.BigNumber> {
  if (!tokenAddress || !userAddress || !provider) {
    return ethers.BigNumber.from(0);
  }

  try {
    // Check if it's native ETH
    if (isNativeToken(tokenAddress)) {
      // Use provider.getBalance for native ETH
      console.log('💰 Fetching native ETH balance for:', userAddress);
      const balance = await provider.getBalance(userAddress);
      console.log('✅ Native ETH balance:', ethers.utils.formatEther(balance));
      return balance;
    }

    // ERC20 token - use contract call
    console.log('💰 Fetching ERC20 balance for token:', tokenAddress);
    const tokenContract = new ethers.Contract(
      tokenAddress,
      CONTRACT_ABIS.ERC20,
      provider
    );
    
    const balance = await tokenContract.balanceOf(userAddress);
    console.log('✅ ERC20 balance:', ethers.utils.formatUnits(balance, decimals));
    return balance;
  } catch (error) {
    console.error('❌ Failed to fetch balance:', error);
    throw new Error(`Failed to get balance: ${(error as Error).message}`);
  }
}

/**
 * Get formatted balance with decimals
 */
export async function getFormattedBalance(
  tokenAddress: string,
  userAddress: string,
  provider: ethers.providers.Provider,
  decimals: number = 18,
  maxDecimals: number = 6
): Promise<BalanceResult> {
  const balance = await getTokenBalance(tokenAddress, userAddress, provider, decimals);
  const formatted = ethers.utils.formatUnits(balance, decimals);
  
  // Format to max decimals
  const num = parseFloat(formatted);
  const formattedDisplay = num.toFixed(maxDecimals);
  
  return {
    balance,
    formatted: formattedDisplay,
    decimals,
  };
}

/**
 * Get multiple token balances at once
 */
export async function getMultipleBalances(
  tokens: Array<{ address: string; decimals: number }>,
  userAddress: string,
  provider: ethers.providers.Provider
): Promise<Map<string, ethers.BigNumber>> {
  const balances = new Map<string, ethers.BigNumber>();
  
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const balance = await getTokenBalance(
          token.address,
          userAddress,
          provider,
          token.decimals
        );
        balances.set(token.address.toLowerCase(), balance);
      } catch (error) {
        console.warn(`Failed to fetch balance for ${token.address}:`, error);
        balances.set(token.address.toLowerCase(), ethers.BigNumber.from(0));
      }
    })
  );
  
  return balances;
}

