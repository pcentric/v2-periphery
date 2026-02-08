/**
 * Approval Service for ERC20 Tokens
 * Native ETH NEVER needs approval
 */

import { ethers } from 'ethers';
import { isNativeToken } from '../constants/tokens';
import { CONTRACT_ABIS, GAS_LIMITS } from '../config/contracts';

export interface ApprovalStatus {
  isApproved: boolean;
  allowance: ethers.BigNumber;
  needsApproval: boolean;
}

/**
 * Check if token needs approval
 * Native ETH: always returns false (no approval needed)
 * ERC20: checks allowance vs required amount
 */
export async function checkApproval(
  tokenAddress: string,
  owner: string,
  spender: string,
  amount: ethers.BigNumber,
  provider: ethers.providers.Provider
): Promise<ApprovalStatus> {
  // Native ETH never needs approval
  if (isNativeToken(tokenAddress)) {
    console.log('💎 Native ETH - no approval needed');
    return {
      isApproved: true,
      allowance: ethers.constants.MaxUint256, // Infinite "allowance"
      needsApproval: false,
    };
  }

  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      CONTRACT_ABIS.ERC20,
      provider
    );
    
    const allowance = await tokenContract.allowance(owner, spender);
    const isApproved = allowance.gte(amount);
    
    console.log('🔒 Approval check:', {
      token: tokenAddress,
      allowance: allowance.toString(),
      required: amount.toString(),
      isApproved,
    });
    
    return {
      isApproved,
      allowance,
      needsApproval: !isApproved,
    };
  } catch (error) {
    console.error('❌ Failed to check approval:', error);
    return {
      isApproved: false,
      allowance: ethers.BigNumber.from(0),
      needsApproval: true,
    };
  }
}

/**
 * Approve token spending
 * Native ETH: returns null immediately (no-op)
 * ERC20: executes approval transaction
 */
export async function approveToken(
  tokenAddress: string,
  spender: string,
  amount: ethers.BigNumber,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt | null> {
  // Native ETH never needs approval - skip
  if (isNativeToken(tokenAddress)) {
    console.log('💎 Native ETH - skipping approval');
    return null;
  }

  try {
    console.log('🔓 Approving token:', {
      token: tokenAddress,
      spender,
      amount: amount.toString(),
    });
    
    const tokenContract = new ethers.Contract(
      tokenAddress,
      CONTRACT_ABIS.ERC20,
      signer
    );
    
    const tx = await tokenContract.approve(spender, amount, {
      gasLimit: GAS_LIMITS?.APPROVE || 100000,
    });
    
    console.log('⏳ Waiting for approval tx:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Token approved');
    
    return receipt;
  } catch (error) {
    console.error('❌ Approval failed:', error);
    throw error;
  }
}

/**
 * Approve unlimited amount (common UX pattern)
 * Native ETH: returns null immediately
 * ERC20: approves MaxUint256
 */
export async function approveMax(
  tokenAddress: string,
  spender: string,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt | null> {
  return approveToken(tokenAddress, spender, ethers.constants.MaxUint256, signer);
}

/**
 * Check and approve if needed (convenience function)
 * Native ETH: always returns null (no approval needed)
 * ERC20: approves if allowance insufficient
 */
export async function ensureApproval(
  tokenAddress: string,
  owner: string,
  spender: string,
  amount: ethers.BigNumber,
  provider: ethers.providers.Provider,
  signer: ethers.Signer
): Promise<ethers.ContractReceipt | null> {
  // Check current approval status
  const status = await checkApproval(tokenAddress, owner, spender, amount, provider);
  
  if (!status.needsApproval) {
    console.log('✅ Already approved or native ETH');
    return null;
  }
  
  // Approve max for better UX (avoid repeated approvals)
  console.log('🔄 Approval needed, approving max amount...');
  return approveMax(tokenAddress, spender, signer);
}

