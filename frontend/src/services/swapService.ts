/**
 * Swap Service for Native ETH and ERC20 Tokens
 * Handles routing logic for Uniswap V2 Router
 */

import { ethers } from 'ethers';
import { isNativeToken, getAddressForRouting, WETH_ADDRESS } from '../constants/tokens';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: ethers.BigNumber;
  amountOutMin: ethers.BigNumber;
  recipient: string;
  deadline: number;
}

export interface SwapResult {
  tx: ethers.ContractTransaction;
  receipt: ethers.ContractReceipt;
  amounts: ethers.BigNumber[];
}

/**
 * Build swap path for router
 * - Converts native ETH (0x000...000) to WETH for path
 * - Keeps ERC20 addresses as-is
 */
export function buildSwapPath(tokenIn: string, tokenOut: string): string[] {
  const addressIn = getAddressForRouting(tokenIn);
  const addressOut = getAddressForRouting(tokenOut);
  
  console.log('🛤️ Building swap path:', {
    tokenIn,
    tokenOut,
    routingIn: addressIn,
    routingOut: addressOut,
  });
  
  return [addressIn, addressOut];
}

/**
 * Execute swap with proper native ETH handling
 * - ETH → Token: swapExactETHForTokens (with value)
 * - Token → ETH: swapExactTokensForETH
 * - Token → Token: swapExactTokensForTokens
 */
export async function executeSwap(
  params: SwapParams,
  signer: ethers.Signer
): Promise<SwapResult> {
  const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, deadline } = params;
  
  const router = new ethers.Contract(
    CONTRACT_ADDRESSES.ROUTER,
    CONTRACT_ABIS.ROUTER,
    signer
  );
  
  // Build path with WETH for routing
  const path = buildSwapPath(tokenIn, tokenOut);
  
  const isInputNative = isNativeToken(tokenIn);
  const isOutputNative = isNativeToken(tokenOut);
  
  console.log('🔄 Executing swap:', {
    tokenIn,
    tokenOut,
    isInputNative,
    isOutputNative,
    amountIn: amountIn.toString(),
    amountOutMin: amountOutMin.toString(),
    path,
  });
  
  let tx: ethers.ContractTransaction;
  
  // Case 1: ETH → Token (input is native)
  if (isInputNative && !isOutputNative) {
    console.log('💎 ETH → Token swap');
    tx = await router.swapExactETHForTokens(
      amountOutMin,
      path,
      recipient,
      deadline,
      { value: amountIn } // Send ETH as value
    );
  }
  // Case 2: Token → ETH (output is native)
  else if (!isInputNative && isOutputNative) {
    console.log('🪙 Token → ETH swap');
    tx = await router.swapExactTokensForETH(
      amountIn,
      amountOutMin,
      path,
      recipient,
      deadline
    );
  }
  // Case 3: Token → Token (neither is native)
  else if (!isInputNative && !isOutputNative) {
    console.log('🔄 Token → Token swap');
    tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      recipient,
      deadline
    );
  }
  // Case 4: ETH → ETH (invalid)
  else {
    throw new Error('Cannot swap ETH for ETH');
  }
  
  console.log('⏳ Waiting for swap tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('✅ Swap completed');
  
  // Get amounts from logs if needed
  const amounts: ethers.BigNumber[] = [amountIn, amountOutMin];
  
  return { tx, receipt, amounts };
}

/**
 * Get expected output amount (getAmountsOut)
 * Always uses WETH address in path for native ETH
 */
export async function getExpectedOutput(
  tokenIn: string,
  tokenOut: string,
  amountIn: ethers.BigNumber,
  provider: ethers.providers.Provider
): Promise<ethers.BigNumber[]> {
  const router = new ethers.Contract(
    CONTRACT_ADDRESSES.ROUTER,
    CONTRACT_ABIS.ROUTER,
    provider
  );
  
  // Build path with WETH for routing
  const path = buildSwapPath(tokenIn, tokenOut);
  
  console.log('📊 Getting expected output:', {
    amountIn: amountIn.toString(),
    path,
  });
  
  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    console.log('✅ Expected amounts:', amounts.map((a: ethers.BigNumber) => a.toString()));
    return amounts;
  } catch (error) {
    console.error('❌ Failed to get amounts out:', error);
    throw new Error(`Failed to calculate output: ${(error as Error).message}`);
  }
}

/**
 * Get required input amount (getAmountsIn)
 * Always uses WETH address in path for native ETH
 */
export async function getRequiredInput(
  tokenIn: string,
  tokenOut: string,
  amountOut: ethers.BigNumber,
  provider: ethers.providers.Provider
): Promise<ethers.BigNumber[]> {
  const router = new ethers.Contract(
    CONTRACT_ADDRESSES.ROUTER,
    CONTRACT_ABIS.ROUTER,
    provider
  );
  
  // Build path with WETH for routing
  const path = buildSwapPath(tokenIn, tokenOut);
  
  console.log('📊 Getting required input:', {
    amountOut: amountOut.toString(),
    path,
  });
  
  try {
    const amounts = await router.getAmountsIn(amountOut, path);
    console.log('✅ Required amounts:', amounts.map((a: ethers.BigNumber) => a.toString()));
    return amounts;
  } catch (error) {
    console.error('❌ Failed to get amounts in:', error);
    throw new Error(`Failed to calculate input: ${(error as Error).message}`);
  }
}

