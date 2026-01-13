import { ethers } from 'ethers';

/**
 * Calculate output amount for a swap using constant product formula
 * @param {BigNumber} amountIn - Input amount
 * @param {BigNumber} reserveIn - Reserve of input token
 * @param {BigNumber} reserveOut - Reserve of output token
 * @returns {BigNumber} Output amount
 */
export function getAmountOut(amountIn, reserveIn, reserveOut) {
  if (amountIn.lte(0)) throw new Error('INSUFFICIENT_INPUT_AMOUNT');
  if (reserveIn.lte(0) || reserveOut.lte(0)) throw new Error('INSUFFICIENT_LIQUIDITY');

  // Apply 0.3% fee
  const amountInWithFee = amountIn.mul(997);
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = reserveIn.mul(1000).add(amountInWithFee);

  return numerator.div(denominator);
}

/**
 * Calculate input amount required for a desired output amount
 * @param {BigNumber} amountOut - Desired output amount
 * @param {BigNumber} reserveIn - Reserve of input token
 * @param {BigNumber} reserveOut - Reserve of output token
 * @returns {BigNumber} Required input amount
 */
export function getAmountIn(amountOut, reserveIn, reserveOut) {
  if (amountOut.lte(0)) throw new Error('INSUFFICIENT_OUTPUT_AMOUNT');
  if (reserveIn.lte(0) || reserveOut.lte(0)) throw new Error('INSUFFICIENT_LIQUIDITY');

  const numerator = reserveIn.mul(amountOut).mul(1000);
  const denominator = reserveOut.sub(amountOut).mul(997);

  return numerator.div(denominator).add(1);
}

/**
 * Calculate price impact of a trade
 * @param {BigNumber} amountIn - Input amount
 * @param {BigNumber} reserveIn - Reserve of input token
 * @param {BigNumber} reserveOut - Reserve of output token
 * @returns {string} Price impact as percentage string
 */
export function calculatePriceImpact(amountIn, reserveIn, reserveOut) {
  const exactQuote = amountIn.mul(reserveOut).div(reserveIn);
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);

  const impact = exactQuote.sub(amountOut).mul(10000).div(exactQuote);
  return (impact.toNumber() / 100).toFixed(2);
}

/**
 * Apply slippage tolerance to an amount
 * @param {BigNumber} amount - Amount to apply slippage to
 * @param {number} slippageBps - Slippage in basis points (50 = 0.5%)
 * @param {boolean} isMinimum - True for minimum amount out, false for maximum amount in
 * @returns {BigNumber} Amount with slippage applied
 */
export function applySlippage(amount, slippageBps, isMinimum = true) {
  const slippageFactor = 10000 - (isMinimum ? slippageBps : -slippageBps);
  return amount.mul(slippageFactor).div(10000);
}

/**
 * Format token amount for display
 * @param {BigNumber} amount - Token amount in wei
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Number of decimals to show
 * @returns {string} Formatted amount
 */
export function formatTokenAmount(amount, decimals = 18, displayDecimals = 4) {
  const formatted = ethers.utils.formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';

  return num.toFixed(displayDecimals);
}

/**
 * Parse token amount from user input
 * @param {string} amount - User input string
 * @param {number} decimals - Token decimals
 * @returns {BigNumber} Parsed amount in wei
 */
export function parseTokenAmount(amount, decimals = 18) {
  try {
    return ethers.utils.parseUnits(amount || '0', decimals);
  } catch (error) {
    return ethers.BigNumber.from(0);
  }
}

/**
 * Calculate optimal liquidity amounts
 * @param {BigNumber} amountADesired - Desired amount of token A
 * @param {BigNumber} amountBDesired - Desired amount of token B
 * @param {BigNumber} reserveA - Reserve of token A
 * @param {BigNumber} reserveB - Reserve of token B
 * @returns {Object} Optimal amounts {amountA, amountB}
 */
export function calculateOptimalLiquidityAmounts(
  amountADesired,
  amountBDesired,
  reserveA,
  reserveB
) {
  if (reserveA.isZero() && reserveB.isZero()) {
    return {
      amountA: amountADesired,
      amountB: amountBDesired
    };
  }

  const amountBOptimal = amountADesired.mul(reserveB).div(reserveA);

  if (amountBOptimal.lte(amountBDesired)) {
    return {
      amountA: amountADesired,
      amountB: amountBOptimal
    };
  }

  const amountAOptimal = amountBDesired.mul(reserveA).div(reserveB);

  return {
    amountA: amountAOptimal,
    amountB: amountBDesired
  };
}

/**
 * Calculate share of liquidity pool
 * @param {BigNumber} liquidity - Liquidity tokens to receive/burn
 * @param {BigNumber} totalSupply - Total LP token supply
 * @param {BigNumber} reserve - Reserve of a token in the pair
 * @returns {BigNumber} Share of the reserve
 */
export function calculateLiquidityShare(liquidity, totalSupply, reserve) {
  if (totalSupply.isZero()) return ethers.BigNumber.from(0);
  return liquidity.mul(reserve).div(totalSupply);
}

/**
 * Get deadline timestamp for transactions
 * @param {number} seconds - Seconds from now
 * @returns {number} Unix timestamp
 */
export function getDeadline(seconds = 1200) {
  return Math.floor(Date.now() / 1000) + seconds;
}

/**
 * Compute pair address using CREATE2
 * @param {string} factoryAddress - Factory contract address
 * @param {string} tokenA - First token address
 * @param {string} tokenB - Second token address
 * @param {string} initCodeHash - Init code hash from factory
 * @returns {string} Computed pair address
 */
export function computePairAddress(factoryAddress, tokenA, tokenB, initCodeHash) {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];

  const salt = ethers.utils.keccak256(
    ethers.utils.solidityPack(['address', 'address'], [token0, token1])
  );

  return ethers.utils.getCreate2Address(factoryAddress, salt, initCodeHash);
}
