import { ethers } from 'ethers';
import { validationCache } from './validationCache.js';

/**
 * Check if a string is a valid Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Check if an address has contract code (is a contract)
 * @param {string} address - Address to check
 * @param {object} provider - Ethers provider
 * @returns {Promise<boolean>} True if contract exists
 */
export async function isContract(address, provider) {
  if (!isValidAddress(address) || !provider) return false;

  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch {
    return false;
  }
}

/**
 * Check if a contract implements ERC20 interface
 * @param {string} address - Token contract address
 * @param {object} provider - Ethers provider
 * @returns {Promise<boolean>} True if valid ERC20
 */
export async function isValidERC20(address, provider) {
  if (!isValidAddress(address) || !provider) return false;

  try {
    // Check if contract exists
    const hasCode = await isContract(address, provider);
    if (!hasCode) return false;

    // Try to call basic ERC20 methods with flexible return types
    // Some tokens return uint256 for decimals instead of uint8
    const abi = [
      'function totalSupply() view returns (uint256)',
      'function decimals() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ];

    const contract = new ethers.Contract(address, abi, provider);

    // Try calling methods individually with timeout
    // Some tokens may not implement all methods exactly
    const timeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);

    // Try totalSupply first (most reliable ERC20 indicator)
    try {
      await timeout(contract.totalSupply(), 10000);
    } catch {
      // If totalSupply fails, try balanceOf as fallback
      try {
        await timeout(contract.balanceOf(address), 10000);
      } catch {
        return false;
      }
    }

    // Try decimals - if it fails, that's okay, we'll use default 18
    // This makes validation more lenient for edge case tokens
    try {
      const decimals = await timeout(contract.decimals(), 10000);
      // Validate decimals is a reasonable value (0-255)
      if (decimals < 0 || decimals > 255) {
        return false;
      }
    } catch {
      // Some tokens don't have decimals() - still consider valid
      // We'll default to 18 decimals when fetching metadata
    }

    return true;
  } catch (err) {
    console.warn('ERC20 validation failed:', err.message);
    return false;
  }
}

/**
 * Sanitize and validate an address input
 * @param {string} address - Address to sanitize
 * @returns {string|null} Checksummed address or null
 */
export function sanitizeAddress(address) {
  if (!address || typeof address !== 'string') return null;

  const trimmed = address.trim();
  if (!isValidAddress(trimmed)) return null;

  try {
    return ethers.utils.getAddress(trimmed);
  } catch {
    return null;
  }
}

/**
 * Validate and format user input amount
 * @param {string} amount - Amount string
 * @returns {boolean} True if valid number
 */
export function isValidAmount(amount) {
  if (!amount || typeof amount !== 'string') return false;

  // Check if it's a valid number
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return false;

  // Check for reasonable decimal places (max 18)
  const parts = amount.split('.');
  if (parts.length > 2) return false;
  if (parts[1] && parts[1].length > 18) return false;

  return true;
}

/**
 * Get error message for common contract errors
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  const message = error?.message || error?.toString() || 'Unknown error';

  if (message.includes('CALL_EXCEPTION')) {
    return 'Invalid token address or contract not found';
  }

  if (message.includes('INSUFFICIENT_')) {
    return 'Insufficient balance or liquidity';
  }

  if (message.includes('user rejected')) {
    return 'Transaction rejected by user';
  }

  if (message.includes('execution reverted')) {
    return 'Transaction failed - check token addresses and balances';
  }

  if (message.includes('nonce')) {
    return 'Transaction nonce error - please reset MetaMask';
  }

  // Return first line of error message if short enough
  const firstLine = message.split('\n')[0];
  if (firstLine.length < 100) {
    return firstLine;
  }

  return 'Transaction failed - check console for details';
}

/**
 * Validate a token by checking on-chain contract and ERC20 interface
 *
 * @param {string} tokenAddress - Token address to validate
 * @param {object} provider - Ethers provider
 * @returns {Promise<object>} Validation result { valid: boolean, error?: string }
 */
export async function validateToken(tokenAddress, provider) {
  if (!provider) {
    return { valid: false, error: 'No provider available' };
  }

  try {
    // 1. Check address format
    if (!isValidAddress(tokenAddress)) {
      return { valid: false, error: 'Invalid address format' };
    }

    // 2. Get checksummed address
    const checksummed = ethers.utils.getAddress(tokenAddress);

    // 3. Check contract exists
    const isContractValid = await isContract(checksummed, provider);
    if (!isContractValid) {
      return { valid: false, error: 'No contract at address' };
    }

    // 4. Check ERC20 interface (symbol and decimals)
    const contract = new ethers.Contract(
      checksummed,
      [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
      ],
      provider
    );

    // 5-second timeout per token to prevent hanging
    await Promise.race([
      Promise.all([contract.symbol(), contract.decimals()]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid ERC20 contract' };
  }
}

/**
 * Validate multiple tokens in parallel batches
 * Uses cache to avoid re-validating known tokens
 * Skips famous tokens which are known to be valid
 *
 * @param {Array<string>} tokenAddresses - Array of token addresses to validate
 * @param {object} provider - Ethers provider
 * @param {Set<string>} famousTokens - Set of famous token addresses (lowercase) to skip validation
 * @param {number} concurrency - Number of concurrent validations (default: 10)
 * @returns {Promise<Map>} Map of address -> { valid: boolean, error?: string, cached?: boolean, famous?: boolean }
 */
export async function validateTokensBatch(
  tokenAddresses,
  provider,
  famousTokens = new Set(),
  concurrency = 10
) {
  const results = new Map();
  const toValidate = [];

  // Step 1: Check cache and famous tokens
  for (const address of tokenAddresses) {
    const lowerAddress = address.toLowerCase();

    // Skip validation for famous tokens (known-good)
    if (famousTokens.has(lowerAddress)) {
      results.set(lowerAddress, { valid: true, cached: true, famous: true });
      continue;
    }

    // Check cache
    const cached = validationCache.get(lowerAddress);
    if (cached !== null) {
      results.set(lowerAddress, { ...cached, cached: true });
      continue;
    }

    toValidate.push(address);
  }

  const cacheStats = validationCache.getStats();
  console.log(`Validating tokens: ${famousTokens.size} famous, ${results.size - famousTokens.size} cached, ${toValidate.length} new. Cache stats:`, cacheStats);

  // Step 2: Validate in parallel batches
  if (toValidate.length > 0) {
    const batches = [];
    for (let i = 0; i < toValidate.length; i += concurrency) {
      batches.push(toValidate.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const validations = batch.map(address =>
        validateToken(address, provider)
          .then(result => ({ address, result }))
          .catch(error => ({
            address,
            result: { valid: false, error: error.message }
          }))
      );

      const batchResults = await Promise.allSettled(validations);

      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          const { address, result } = settled.value;
          const lowerAddress = address.toLowerCase();
          results.set(lowerAddress, result);
          validationCache.set(lowerAddress, result);
        }
      }
    }
  }

  return results;
}
