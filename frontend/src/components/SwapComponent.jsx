import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useRouter } from '../hooks/useRouter';
import { useToken } from '../hooks/useToken';
import { usePair } from '../hooks/usePair';
import { CONTRACT_ADDRESSES, DEFAULT_SLIPPAGE, TEST_TOKENS } from '../config/contracts';
import {
  parseTokenAmount,
  formatTokenAmount,
  applySlippage,
  calculatePriceImpact,
  getDeadline
} from '../utils/calculations';

// Icons
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

export function SwapComponent({ provider, signer }) {
  // Token addresses
  const [tokenIn, setTokenIn] = useState(TEST_TOKENS?.TOKEN_A || '');
  const [tokenOut, setTokenOut] = useState(TEST_TOKENS?.TOKEN_B || '');

  // Amounts
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');

  // UI state
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [showSettings, setShowSettings] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [balanceIn, setBalanceIn] = useState(null);
  const [balanceOut, setBalanceOut] = useState(null);

  // Hooks
  const router = useRouter(provider, signer);
  const tokenInHook = useToken(tokenIn, provider, signer);
  const tokenOutHook = useToken(tokenOut, provider);
  const pair = usePair(tokenIn, tokenOut, provider);

  // Get user address
  useEffect(() => {
    if (signer) {
      signer.getAddress().then(setUserAddress);
    }
  }, [signer]);

  // Fetch balances
  useEffect(() => {
    if (!userAddress) return;

    const fetchBalances = async () => {
      if (tokenInHook.isValid) {
        try {
          const bal = await tokenInHook.getBalance(userAddress);
          setBalanceIn(bal);
        } catch (e) {
          setBalanceIn(null);
        }
      }
      if (tokenOutHook.isValid) {
        try {
          const bal = await tokenOutHook.getBalance(userAddress);
          setBalanceOut(bal);
        } catch (e) {
          setBalanceOut(null);
        }
      }
    };

    fetchBalances();
  }, [userAddress, tokenInHook.isValid, tokenOutHook.isValid, tokenInHook, tokenOutHook]);

  // Check approval status
  useEffect(() => {
    if (!tokenIn || !userAddress || !amountIn || !tokenInHook.isValid) {
      setIsApproved(false);
      return;
    }

    const checkApproval = async () => {
      try {
        const amount = parseTokenAmount(amountIn, tokenInHook.decimals);
        const allowance = await tokenInHook.getAllowance(userAddress, CONTRACT_ADDRESSES.ROUTER);
        setIsApproved(allowance.gte(amount));
      } catch (err) {
        setIsApproved(false);
      }
    };

    checkApproval();
  }, [tokenIn, userAddress, amountIn, tokenInHook]);

  // Calculate output amount
  useEffect(() => {
    if (!amountIn || !pair.reserves.reserve0 || !pair.reserves.reserve1 || 
        !tokenInHook.isValid || !tokenOutHook.isValid) {
      setAmountOut('');
      return;
    }

    const calculateOutput = async () => {
      try {
        const amountInParsed = parseTokenAmount(amountIn, tokenInHook.decimals);
        const path = [tokenIn, tokenOut];
        const amounts = await router.getAmountsOut(amountInParsed, path);
        const output = formatTokenAmount(amounts[1], tokenOutHook.decimals);
        setAmountOut(output);
      } catch (err) {
        setAmountOut('');
      }
    };

    calculateOutput();
  }, [amountIn, tokenIn, tokenOut, pair, router, tokenInHook, tokenOutHook]);

  // Calculate price impact
  const priceImpact = useMemo(() => {
    if (!amountIn || !pair.reserves.reserve0 || !pair.reserves.reserve1) {
      return '0.00';
    }
    try {
      const amountInParsed = parseTokenAmount(amountIn, tokenInHook.decimals);
      const { reserveA } = pair.getOrderedReserves();
      return calculatePriceImpact(amountInParsed, reserveA, pair.reserves.reserve1);
    } catch {
      return '0.00';
    }
  }, [amountIn, pair, tokenInHook.decimals]);

  // Swap tokens direction
  const handleSwapDirection = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut('');
  };

  // Handle max button
  const handleMax = () => {
    if (balanceIn) {
      setAmountIn(formatTokenAmount(balanceIn, tokenInHook.decimals, 18));
    }
  };

  // Handle approval
  const handleApprove = async () => {
    try {
      const amount = parseTokenAmount(amountIn, tokenInHook.decimals);
      await tokenInHook.ensureApproval(userAddress, CONTRACT_ADDRESSES.ROUTER, amount);
      setIsApproved(true);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  // Handle swap
  const handleSwap = async () => {
    if (!isApproved) return;

    try {
      const amountInParsed = parseTokenAmount(amountIn, tokenInHook.decimals);
      const amountOutParsed = parseTokenAmount(amountOut, tokenOutHook.decimals);
      const amountOutMin = applySlippage(amountOutParsed, slippage, true);
      const path = [tokenIn, tokenOut];
      const deadline = getDeadline();

      await router.swapExactTokensForTokens(amountInParsed, amountOutMin, path, deadline);

      // Reset and refresh
      setAmountIn('');
      setAmountOut('');
      
      // Refresh balances
      if (userAddress && tokenInHook.isValid) {
        const bal = await tokenInHook.getBalance(userAddress);
        setBalanceIn(bal);
      }
      if (userAddress && tokenOutHook.isValid) {
        const bal = await tokenOutHook.getBalance(userAddress);
        setBalanceOut(bal);
      }
    } catch (err) {
      console.error('Swap failed:', err);
    }
  };

  // Button state
  const getButtonState = () => {
    if (!tokenInHook.isValid || !tokenOutHook.isValid) {
      return { text: 'Select a token', disabled: true };
    }
    if (!amountIn || parseFloat(amountIn) === 0) {
      return { text: 'Enter an amount', disabled: true };
    }
    if (balanceIn && parseTokenAmount(amountIn, tokenInHook.decimals).gt(balanceIn)) {
      return { text: `Insufficient ${tokenInHook.symbol} balance`, disabled: true };
    }
    if (!isApproved) {
      return { text: `Approve ${tokenInHook.symbol}`, disabled: false, isApprove: true };
    }
    if (router.loading) {
      return { text: 'Swapping...', disabled: true, loading: true };
    }
    return { text: 'Swap', disabled: false };
  };

  const buttonState = getButtonState();

  return (
    <div className="swap-card">
      {/* Header */}
      <div className="swap-header">
        <h2>Swap</h2>
        <button 
          className="settings-button" 
          onClick={() => setShowSettings(!showSettings)}
        >
          <SettingsIcon />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="swap-body">
          <div className="settings-panel">
            <h4>Slippage Tolerance</h4>
            <div className="slippage-options">
              {[10, 50, 100].map((val) => (
                <button
                  key={val}
                  className={`slippage-option ${slippage === val ? 'active' : ''}`}
                  onClick={() => setSlippage(val)}
                >
                  {val / 100}%
                </button>
              ))}
              <div className="slippage-option slippage-custom">
                <input
                  type="number"
                  value={slippage / 100}
                  onChange={(e) => setSlippage(Math.round(parseFloat(e.target.value || 0) * 100))}
                  placeholder="0.5"
                />
                %
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Swap Body */}
      <div className="swap-body">
        {/* Token In */}
        <div className={`token-input-box ${tokenIn && !tokenInHook.isValid && !tokenInHook.loading ? 'has-error' : ''}`}>
          <div className="token-input-row">
            <span className="token-input-label">You pay</span>
            {balanceIn && (
              <span className="token-balance">
                Balance: {formatTokenAmount(balanceIn, tokenInHook.decimals, 4)}
                <button onClick={handleMax}>MAX</button>
              </span>
            )}
          </div>
          <div className="token-input-main">
            <input
              type="text"
              className="amount-input"
              placeholder="0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
            />
            {tokenInHook.isValid ? (
              <button className="token-selector">
                <div className="token-icon" />
                <span className="token-symbol">{tokenInHook.symbol}</span>
                <ChevronDownIcon />
              </button>
            ) : (
              <button className="token-selector select-token">
                Select
                <ChevronDownIcon />
              </button>
            )}
          </div>
          <input
            type="text"
            className="token-address-input"
            placeholder="Paste token address (0x...)"
            value={tokenIn}
            onChange={(e) => setTokenIn(e.target.value)}
          />
          {tokenInHook.loading && (
            <div className="token-status loading">Validating token...</div>
          )}
          {tokenInHook.error && (
            <div className="token-status error">{tokenInHook.error}</div>
          )}
        </div>

        {/* Swap Direction Button */}
        <div className="swap-direction-wrapper">
          <button className="swap-direction-button" onClick={handleSwapDirection}>
            <ArrowDownIcon />
          </button>
        </div>

        {/* Token Out */}
        <div className={`token-input-box ${tokenOut && !tokenOutHook.isValid && !tokenOutHook.loading ? 'has-error' : ''}`}>
          <div className="token-input-row">
            <span className="token-input-label">You receive</span>
            {balanceOut && (
              <span className="token-balance">
                Balance: {formatTokenAmount(balanceOut, tokenOutHook.decimals, 4)}
              </span>
            )}
          </div>
          <div className="token-input-main">
            <input
              type="text"
              className="amount-input"
              placeholder="0"
              value={amountOut}
              readOnly
            />
            {tokenOutHook.isValid ? (
              <button className="token-selector">
                <div className="token-icon" />
                <span className="token-symbol">{tokenOutHook.symbol}</span>
                <ChevronDownIcon />
              </button>
            ) : (
              <button className="token-selector select-token">
                Select
                <ChevronDownIcon />
              </button>
            )}
          </div>
          <input
            type="text"
            className="token-address-input"
            placeholder="Paste token address (0x...)"
            value={tokenOut}
            onChange={(e) => setTokenOut(e.target.value)}
          />
          {tokenOutHook.loading && (
            <div className="token-status loading">Validating token...</div>
          )}
          {tokenOutHook.error && (
            <div className="token-status error">{tokenOutHook.error}</div>
          )}
        </div>

        {/* Swap Details */}
        {amountIn && amountOut && tokenInHook.isValid && tokenOutHook.isValid && (
          <div className="swap-details">
            <div className="swap-detail-row">
              <span className="label">Rate</span>
              <span className="value">
                1 {tokenInHook.symbol} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {tokenOutHook.symbol}
              </span>
            </div>
            <div className="swap-detail-row">
              <span className="label">Price Impact</span>
              <span className={`value ${parseFloat(priceImpact) > 5 ? 'danger' : parseFloat(priceImpact) > 2 ? 'warning' : ''}`}>
                {priceImpact}%
              </span>
            </div>
            <div className="swap-detail-row">
              <span className="label">Minimum received</span>
              <span className="value">
                {(parseFloat(amountOut) * (1 - slippage / 10000)).toFixed(6)} {tokenOutHook.symbol}
              </span>
            </div>
            <div className="swap-detail-row">
              <span className="label">Slippage tolerance</span>
              <span className="value">{slippage / 100}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Swap Button */}
      <div className="swap-footer">
        <button
          className={`swap-button ${buttonState.isApprove ? 'approve' : ''} ${buttonState.loading ? 'loading' : ''}`}
          disabled={buttonState.disabled}
          onClick={buttonState.isApprove ? handleApprove : handleSwap}
        >
          {buttonState.text}
        </button>
      </div>

      {/* Error Message */}
      {router.error && (
        <div className="swap-body">
          <div className="error-message">{router.error}</div>
        </div>
      )}
    </div>
  );
}
