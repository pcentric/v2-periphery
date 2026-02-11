import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3React } from '../providers/Web3Provider';
import { useRouter } from '../hooks/useRouter';
import { useToken } from '../hooks/useToken';
import { usePair } from '../hooks/usePair';
import { CONTRACT_ADDRESSES, DEFAULT_SLIPPAGE } from '../config/contracts';
import {
  parseTokenAmount,
  formatTokenAmount,
  applySlippage,
  calculatePriceImpact,
  getDeadline
} from '../utils/calculations';
import { useSafeSwap, useSwapValidation, useFilteredOutputTokens } from '../hooks/useSafeSwap';
import { VERIFIED_TOKENS, getAddressForRouting, isNativeToken } from '../constants/tokens';                                                                                               
                                          
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

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

/**
 * TokenListModal Component
 * Displays a filterable list of tokens with search functionality
 */
function TokenListModal({
  isOpen,
  tokens,
  selectedToken,
  onSelectToken,
  onClose,
  title = 'Select a token'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = React.useRef(null);

  // Filter tokens based on search query (memoized to prevent unnecessary re-renders)
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return tokens;
    }

    const query = searchQuery.toLowerCase();
    return tokens.filter(
      token =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [searchQuery, tokens]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="token-modal-overlay">
      <div className="token-modal" ref={modalRef}>
        {/* Modal Header */}
        <div className="token-modal-header">
          <h3>{title}</h3>
          <button
            className="token-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search Input */}
        <div className="token-modal-search">
          <input
            type="text"
            placeholder="Search by symbol, name, or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="token-search-input"
          />
        </div>

        {/* Token List */}
        <div className="token-list">
          {filteredTokens.length === 0 ? (
            <div className="token-list-empty">
              {tokens.length === 0 ? (
                <p>Loading tokens...</p>
              ) : (
                <p>No tokens found matching "{searchQuery}"</p>
              )}
            </div>
          ) : (
            filteredTokens.map((token) => (
              <button
                key={token.id}
                className={`token-list-item ${
                  selectedToken?.id === token.id ? 'selected' : ''
                }`}
                onClick={() => {
                  onSelectToken(token);
                  onClose();
                }}
                aria-label={`Select ${token.symbol}`}
              >
                <div className="token-list-item-logo">
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="token-logo-img"
                      onError={(e) => {
                        // Fallback to a simple background if logo fails to load
                        e.target.style.display = 'none';
                        e.target.parentElement.textContent = token.symbol.charAt(0);
                      }}
                    />
                  ) : (
                    <div className="token-logo-fallback">
                      {token.symbol.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="token-list-item-info">
                  <div className="token-list-item-symbol">{token.symbol}</div>
                  <div className="token-list-item-name">{token.name}</div>
                </div>

                {selectedToken?.id === token.id && (
                  <div className="token-list-item-checkmark">✓</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function SwapComponent() {
  // Use Web3React hook for provider and account
  const { account: userAddress, library, chainId, active } = useWeb3React();
  
  // Extract provider and signer from library
  const provider = library;
  const signer = library && userAddress ? library.getSigner() : null;

  // Token addresses - Start with WETH and USDC as defaults
  const [tokenIn, setTokenIn] = useState(VERIFIED_TOKENS.WETH.address);
  const [tokenOut, setTokenOut] = useState(VERIFIED_TOKENS.USDC.address);

  // Amounts
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');

  // UI state
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [showSettings, setShowSettings] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [balanceIn, setBalanceIn] = useState(null);
  const [balanceOut, setBalanceOut] = useState(null);

  // Modal state
  const [activeModal, setActiveModal] = useState(null); // 'tokenIn' | 'tokenOut' | null

  // Safe swap hook - provides verified tokens and pair mapping with fast initial load
  const { 
    tokens, 
    pairMapping, 
    loading: pairMappingLoading, 
    error: pairMappingError, 
    canSwap,
    isInitialLoad 
  } = useSafeSwap();
  
  // Get filtered output tokens based on selected input token - use WETH address for native ETH
  const filteredOutputTokens = useFilteredOutputTokens(getAddressForRouting(tokenIn), pairMapping);
  
  // Validate swap pair - use WETH address for native ETH
  const swapValidation = useSwapValidation(
    getAddressForRouting(tokenIn), 
    getAddressForRouting(tokenOut), 
    pairMapping
  );

  // Hooks
  const router = useRouter(provider, signer);
  const tokenInHook = useToken(tokenIn, provider, signer);
  const tokenOutHook = useToken(tokenOut, provider);
  // ✅ Use getAddressForRouting for pair lookups (native ETH -> WETH)
  const pair = usePair(getAddressForRouting(tokenIn), getAddressForRouting(tokenOut), provider);

  // Log swap validation status
  useEffect(() => {
    if (!swapValidation.isValid && tokenInHook.isValid && tokenOutHook.isValid) {
      console.warn(swapValidation.message);
    }
  }, [swapValidation, tokenInHook.isValid, tokenOutHook.isValid]);

  // Log wallet connection
  useEffect(() => {
    if (userAddress) {
      console.log('✅ Wallet connected:', userAddress);
    }
  }, [userAddress]);

  // Debug: Log configuration
  useEffect(() => {
    console.log('🔧 SwapComponent Configuration:', {
      hasProvider: !!provider,
      hasSigner: !!signer,
      active,
      userAddress,
      chainId,
      routerAddress: CONTRACT_ADDRESSES?.ROUTER || 'NOT SET',
      defaultSlippage: DEFAULT_SLIPPAGE,
    });

    if (!CONTRACT_ADDRESSES?.ROUTER) {
      console.error('⚠️ WARNING: Router address is not configured!');
      console.error('Check CONTRACT_ADDRESSES in config/contracts.js');
    }
  }, [provider, signer, active, userAddress, chainId]);

  // 🚀 OPTIMIZED: Fetch balances with parallel requests and proper cancellation
  useEffect(() => {
    if (!userAddress) {
      setBalanceIn(null);
      setBalanceOut(null);
      return;
    }

    let isCancelled = false;

    const fetchBalances = async () => {
      // 🚀 Fetch both balances in parallel for better performance
      const promises = [];
      
      if (tokenInHook.isValid) {
        promises.push(
          tokenInHook.getBalance(userAddress)
            .then(bal => ({ type: 'in', balance: bal }))
            .catch(e => {
              console.error('Failed to fetch input token balance:', e.message);
              return { type: 'in', balance: null };
            })
        );
      } else {
        promises.push(Promise.resolve({ type: 'in', balance: null }));
      }

      if (tokenOutHook.isValid) {
        promises.push(
          tokenOutHook.getBalance(userAddress)
            .then(bal => ({ type: 'out', balance: bal }))
            .catch(e => {
              console.error('Failed to fetch output token balance:', e.message);
              return { type: 'out', balance: null };
            })
        );
      } else {
        promises.push(Promise.resolve({ type: 'out', balance: null }));
      }

      // Wait for all balances to load
      const results = await Promise.all(promises);
      
      if (!isCancelled) {
        results.forEach(result => {
          if (result.type === 'in') {
            setBalanceIn(result.balance);
          } else {
            setBalanceOut(result.balance);
          }
        });
      }
    };

    fetchBalances();

    return () => {
      isCancelled = true;
    };
  }, [userAddress, tokenIn, tokenOut, tokenInHook.isValid, tokenOutHook.isValid]);

  // Check approval status
  useEffect(() => {
    // ✅ Native ETH doesn't need approval
    if (isNativeToken(tokenIn)) {
      setIsApproved(true);
      console.log('Approval status: ✅ Native ETH (no approval needed)');
      return;
    }

    if (!tokenIn || !userAddress || !amountIn || !tokenInHook.isValid || !CONTRACT_ADDRESSES?.ROUTER) {
      setIsApproved(false);
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amountIn);
    if (isNaN(amountValue) || amountValue <= 0) {
      setIsApproved(false);
      return;
    }

    let isCancelled = false;

    const checkApproval = async () => {
      try {
        const amount = parseTokenAmount(amountIn, tokenInHook.decimals);
        const allowance = await tokenInHook.getAllowance(userAddress, CONTRACT_ADDRESSES.ROUTER);
        
        if (!isCancelled) {
          const approved = allowance.gte(amount);
          setIsApproved(approved);
          console.log('Approval status:', approved ? '✅ Approved' : '❌ Not approved');
        }
      } catch (err) {
        console.error('Failed to check approval:', err.message);
        if (!isCancelled) {
          setIsApproved(false);
        }
      }
    };

    // Debounce approval check
    const timeoutId = setTimeout(() => {
      checkApproval();
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [tokenIn, userAddress, amountIn, tokenInHook.decimals, tokenInHook.isValid]);

  // Calculate output amount
  useEffect(() => {
    // Early return if essential data is missing
    if (!amountIn || !tokenInHook.isValid || !tokenOutHook.isValid) {
      setAmountOut('');
      return;
    }

    // Validate amount is a number
    const amountValue = parseFloat(amountIn);
    if (isNaN(amountValue) || amountValue <= 0) {
      setAmountOut('');
      return;
    }

    // Calculate output using router (doesn't require pair reserves)
    let isCancelled = false;
    const calculateOutput = async () => {
      try {
        const amountInParsed = parseTokenAmount(amountIn, tokenInHook.decimals);
        // ✅ Use getAddressForRouting to handle native ETH -> WETH conversion for routing
        const path = [getAddressForRouting(tokenIn), getAddressForRouting(tokenOut)];
        
        console.log('🔄 Calculating output for:', {
          amountIn,
          tokenIn: tokenInHook.symbol,
          tokenOut: tokenOutHook.symbol,
          path,
        });
        
        const amounts = await router.getAmountsOut(amountInParsed, path);
        
        // Only update if this effect hasn't been cancelled
        if (!isCancelled && amounts && amounts[1]) {
          const output = formatTokenAmount(amounts[1], tokenOutHook.decimals);
          console.log('✅ Output calculated:', output, tokenOutHook.symbol);
          setAmountOut(output);
        }
      } catch (err) {
        console.error('❌ Failed to calculate output:', err.message);
        if (!isCancelled) {
          setAmountOut('');
        }
      }
    };

    // Debounce calculation to reduce API calls
    const timeoutId = setTimeout(() => {
      calculateOutput();
    }, 300); // 300ms debounce

    // Cleanup function
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [amountIn, tokenIn, tokenOut, tokenInHook.decimals, tokenInHook.isValid, tokenInHook.symbol, tokenOutHook.decimals, tokenOutHook.isValid, tokenOutHook.symbol, router]);

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

  // Handle token selection from modal
  const handleTokenSelect = (token, type) => {
    // Prevent selecting the same token for both fields
    if (type === 'in' && tokenOut.toLowerCase() === token.address.toLowerCase()) {
      console.warn('Cannot select the same token for both input and output');
      return;
    }
    if (type === 'out' && tokenIn.toLowerCase() === token.address.toLowerCase()) {
      console.warn('Cannot select the same token for both input and output');
      return;
    }

    // Update token address
    if (type === 'in') {
      setTokenIn(token.address);
    } else {
      setTokenOut(token.address);
    } 

    // Close modal
    setActiveModal(null);
  };

  // Handle approval
  const handleApprove = async () => {
    try {
      // Validation checks
      if (!signer) {
        console.error('No signer available. Please connect your wallet.');
        alert('Please connect your wallet first');
        return;
      }

      if (!userAddress) {
        console.error('User address not set');
        alert('Unable to get wallet address. Please reconnect your wallet.');
        return;
      }

      if (!CONTRACT_ADDRESSES?.ROUTER) {
        console.error('Router address not configured');
        alert('Router contract address is not configured. Please check your setup.');
        return;
      }

      if (!tokenInHook.isValid) {
        console.error('Input token is not valid');
        alert('Please select a valid input token');
        return;
      }

      if (!amountIn || parseFloat(amountIn) <= 0) {
        console.error('Invalid amount');
        alert('Please enter a valid amount');
        return;
      }

      console.log('Approving token...', {
        token: tokenIn,
        symbol: tokenInHook.symbol,
        spender: CONTRACT_ADDRESSES.ROUTER,
        amount: amountIn,
      });

      const amount = parseTokenAmount(amountIn, tokenInHook.decimals);
      await tokenInHook.ensureApproval(userAddress, CONTRACT_ADDRESSES.ROUTER, amount);
      
      console.log('✅ Approval successful');
      setIsApproved(true);
    } catch (err) {
      console.error('Approval failed:', err);
      
      // User-friendly error messages
      let errorMessage = 'Token approval failed. ';
      
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage += 'You rejected the transaction.';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds for gas fee.';
      } else if (err.message?.includes('ENS')) {
        errorMessage += 'Configuration error. Please check your setup.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
    }
  };

  // Handle swap
  const handleSwap = async () => {
    if (!isApproved) return;

    try {
      // Validation checks
      if (!signer) {
        console.error('No signer available');
        alert('Please connect your wallet first');
        return;
      }

      if (!userAddress) {
        console.error('User address not set');
        alert('Unable to get wallet address. Please reconnect your wallet.');
        return;
      }

      if (!tokenInHook.isValid || !tokenOutHook.isValid) {
        console.error('Invalid tokens');
        alert('Please select valid tokens');
        return;
      }

      console.log('Executing swap...', {
        tokenIn: tokenInHook.symbol,
        tokenOut: tokenOutHook.symbol,
        amountIn,
        amountOut,
        slippage: slippage / 100 + '%',
      });

      const amountInParsed = parseTokenAmount(amountIn, tokenInHook.decimals);
      const amountOutParsed = parseTokenAmount(amountOut, tokenOutHook.decimals);
      const amountOutMin = applySlippage(amountOutParsed, slippage, true);
      // ✅ Use getAddressForRouting to handle native ETH -> WETH conversion for routing
      const path = [getAddressForRouting(tokenIn), getAddressForRouting(tokenOut)];
      const deadline = getDeadline();

      // ✅ Use appropriate swap method based on token types
      const isInputNative = isNativeToken(tokenIn);
      const isOutputNative = isNativeToken(tokenOut);

      if (isInputNative && !isOutputNative) {
        // ETH → Token: Use swapExactETHForTokens with msg.value
        console.log('💎 Executing ETH → Token swap');
        // swapExactETHForTokens(amountOutMin, path, value, deadline)
        await router.swapExactETHForTokens(amountOutMin, path, amountInParsed, deadline);
      } else if (!isInputNative && isOutputNative) {
        // Token → ETH: Use swapExactTokensForETH
        console.log('🪙 Executing Token → ETH swap');
        // swapExactTokensForETH(amountIn, amountOutMin, path, deadline)
        await router.swapExactTokensForETH(amountInParsed, amountOutMin, path, deadline);
      } else if (!isInputNative && !isOutputNative) {
        // Token → Token: Use swapExactTokensForTokens
        console.log('🔄 Executing Token → Token swap');
        await router.swapExactTokensForTokens(amountInParsed, amountOutMin, path, deadline);
      } else {
        throw new Error('Cannot swap ETH for ETH');
      }

      console.log('✅ Swap successful');

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
      
      // User-friendly error messages
      let errorMessage = 'Swap failed. ';
      
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage += 'You rejected the transaction.';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds for gas fee.';
      } else if (err.message?.includes('slippage')) {
        errorMessage += 'Price changed too much. Try increasing slippage tolerance.';
      } else if (err.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
        errorMessage += 'Insufficient output amount. Try increasing slippage tolerance.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
    }
  };

  // Button state
  const getButtonState = () => {
    // Check wallet connection first
    if (!signer || !userAddress) {
      return { text: 'Connect Wallet', disabled: true };
    }
    
    if (!tokenInHook.isValid || !tokenOutHook.isValid) {
      return { text: 'Select a token', disabled: true };
    }
    
    if (!swapValidation.isValid) {
      return { text: swapValidation.message || 'No swap pair available', disabled: true };
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
              <button
                className="token-selector"
                onClick={() => setActiveModal('tokenIn')}
              >
                <div className="token-icon" />
                <span className="token-symbol">{tokenInHook.symbol}</span>
                <ChevronDownIcon />
              </button>
            ) : (
              <button
                className="token-selector select-token"
                onClick={() => setActiveModal('tokenIn')}
              >
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
              <button
                className="token-selector"
                onClick={() => setActiveModal('tokenOut')}
              >
                <div className="token-icon" />
                <span className="token-symbol">{tokenOutHook.symbol}</span>
                <ChevronDownIcon />
              </button>
            ) : (
              <button
                className="token-selector select-token"
                onClick={() => setActiveModal('tokenOut')}
              >
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

      {/* Loading/Error Messages - Only show during initial load and only as inline indicator */}
      {pairMappingLoading && isInitialLoad && (
        <div className="swap-body">
          <div style={{ 
            padding: '0.75rem', 
            textAlign: 'center',
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <div className="spinner" style={{ width: '14px', height: '14px' }}>
              <svg viewBox="0 0 50 50" style={{ animation: 'rotate 2s linear infinite' }}>
                <circle
                  className="spinner-path"
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  strokeWidth="4"
                />
              </svg>
            </div>
            Loading token pairs...
          </div>
        </div>
      )}
      
      {pairMappingError && (
        <div className="swap-body" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div className="error-message">
            Failed to load liquidity data: {pairMappingError}
          </div>
        </div>
      )}
      
      {router.error && (
        <div className="swap-body">
          <div className="error-message">{router.error}</div>
        </div>
      )}

      {/* Token List Modals */}
      <TokenListModal
        isOpen={activeModal === 'tokenIn'}
        tokens={tokens}
        selectedToken={tokenInHook.isValid ? { id: tokenIn.toLowerCase(), ...tokenInHook } : null}
        onSelectToken={(token) => handleTokenSelect(token, 'in')}
        onClose={() => setActiveModal(null)}
        title="Select input token"
      />

      <TokenListModal
        isOpen={activeModal === 'tokenOut'}
        tokens={filteredOutputTokens}
        selectedToken={tokenOutHook.isValid ? { id: tokenOut.toLowerCase(), ...tokenOutHook } : null}
        onSelectToken={(token) => handleTokenSelect(token, 'out')}
        onClose={() => setActiveModal(null)}
        title="Select output token"
      />
    </div>
  );
}
