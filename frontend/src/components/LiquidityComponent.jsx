import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useRouter } from '../hooks/useRouter';
import { useToken } from '../hooks/useToken';
import { usePair } from '../hooks/usePair';
import { CONTRACT_ADDRESSES, DEFAULT_SLIPPAGE, TEST_TOKENS } from '../config/contracts';
import {
  parseTokenAmount,
  formatTokenAmount,
  calculateOptimalLiquidityAmounts,
  calculateLiquidityShare,
  getDeadline
} from '../utils/calculations';

// Icons
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

export function LiquidityComponent({ provider, signer }) {
  // Token addresses
  const [tokenA, setTokenA] = useState(TEST_TOKENS?.TOKEN_A || '');
  const [tokenB, setTokenB] = useState(TEST_TOKENS?.TOKEN_B || '');

  // Amounts
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  // Remove liquidity
  const [liquidityToRemove, setLiquidityToRemove] = useState('');
  const [lpBalance, setLpBalance] = useState(ethers.BigNumber.from(0));

  // UI state
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [mode, setMode] = useState('add');
  const [showSettings, setShowSettings] = useState(false);
  const [isApprovedA, setIsApprovedA] = useState(false);
  const [isApprovedB, setIsApprovedB] = useState(false);
  const [balanceA, setBalanceA] = useState(null);
  const [balanceB, setBalanceB] = useState(null);
  const [userAddress, setUserAddress] = useState('');

  // Hooks
  const router = useRouter(provider, signer);
  const tokenAHook = useToken(tokenA, provider, signer);
  const tokenBHook = useToken(tokenB, provider, signer);
  const pair = usePair(tokenA, tokenB, provider);

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
      if (tokenAHook.isValid) {
        try {
          const bal = await tokenAHook.getBalance(userAddress);
          setBalanceA(bal);
        } catch (e) {
          setBalanceA(null);
        }
      }
      if (tokenBHook.isValid) {
        try {
          const bal = await tokenBHook.getBalance(userAddress);
          setBalanceB(bal);
        } catch (e) {
          setBalanceB(null);
        }
      }
    };

    fetchBalances();
  }, [userAddress, tokenAHook.isValid, tokenBHook.isValid, tokenAHook, tokenBHook]);

  // Fetch LP balance
  useEffect(() => {
    if (!pair.pairAddress || !userAddress) return;

    const fetchLPBalance = async () => {
      try {
        const balance = await pair.getBalance(userAddress);
        setLpBalance(balance);
      } catch (err) {
        console.error('Failed to fetch LP balance:', err);
      }
    };

    fetchLPBalance();
  }, [pair.pairAddress, userAddress, pair]);

  // Check approval for token A
  useEffect(() => {
    if (!tokenA || !userAddress || !amountA || !tokenAHook.isValid) {
      setIsApprovedA(false);
      return;
    }

    const checkApproval = async () => {
      try {
        const amount = parseTokenAmount(amountA, tokenAHook.decimals);
        const allowance = await tokenAHook.getAllowance(userAddress, CONTRACT_ADDRESSES.ROUTER);
        setIsApprovedA(allowance.gte(amount));
      } catch (err) {
        setIsApprovedA(false);
      }
    };

    checkApproval();
  }, [tokenA, userAddress, amountA, tokenAHook]);

  // Check approval for token B
  useEffect(() => {
    if (!tokenB || !userAddress || !amountB || !tokenBHook.isValid) {
      setIsApprovedB(false);
      return;
    }

    const checkApproval = async () => {
      try {
        const amount = parseTokenAmount(amountB, tokenBHook.decimals);
        const allowance = await tokenBHook.getAllowance(userAddress, CONTRACT_ADDRESSES.ROUTER);
        setIsApprovedB(allowance.gte(amount));
      } catch (err) {
        setIsApprovedB(false);
      }
    };

    checkApproval();
  }, [tokenB, userAddress, amountB, tokenBHook]);

  // Calculate optimal amounts
  useEffect(() => {
    if (!amountA || !pair.reserves.reserve0 || !pair.reserves.reserve1 || 
        !tokenAHook.isValid || !tokenBHook.isValid) {
      return;
    }

    const calculateOptimal = async () => {
      try {
        const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
        const amountBDesired = parseTokenAmount(amountB || '999999999', tokenBHook.decimals);

        const { reserveA, reserveB } = pair.getOrderedReserves();
        if (!reserveA || !reserveB || reserveA.isZero()) return;

        const { amountB: optimalB } = calculateOptimalLiquidityAmounts(
          amountAParsed,
          amountBDesired,
          reserveA,
          reserveB
        );

        setAmountB(formatTokenAmount(optimalB, tokenBHook.decimals));
      } catch (err) {
        console.error('Failed to calculate optimal amount:', err);
      }
    };

    calculateOptimal();
  }, [amountA, tokenA, tokenB, pair, tokenAHook.decimals, tokenBHook.decimals, tokenAHook.isValid, tokenBHook.isValid]);

  // Handle approve A
  const handleApproveA = async () => {
    if (!tokenAHook.isValid) return;
    try {
      const amount = parseTokenAmount(amountA, tokenAHook.decimals);
      await tokenAHook.ensureApproval(userAddress, CONTRACT_ADDRESSES.ROUTER, amount);
      setIsApprovedA(true);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  // Handle approve B
  const handleApproveB = async () => {
    if (!tokenBHook.isValid) return;
    try {
      const amount = parseTokenAmount(amountB, tokenBHook.decimals);
      await tokenBHook.ensureApproval(userAddress, CONTRACT_ADDRESSES.ROUTER, amount);
      setIsApprovedB(true);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!isApprovedA || !isApprovedB) return;

    try {
      const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
      const amountBParsed = parseTokenAmount(amountB, tokenBHook.decimals);

      await router.addLiquidity(
        tokenA,
        tokenB,
        amountAParsed,
        amountBParsed,
        slippage,
        getDeadline()
      );

      setAmountA('');
      setAmountB('');

      // Refresh balances
      const balance = await pair.getBalance(userAddress);
      setLpBalance(balance);
    } catch (err) {
      console.error('Add liquidity failed:', err);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    try {
      const liquidityAmount = parseTokenAmount(liquidityToRemove, 18);

      if (liquidityAmount.gt(lpBalance)) {
        return;
      }

      // Approve LP tokens
      const pairContract = pair.pairContract;
      if (pairContract) {
        const allowance = await pairContract.allowance(userAddress, CONTRACT_ADDRESSES.ROUTER);

        if (allowance.lt(liquidityAmount)) {
          const approveTx = await pairContract
            .connect(signer)
            .approve(CONTRACT_ADDRESSES.ROUTER, ethers.constants.MaxUint256);
          await approveTx.wait();
        }
      }

      const totalSupply = await pair.getTotalSupply();
      const { reserveA, reserveB } = pair.getOrderedReserves();

      const amountAMin = calculateLiquidityShare(liquidityAmount, totalSupply, reserveA)
        .mul(10000 - slippage)
        .div(10000);

      const amountBMin = calculateLiquidityShare(liquidityAmount, totalSupply, reserveB)
        .mul(10000 - slippage)
        .div(10000);

      await router.removeLiquidity(
        tokenA,
        tokenB,
        liquidityAmount,
        amountAMin,
        amountBMin,
        getDeadline()
      );

      setLiquidityToRemove('');

      const balance = await pair.getBalance(userAddress);
      setLpBalance(balance);
    } catch (err) {
      console.error('Remove liquidity failed:', err);
    }
  };

  // Get button state for add liquidity
  const getAddButtonState = () => {
    if (!tokenAHook.isValid || !tokenBHook.isValid) {
      return { text: 'Select tokens', disabled: true };
    }
    if (!amountA || !amountB) {
      return { text: 'Enter amounts', disabled: true };
    }
    if (!isApprovedA) {
      return { text: `Approve ${tokenAHook.symbol}`, disabled: false, approveA: true };
    }
    if (!isApprovedB) {
      return { text: `Approve ${tokenBHook.symbol}`, disabled: false, approveB: true };
    }
    if (router.loading) {
      return { text: 'Adding...', disabled: true, loading: true };
    }
    return { text: 'Add Liquidity', disabled: false };
  };

  const addButtonState = getAddButtonState();

  return (
    <div className="liquidity-card">
      {/* Header */}
      <div className="liquidity-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}</h2>
          <button 
            className="settings-button" 
            onClick={() => setShowSettings(!showSettings)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <SettingsIcon />
          </button>
        </div>
        
        <div className="liquidity-tabs">
          <button
            className={mode === 'add' ? 'active' : ''}
            onClick={() => setMode('add')}
          >
            Add
          </button>
          <button
            className={mode === 'remove' ? 'active' : ''}
            onClick={() => setMode('remove')}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="liquidity-body">
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
            </div>
          </div>
        </div>
      )}

      <div className="liquidity-body">
        {mode === 'add' ? (
          <>
            {/* Token A Input */}
            <div className={`token-input-box ${tokenA && !tokenAHook.isValid && !tokenAHook.loading ? 'has-error' : ''}`}>
              <div className="token-input-row">
                <span className="token-input-label">Token A</span>
                {balanceA && (
                  <span className="token-balance">
                    Balance: {formatTokenAmount(balanceA, tokenAHook.decimals, 4)}
                  </span>
                )}
              </div>
              <div className="token-input-main">
                <input
                  type="text"
                  className="amount-input"
                  placeholder="0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                />
                {tokenAHook.isValid ? (
                  <button className="token-selector">
                    <div className="token-icon" />
                    <span className="token-symbol">{tokenAHook.symbol}</span>
                    <ChevronDownIcon />
                  </button>
                ) : (
                  <button className="token-selector select-token">
                    Select <ChevronDownIcon />
                  </button>
                )}
              </div>
              <input
                type="text"
                className="token-address-input"
                placeholder="Paste token address (0x...)"
                value={tokenA}
                onChange={(e) => setTokenA(e.target.value)}
              />
              {tokenAHook.loading && <div className="token-status loading">Validating...</div>}
              {tokenAHook.error && <div className="token-status error">{tokenAHook.error}</div>}
            </div>

            {/* Plus Divider */}
            <div className="plus-divider">
              <div className="plus-icon">+</div>
            </div>

            {/* Token B Input */}
            <div className={`token-input-box ${tokenB && !tokenBHook.isValid && !tokenBHook.loading ? 'has-error' : ''}`}>
              <div className="token-input-row">
                <span className="token-input-label">Token B</span>
                {balanceB && (
                  <span className="token-balance">
                    Balance: {formatTokenAmount(balanceB, tokenBHook.decimals, 4)}
                  </span>
                )}
              </div>
              <div className="token-input-main">
                <input
                  type="text"
                  className="amount-input"
                  placeholder="0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                />
                {tokenBHook.isValid ? (
                  <button className="token-selector">
                    <div className="token-icon" />
                    <span className="token-symbol">{tokenBHook.symbol}</span>
                    <ChevronDownIcon />
                  </button>
                ) : (
                  <button className="token-selector select-token">
                    Select <ChevronDownIcon />
                  </button>
                )}
              </div>
              <input
                type="text"
                className="token-address-input"
                placeholder="Paste token address (0x...)"
                value={tokenB}
                onChange={(e) => setTokenB(e.target.value)}
              />
              {tokenBHook.loading && <div className="token-status loading">Validating...</div>}
              {tokenBHook.error && <div className="token-status error">{tokenBHook.error}</div>}
            </div>

            {/* Pool Info */}
            {pair.pairAddress && pair.reserves.reserve0 && (
              <div className="pool-info">
                <h4>Pool Information</h4>
                <div className="pool-stat">
                  <span className="label">Pair</span>
                  <span className="value">{pair.pairAddress.slice(0, 8)}...{pair.pairAddress.slice(-6)}</span>
                </div>
                <div className="pool-stat">
                  <span className="label">{tokenAHook.symbol} Reserve</span>
                  <span className="value">{formatTokenAmount(pair.getOrderedReserves().reserveA, tokenAHook.decimals, 2)}</span>
                </div>
                <div className="pool-stat">
                  <span className="label">{tokenBHook.symbol} Reserve</span>
                  <span className="value">{formatTokenAmount(pair.getOrderedReserves().reserveB, tokenBHook.decimals, 2)}</span>
                </div>
              </div>
            )}

            {/* Add Button */}
            <button
              className={`swap-button ${addButtonState.approveA || addButtonState.approveB ? 'approve' : ''}`}
              style={{ marginTop: '1rem' }}
              disabled={addButtonState.disabled}
              onClick={
                addButtonState.approveA ? handleApproveA :
                addButtonState.approveB ? handleApproveB :
                handleAddLiquidity
              }
            >
              {addButtonState.text}
            </button>
          </>
        ) : (
          <>
            {/* Remove Liquidity */}
            <div className="token-input-box">
              <div className="token-input-row">
                <span className="token-input-label">LP Tokens to Remove</span>
                <span className="token-balance">
                  Balance: {formatTokenAmount(lpBalance, 18, 6)} LP
                  <button onClick={() => setLiquidityToRemove(formatTokenAmount(lpBalance, 18, 18))}>
                    MAX
                  </button>
                </span>
              </div>
              <div className="token-input-main">
                <input
                  type="text"
                  className="amount-input"
                  placeholder="0"
                  value={liquidityToRemove}
                  onChange={(e) => setLiquidityToRemove(e.target.value)}
                />
                <button className="token-selector">
                  <span className="token-symbol">LP</span>
                </button>
              </div>
            </div>

            {/* Remove Button */}
            <button
              className="swap-button"
              style={{ marginTop: '1rem' }}
              disabled={!liquidityToRemove || router.loading}
              onClick={handleRemoveLiquidity}
            >
              {router.loading ? 'Removing...' : 'Remove Liquidity'}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {router.error && (
        <div className="liquidity-body">
          <div className="error-message">{router.error}</div>
        </div>
      )}
    </div>
  );
}
