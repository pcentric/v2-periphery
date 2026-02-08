/**
 * Liquidity Service for Native ETH and ERC20 Tokens
 * Handles add/remove liquidity with proper ETH routing
 */

import { ethers } from 'ethers';
import { isNativeToken, getAddressForRouting } from '../constants/tokens';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';

export interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountADesired: ethers.BigNumber;
  amountBDesired: ethers.BigNumber;
  amountAMin: ethers.BigNumber;
  amountBMin: ethers.BigNumber;
  recipient: string;
  deadline: number;
}

export interface RemoveLiquidityParams {
  tokenA: string;
  tokenB: string;
  liquidity: ethers.BigNumber;
  amountAMin: ethers.BigNumber;
  amountBMin: ethers.BigNumber;
  recipient: string;
  deadline: number;
}

/**
 * Add liquidity with native ETH support
 * - ETH + Token: addLiquidityETH (with value)
 * - Token + Token: addLiquidity
 */
export async function addLiquidity(
  params: AddLiquidityParams,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt> {
  const {
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    recipient,
    deadline,
  } = params;
  
  const router = new ethers.Contract(
    CONTRACT_ADDRESSES.ROUTER,
    CONTRACT_ABIS.ROUTER,
    signer
  );
  
  const isANative = isNativeToken(tokenA);
  const isBNative = isNativeToken(tokenB);
  
  // Can't have both tokens as native ETH
  if (isANative && isBNative) {
    throw new Error('Cannot add liquidity between ETH and ETH');
  }
  
  let tx: ethers.ContractTransaction;
  
  // Case 1: ETH + Token
  if (isANative || isBNative) {
    // Determine which is ETH and which is the token
    const tokenAddress = isANative ? getAddressForRouting(tokenB) : getAddressForRouting(tokenA);
    const tokenDesired = isANative ? amountBDesired : amountADesired;
    const tokenMin = isANative ? amountBMin : amountAMin;
    const ethDesired = isANative ? amountADesired : amountBDesired;
    const ethMin = isANative ? amountAMin : amountBMin;
    
    console.log('💎 Adding liquidity ETH + Token:', {
      token: tokenAddress,
      tokenDesired: tokenDesired.toString(),
      ethDesired: ethDesired.toString(),
    });
    
    tx = await router.addLiquidityETH(
      tokenAddress,
      tokenDesired,
      tokenMin,
      ethMin,
      recipient,
      deadline,
      { value: ethDesired } // Send ETH as value
    );
  }
  // Case 2: Token + Token
  else {
    const routingA = getAddressForRouting(tokenA);
    const routingB = getAddressForRouting(tokenB);
    
    console.log('🔄 Adding liquidity Token + Token:', {
      tokenA: routingA,
      tokenB: routingB,
      amountA: amountADesired.toString(),
      amountB: amountBDesired.toString(),
    });
    
    tx = await router.addLiquidity(
      routingA,
      routingB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      recipient,
      deadline
    );
  }
  
  console.log('⏳ Waiting for add liquidity tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('✅ Liquidity added');
  
  return receipt;
}

/**
 * Remove liquidity with native ETH support
 * - ETH + Token: removeLiquidityETH
 * - Token + Token: removeLiquidity
 */
export async function removeLiquidity(
  params: RemoveLiquidityParams,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt> {
  const {
    tokenA,
    tokenB,
    liquidity,
    amountAMin,
    amountBMin,
    recipient,
    deadline,
  } = params;
  
  const router = new ethers.Contract(
    CONTRACT_ADDRESSES.ROUTER,
    CONTRACT_ABIS.ROUTER,
    signer
  );
  
  const isANative = isNativeToken(tokenA);
  const isBNative = isNativeToken(tokenB);
  
  // Can't have both tokens as native ETH
  if (isANative && isBNative) {
    throw new Error('Cannot remove liquidity between ETH and ETH');
  }
  
  let tx: ethers.ContractTransaction;
  
  // Case 1: ETH + Token
  if (isANative || isBNative) {
    // Determine which is ETH and which is the token
    const tokenAddress = isANative ? getAddressForRouting(tokenB) : getAddressForRouting(tokenA);
    const tokenMin = isANative ? amountBMin : amountAMin;
    const ethMin = isANative ? amountAMin : amountBMin;
    
    console.log('💎 Removing liquidity ETH + Token:', {
      token: tokenAddress,
      liquidity: liquidity.toString(),
    });
    
    tx = await router.removeLiquidityETH(
      tokenAddress,
      liquidity,
      tokenMin,
      ethMin,
      recipient,
      deadline
    );
  }
  // Case 2: Token + Token
  else {
    const routingA = getAddressForRouting(tokenA);
    const routingB = getAddressForRouting(tokenB);
    
    console.log('🔄 Removing liquidity Token + Token:', {
      tokenA: routingA,
      tokenB: routingB,
      liquidity: liquidity.toString(),
    });
    
    tx = await router.removeLiquidity(
      routingA,
      routingB,
      liquidity,
      amountAMin,
      amountBMin,
      recipient,
      deadline
    );
  }
  
  console.log('⏳ Waiting for remove liquidity tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('✅ Liquidity removed');
  
  return receipt;
}

