import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3React } from '../providers/Web3Provider';
import { useRouter } from '../hooks/useRouter';
import { useToken } from '../hooks/useToken';
import { usePair } from '../hooks/usePair';
import { useSafeSwap } from '../hooks/useSafeSwap';
import { useTokenPrice, calculateUsdValue } from '../hooks/useTokenPrice';
import { CONTRACT_ADDRESSES, DEFAULT_SLIPPAGE, TEST_TOKENS } from '../config/contracts';
import {
  parseTokenAmount,
  formatTokenAmount,
  calculateOptimalLiquidityAmounts,
  calculateLiquidityShare,
  getDeadline,
  applySlippage
} from '../utils/calculations';
import { TransactionModal } from './TransactionModal';
import { ApprovalModal } from './ApprovalModal';

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

/**
 * LiquidityComponent
 * 
 * DECIMAL HANDLING:
 * - Token A decimals: Fetched from contract via tokenAHook.decimals
 * - Token B decimals: Fetched from contract via tokenBHook.decimals
 * - LP token decimals: Fetched from pair contract via lpDecimals state
 * - No hardcoded decimals! All values from blockchain contracts
 */
export function LiquidityComponent() {
  // Use Web3React hook for provider and account
  const { account: userAddress, library, chainId, active } = useWeb3React();
  
  // Extract provider and signer from library
  const provider = library;
  const signer = library && userAddress ? library.getSigner() : null;

  // Token addresses
  const [tokenA, setTokenA] = useState(TEST_TOKENS?.TOKEN_A || '');
  const [tokenB, setTokenB] = useState(TEST_TOKENS?.TOKEN_B || '');

  // Amounts
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');

  // Remove liquidity
  const [liquidityToRemove, setLiquidityToRemove] = useState('');
  const [lpBalance, setLpBalance] = useState(ethers.BigNumber.from(0));
  const [lpDecimals, setLpDecimals] = useState(18); // Will be fetched from contract

  // UI state
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [mode, setMode] = useState('add');
  const [showSettings, setShowSettings] = useState(false);
  const [isApprovedA, setIsApprovedA] = useState(false);
  const [isApprovedB, setIsApprovedB] = useState(false);
  const [balanceA, setBalanceA] = useState(null);
  const [balanceB, setBalanceB] = useState(null);
  const [approvalCheckTrigger, setApprovalCheckTrigger] = useState(0); // Force re-check approvals

  // Modal state
  const [activeModal, setActiveModal] = useState(null); // 'tokenA' | 'tokenB' | null
  
  // Approval modal state
  const [approvalModal, setApprovalModal] = useState({
    isOpen: false,
    token: null,
    amount: null,
    spender: null,
    tokenType: null, // 'A' or 'B'
  });

  // Transaction modal state
  const [txModal, setTxModal] = useState({
    isOpen: false,
    status: '', // 'pending' | 'success' | 'error'
    txHash: null,
    error: null,
    type: ''
  });

  // Hooks
  const router = useRouter(provider, signer);
  const tokenAHook = useToken(tokenA, provider, signer); // Fetches decimals from contract
  const tokenBHook = useToken(tokenB, provider, signer); // Fetches decimals from contract
  const pair = usePair(tokenA, tokenB, provider);

  // Fetch USD prices
  const tokenAPrice = useTokenPrice(tokenA, tokenAHook.isValid);
  const tokenBPrice = useTokenPrice(tokenB, tokenBHook.isValid);

  // Calculate USD values
  const usdValueA = calculateUsdValue(amountA, tokenAPrice.price);
  const usdValueB = calculateUsdValue(amountB, tokenBPrice.price);

  // Get verified token list and pair mapping
  const { tokens, pairMapping, loading: tokensLoading, error: tokensError } = useSafeSwap();



  // Debug: Log configuration on mount
  useEffect(() => {
    console.log('🔧 LiquidityComponent Configuration:', {
      hasProvider: !!provider,
      hasSigner: !!signer,
      routerAddress: CONTRACT_ADDRESSES?.ROUTER || 'NOT SET',
      defaultSlippage: DEFAULT_SLIPPAGE,
      note: 'All token decimals fetched from contracts (not hardcoded)',
    });

    if (!CONTRACT_ADDRESSES?.ROUTER) {
      console.error('⚠️ WARNING: Router address is not configured!');
      console.error('Check CONTRACT_ADDRESSES in config/contracts.js');
    }
  }, []);

  // Debug: Log approval state changes
  useEffect(() => {
    console.log('🔒 Approval State Update:', {
      tokenA: tokenAHook.symbol || 'not selected',
      tokenB: tokenBHook.symbol || 'not selected',
      isApprovedA,
      isApprovedB,
      bothApproved: isApprovedA && isApprovedB,
    });
  }, [isApprovedA, isApprovedB, tokenAHook.symbol, tokenBHook.symbol]);

  // Fetch balances
  useEffect(() => {
    if (!userAddress) {
      setBalanceA(null);
      setBalanceB(null);
      return;
    }

    let isCancelled = false;

    const fetchBalances = async () => {
      // Fetch Token A balance
      if (tokenAHook.isValid) {
        try {
          const bal = await tokenAHook.getBalance(userAddress);
          if (!isCancelled) {
            setBalanceA(bal);
          }
        } catch (e) {
          console.error('Failed to fetch Token A balance:', e.message);
          if (!isCancelled) {
            setBalanceA(null);
          }
        }
      } else {
        setBalanceA(null);
      }

      // Fetch Token B balance
      if (tokenBHook.isValid) {
        try {
          const bal = await tokenBHook.getBalance(userAddress);
          if (!isCancelled) {
            setBalanceB(bal);
          }
        } catch (e) {
          console.error('Failed to fetch Token B balance:', e.message);
          if (!isCancelled) {
            setBalanceB(null);
          }
        }
      } else {
        setBalanceB(null);
      }
    };

    fetchBalances();

    return () => {
      isCancelled = true;
    };
  }, [userAddress, tokenA, tokenB, tokenAHook.isValid, tokenBHook.isValid, approvalCheckTrigger]);

  // Fetch LP token decimals from pair contract
  // NOTE: LP tokens are typically 18 decimals in Uniswap V2/SushiSwap
  // But we fetch from contract to be safe and support any fork
  useEffect(() => {
    if (!pair.pairAddress || !provider) {
      setLpDecimals(18); // Default to 18 (standard for LP tokens)
      return;
    }

    let isCancelled = false;

    const fetchLPDecimals = async () => {
      try {
        const pairContract = new ethers.Contract(
          pair.pairAddress,
          ['function decimals() view returns (uint8)'],
          provider
        );
        const decimals = await pairContract.decimals();
        console.log('📐 LP Token Decimals (from contract):', decimals);
        setLpDecimals(decimals);
      } catch (err) {
        console.warn('Failed to fetch LP decimals, using default 18:', err.message);
        setLpDecimals(18); // Fallback to standard ERC20 decimals
      }
    };

    fetchLPDecimals();

    return () => {
      isCancelled = true;
    };
  }, [pair.pairAddress, provider]);

  // Fetch LP balances
  useEffect(() => {
    if (!pair.pairAddress || !userAddress) {
      setLpBalance(ethers.BigNumber.from(0));
      return;
    }

    let isCancelled = false;

    const fetchLPBalance = async () => {
      try {
        const balance = await pair.getBalance(userAddress);
        if (!isCancelled) {
          setLpBalance(balance);
          console.log('💧 LP Balance Fetched:', {
            raw: balance.toString(),
            decimals: lpDecimals,
            formatted: formatTokenAmount(balance, lpDecimals, 8),
            formattedFull: formatTokenAmount(balance, lpDecimals, 18),
          });
        }
      } catch (err) {
        console.error('Failed to fetch LP balance:', err);
        if (!isCancelled) {
          setLpBalance(ethers.BigNumber.from(0));
        }
      }
    };

    fetchLPBalance();

    return () => {
      isCancelled = true;
    };
  }, [pair.pairAddress, userAddress, approvalCheckTrigger, lpDecimals]);

  // Check approval for token A
  useEffect(() => {
    if (!tokenA || !userAddress || !amountA || !tokenAHook.isValid || !CONTRACT_ADDRESSES?.ROUTER) {
      setIsApprovedA(false);
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amountA);
    if (isNaN(amountValue) || amountValue <= 0) {
      setIsApprovedA(false);
      return;
    }

    let isCancelled = false;

    const checkApproval = async () => {
      try {
        const amount = parseTokenAmount(amountA, tokenAHook.decimals);
        const allowance = await tokenAHook.getAllowance(userAddress, CONTRACT_ADDRESSES.ROUTER);
        
        if (!isCancelled) {
          const approved = allowance.gte(amount);
          setIsApprovedA(approved);
          console.log('Token A approval check:', {
            allowance: allowance.toString(),
            required: amount.toString(),
            approved: approved ? '✅ Approved' : '❌ Not approved',
          });
        }
      } catch (err) {
        console.error('Failed to check Token A approval:', err.message);
        if (!isCancelled) {
          setIsApprovedA(false);
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
  }, [tokenA, userAddress, amountA, tokenAHook.decimals, tokenAHook.isValid, approvalCheckTrigger]);

  // Check approval for token B
  useEffect(() => {
    if (!tokenB || !userAddress || !amountB || !tokenBHook.isValid || !CONTRACT_ADDRESSES?.ROUTER) {
      setIsApprovedB(false);
      return;
    }

    // Validate amount
    const amountValue = parseFloat(amountB);
    if (isNaN(amountValue) || amountValue <= 0) {
      setIsApprovedB(false);
      return;
    }

    let isCancelled = false;

    const checkApproval = async () => {
      try {
        const amount = parseTokenAmount(amountB, tokenBHook.decimals);
        const allowance = await tokenBHook.getAllowance(userAddress, CONTRACT_ADDRESSES.ROUTER);
        
        if (!isCancelled) {
          const approved = allowance.gte(amount);
          setIsApprovedB(approved);
          console.log('Token B approval check:', {
            allowance: allowance.toString(),
            required: amount.toString(),
            approved: approved ? '✅ Approved' : '❌ Not approved',
          });
        }
      } catch (err) {
        console.error('Failed to check Token B approval:', err.message);
        if (!isCancelled) {
          setIsApprovedB(false);
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
  }, [tokenB, userAddress, amountB, tokenBHook.decimals, tokenBHook.isValid, approvalCheckTrigger]);

  // Calculate optimal amounts
  useEffect(() => {
    // Clear Token B if Token A is empty
    if (!amountA || amountA === '') {
      setAmountB('');
      return;
    }

    // Early return checks
    if (!tokenAHook.isValid || !tokenBHook.isValid) {
      setAmountB('');
      return;
    }

    // Validate amount is a number
    const amountValue = parseFloat(amountA);
    if (isNaN(amountValue) || amountValue <= 0) {
      setAmountB('');
      return;
    }

    let isCancelled = false;

    const calculateOptimal = async () => {
      try {
        const { reserveA, reserveB } = pair.getOrderedReserves();
        
        console.log('🔄 Calculating optimal Token B amount:', {
          amountA,
          tokenA: tokenAHook.symbol,
          tokenB: tokenBHook.symbol,
          hasReserves: !!(reserveA && reserveB && !reserveA.isZero() && !reserveB.isZero()),
          reserveA: reserveA?.toString(),
          reserveB: reserveB?.toString(),
        });

        // If no reserves (new pool), calculate 1:1 ratio as default
        if (!reserveA || !reserveB || reserveA.isZero() || reserveB.isZero()) {
          console.log('ℹ️ New pool - setting 1:1 ratio as default');
          // For new pools, suggest equal value (1:1) as starting point
          if (!isCancelled) {
            setAmountB(amountA); // Simple 1:1 for now
          }
          return;
        }

        // Calculate based on pool ratio: amountB = (amountA * reserveB) / reserveA
        const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
        
        // ✅ Calculate correct pool ratio for logging
        const decimalDiff = tokenAHook.decimals - tokenBHook.decimals;
        let poolRatioFormatted;
        if (decimalDiff >= 0) {
          poolRatioFormatted = formatTokenAmount(
            reserveB.mul(ethers.BigNumber.from(10).pow(decimalDiff)).div(reserveA),
            tokenBHook.decimals,
            2
          );
        } else {
          poolRatioFormatted = formatTokenAmount(
            reserveB.div(ethers.BigNumber.from(10).pow(Math.abs(decimalDiff))).div(reserveA),
            tokenBHook.decimals,
            2
          );
        }
        
        console.log('📊 Calculation details:', {
          amountA: amountA,
          amountAParsed: amountAParsed.toString(),
          tokenA: tokenAHook.symbol,
          tokenB: tokenBHook.symbol,
          reserveA: reserveA.toString(),
          reserveB: reserveB.toString(),
          reserveAFormatted: formatTokenAmount(reserveA, tokenAHook.decimals, 4),
          reserveBFormatted: formatTokenAmount(reserveB, tokenBHook.decimals, 4),
          decimalsA: tokenAHook.decimals,
          decimalsB: tokenBHook.decimals,
          poolRatio: `1 ${tokenAHook.symbol} = ${poolRatioFormatted} ${tokenBHook.symbol}`,
        });
        
        // Direct calculation: (amountA * reserveB) / reserveA
        const amountBCalculated = amountAParsed
          .mul(reserveB)
          .div(reserveA);

        if (!isCancelled) {
          // Format with appropriate decimals
          // For stablecoins (6 decimals): show 2 decimals
          // For other tokens: show 4-6 decimals
          let displayDecimals;
          if (tokenBHook.decimals === 6) {
            // USDC, USDT - show 2 decimals
            displayDecimals = 2;
          } else if (tokenBHook.decimals === 8) {
            // WBTC - show 4 decimals
            displayDecimals = 4;
          } else {
            // WETH and others (18 decimals) - show 6 decimals
            displayDecimals = 6;
          }
          
          const formattedB = formatTokenAmount(amountBCalculated, tokenBHook.decimals, displayDecimals);
          
          console.log('✅ Optimal Token B calculated:', {
            raw: amountBCalculated.toString(),
            formatted: formattedB,
            token: tokenBHook.symbol,
            decimals: tokenBHook.decimals,
            displayDecimals,
            poolRatio: `1 ${tokenAHook.symbol} = ${formattedB} ${tokenBHook.symbol}`,
          });
          
          setAmountB(formattedB);
        }
      } catch (err) {
        console.error('❌ Failed to calculate optimal amount:', err);
        if (!isCancelled) {
          setAmountB(''); // Clear on error
        }
      }
    };

    // Debounce calculation to reduce re-renders
    const timeoutId = setTimeout(() => {
      calculateOptimal();
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [amountA, tokenA, tokenB, tokenAHook.decimals, tokenAHook.isValid, tokenAHook.symbol, tokenBHook.decimals, tokenBHook.isValid, tokenBHook.symbol, pair]);

  // Calculate LP tokens to receive
  const calculateLPTokensToReceive = useCallback(() => {
    if (!amountA || !amountB || !tokenAHook.isValid || !tokenBHook.isValid) {
      return null;
    }

    try {
      const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
      const amountBParsed = parseTokenAmount(amountB, tokenBHook.decimals);
      const { reserveA, reserveB } = pair.getOrderedReserves();

      if (!reserveA || !reserveB || reserveA.isZero() || reserveB.isZero()) {
        // New pair - LP tokens = sqrt(amountA * amountB)
        return amountAParsed.mul(amountBParsed).sqrt();
      }

      // Existing pair - LP = min(amountA/reserveA, amountB/reserveB) * totalSupply
      const totalSupply = pair.totalSupply || ethers.BigNumber.from(0);
      const liquidityA = amountAParsed.mul(totalSupply).div(reserveA);
      const liquidityB = amountBParsed.mul(totalSupply).div(reserveB);

      return liquidityA.lt(liquidityB) ? liquidityA : liquidityB;
    } catch (err) {
      console.error('LP calculation failed:', err);
      return null;
    }
  }, [amountA, amountB, tokenAHook, tokenBHook, pair]);

  // Calculate pool share percentage
  const calculatePoolSharePercentage = useCallback(() => {
    const lpTokens = calculateLPTokensToReceive();
    if (!lpTokens) return null;

    const totalSupply = pair.totalSupply || ethers.BigNumber.from(0);
    if (totalSupply.isZero()) return '100'; // First LP

    const newTotalSupply = totalSupply.add(lpTokens);
    const sharePercentage = lpTokens.mul(10000).div(newTotalSupply).toNumber() / 100;

    return sharePercentage.toFixed(2);
  }, [calculateLPTokensToReceive, pair]);

  // Calculate price ratio
  const getPriceRatio = useCallback(() => {
    const { reserveA, reserveB } = pair.getOrderedReserves();
    if (!reserveA || !reserveB || reserveA.isZero() || reserveB.isZero()) {
      return null;
    }

    // ✅ FIXED: Correct price calculation accounting for decimal differences
    // Price of A in terms of B: (reserveB / reserveA) normalized for decimals
    // Formula: reserveB * 10^(decimalsA - decimalsB) / reserveA
    const decimalDiff = tokenAHook.decimals - tokenBHook.decimals;
    
    let priceAtoB;
    if (decimalDiff >= 0) {
      // tokenA has more or equal decimals than tokenB (e.g., ETH 18, USDT 6)
      priceAtoB = formatTokenAmount(
        reserveB.mul(ethers.BigNumber.from(10).pow(decimalDiff)).div(reserveA),
        tokenBHook.decimals,
        6
      );
    } else {
      // tokenB has more decimals than tokenA (rare case)
      priceAtoB = formatTokenAmount(
        reserveB.div(ethers.BigNumber.from(10).pow(Math.abs(decimalDiff))).div(reserveA),
        tokenBHook.decimals,
        6
      );
    }

    // Price of B in terms of A: (reserveA / reserveB) normalized for decimals
    const decimalDiffReverse = tokenBHook.decimals - tokenAHook.decimals;
    
    let priceBtoA;
    if (decimalDiffReverse >= 0) {
      priceBtoA = formatTokenAmount(
        reserveA.mul(ethers.BigNumber.from(10).pow(decimalDiffReverse)).div(reserveB),
        tokenAHook.decimals,
        6
      );
    } else {
      priceBtoA = formatTokenAmount(
        reserveA.div(ethers.BigNumber.from(10).pow(Math.abs(decimalDiffReverse))).div(reserveB),
        tokenAHook.decimals,
        6
      );
    }

    return { priceAtoB, priceBtoA };
  }, [pair, tokenAHook, tokenBHook]);

  // Calculate price impact for large additions
  const calculatePriceImpact = useCallback(() => {
    if (!amountA || !amountB || !tokenAHook.isValid || !tokenBHook.isValid) {
      return null;
    }

    const { reserveA, reserveB } = pair.getOrderedReserves();
    if (!reserveA || !reserveB || reserveA.isZero() || reserveB.isZero()) {
      return null; // Can't calculate for new pairs
    }

    try {
      const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
      const amountBParsed = parseTokenAmount(amountB, tokenBHook.decimals);

      // Calculate % change in pool composition
      const newReserveA = reserveA.add(amountAParsed);
      const newReserveB = reserveB.add(amountBParsed);

      const oldRatio = reserveB.mul(1000000).div(reserveA);
      const newRatio = newReserveB.mul(1000000).div(newReserveA);

      const ratioDiff = oldRatio.sub(newRatio).abs();
      const impactPercent = ratioDiff.mul(100).div(oldRatio).toNumber() / 1000000 * 100;

      return impactPercent.toFixed(2);
    } catch (err) {
      return null;
    }
  }, [amountA, amountB, tokenAHook, tokenBHook, pair]);

  // Compute derived values
  const lpTokensToReceive = calculateLPTokensToReceive();
  const poolSharePercentage = calculatePoolSharePercentage();
  const priceRatio = getPriceRatio();
  const priceImpact = calculatePriceImpact();
  const isFirstLiquidity = !pair.reserves.reserve0 || pair.reserves.reserve0.isZero();

  // Handle approve A - Show modal instead of directly approving
  const handleApproveA = async () => {
    if (!tokenAHook.isValid || !userAddress || !CONTRACT_ADDRESSES?.ROUTER) {
      console.error('Cannot approve: missing requirements');
      return;
    }
    
    if (!amountA || parseFloat(amountA) <= 0) {
      console.error('Invalid amount');
      return;
    }
    
    // ✅ SECURITY: Show approval modal instead of directly approving
    const amount = parseTokenAmount(amountA, tokenAHook.decimals);
    setApprovalModal({
      isOpen: true,
      token: {
        symbol: tokenAHook.symbol,
        decimals: tokenAHook.decimals,
      },
      amount: amount,
      spender: CONTRACT_ADDRESSES.ROUTER,
      tokenType: 'A',
    });
  };

  // Handle approval confirmation from modal for Token A
  const handleApprovalConfirmA = async (approvalAmount) => {
    try {
      console.log('🔓 Approving Token A...', {
        token: tokenAHook.symbol,
        spender: CONTRACT_ADDRESSES.ROUTER,
        amount: approvalAmount.toString(),
        isUnlimited: approvalAmount.eq(ethers.constants.MaxUint256),
      });
      
      const receipt = await tokenAHook.approve(CONTRACT_ADDRESSES.ROUTER, approvalAmount);
      
      if (receipt && receipt.wait) {
        console.log('⏳ Waiting for Token A approval transaction...');
        await receipt.wait();
        console.log('✅ Token A approved');
      }
      
      // Update state immediately
      setIsApprovedA(true);
      setApprovalModal({ ...approvalModal, isOpen: false });
      
      // Trigger re-check of approvals
      setApprovalCheckTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('❌ Token A approval failed:', err);
      
      // User-friendly error
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        alert('Approval cancelled');
      } else {
        alert(`Failed to approve ${tokenAHook.symbol}: ${err.message}`);
      }
      setApprovalModal({ ...approvalModal, isOpen: false });
    }
  };

  // Handle approve B - Show modal instead of directly approving
  const handleApproveB = async () => {
    if (!tokenBHook.isValid || !userAddress || !CONTRACT_ADDRESSES?.ROUTER) {
      console.error('Cannot approve: missing requirements');
      return;
    }
    
    if (!amountB || parseFloat(amountB) <= 0) {
      console.error('Invalid amount');
      return;
    }
    
    // ✅ SECURITY: Show approval modal instead of directly approving
    const amount = parseTokenAmount(amountB, tokenBHook.decimals);
    setApprovalModal({
      isOpen: true,
      token: {
        symbol: tokenBHook.symbol,
        decimals: tokenBHook.decimals,
      },
      amount: amount,
      spender: CONTRACT_ADDRESSES.ROUTER,
      tokenType: 'B',
    });
  };

  // Handle approval confirmation from modal for Token B
  const handleApprovalConfirmB = async (approvalAmount) => {
    try {
      console.log('🔓 Approving Token B...', {
        token: tokenBHook.symbol,
        spender: CONTRACT_ADDRESSES.ROUTER,
        amount: approvalAmount.toString(),
        isUnlimited: approvalAmount.eq(ethers.constants.MaxUint256),
      });
      
      const receipt = await tokenBHook.approve(CONTRACT_ADDRESSES.ROUTER, approvalAmount);
      
      if (receipt && receipt.wait) {
        console.log('⏳ Waiting for Token B approval transaction...');
        await receipt.wait();
        console.log('✅ Token B approved');
      }
      
      // Update state immediately
      setIsApprovedB(true);
      setApprovalModal({ ...approvalModal, isOpen: false });
      
      // Trigger re-check of approvals
      setApprovalCheckTrigger(prev => prev + 1);
      
      console.log('🎯 Both tokens approved! Button should now show "Add Liquidity"');
      
    } catch (err) {
      console.error('❌ Token B approval failed:', err);
      
      // User-friendly error
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        alert('Approval cancelled');
      } else {
        alert(`Failed to approve ${tokenBHook.symbol}: ${err.message}`);
      }
      setApprovalModal({ ...approvalModal, isOpen: false });
    }
  };

  // Handle token selection from modal
  const handleTokenSelect = (token, type) => {
    // Prevent selecting the same token for both fields
    if (type === 'A') {
      if (tokenB && tokenB.toLowerCase() === token.address.toLowerCase()) {
        console.warn('Cannot select the same token for both Token A and Token B');
        return;
      }
      setTokenA(token.address);
    } else {
      if (tokenA && tokenA.toLowerCase() === token.address.toLowerCase()) {
        console.warn('Cannot select the same token for both Token A and Token B');
        return;
      }
      setTokenB(token.address);
    }

    // Close modal
    setActiveModal(null);
  };

  // Handle add liquidity with transaction modal
  const handleAddLiquidity = async () => {
    if (!isApprovedA || !isApprovedB) return;

    try {
      // Open modal in pending state
      setTxModal({
        isOpen: true,
        status: 'pending',
        txHash: null,
        error: null,
        type: 'Add Liquidity'
      });

      const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
      const amountBParsed = parseTokenAmount(amountB, tokenBHook.decimals);

      // Execute transaction
      const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountAParsed,
        amountBParsed,
        slippage,
        getDeadline()
      );

      // Update modal to success
      setTxModal({
        isOpen: true,
        status: 'success',
        txHash: tx.hash,
        error: null,
        type: 'Add Liquidity'
      });

      console.log('✅ Liquidity added successfully!');

      // Reset form
      setAmountA('');
      setAmountB('');

      // DON'T reset approval states - we use unlimited approval!
      // The approvals will persist for future transactions
      
      // Refresh balances
      const balance = await pair.getBalance(userAddress);
      setLpBalance(balance);
      
      // Trigger balance refresh
      setApprovalCheckTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Add liquidity failed:', err);

      // Update modal to error
      setTxModal({
        isOpen: true,
        status: 'error',
        txHash: null,
        error: err.reason || err.message || 'Transaction failed',
        type: 'Add Liquidity'
      });
    }
  };

  // Handle remove liquidity with transaction modal
  const handleRemoveLiquidity = async () => {
    // Validation before opening modal
    if (!liquidityToRemove || parseFloat(liquidityToRemove) <= 0) {
      alert('Please enter a valid amount of LP tokens to remove');
      return;
    }

    try {
      console.log('🔄 Removing liquidity:', {
        liquidityToRemove,
        lpBalance: formatTokenAmount(lpBalance, lpDecimals, 8),
        lpDecimals,
      });

      const liquidityAmount = parseTokenAmount(liquidityToRemove, lpDecimals);

      console.log('📊 Parsed amounts:', {
        liquidityAmountRaw: liquidityAmount.toString(),
        lpBalanceRaw: lpBalance.toString(),
        decimals: lpDecimals,
        isValid: liquidityAmount.lte(lpBalance),
      });

      if (liquidityAmount.gt(lpBalance)) {
        alert(`Insufficient LP balance. You have ${formatTokenAmount(lpBalance, lpDecimals, 8)} LP tokens.`);
        return;
      }

      if (liquidityAmount.isZero()) {
        alert('Amount must be greater than 0');
        return;
      }

      // Open modal in pending state
      setTxModal({
        isOpen: true,
        status: 'pending',
        txHash: null,
        error: null,
        type: 'Remove Liquidity'
      });

      // Approve LP tokens if needed
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

      // Execute transaction
      const tx = await router.removeLiquidity(
        tokenA,
        tokenB,
        liquidityAmount,
        amountAMin,
        amountBMin,
        getDeadline()
      );

      // Update modal to success
      setTxModal({
        isOpen: true,
        status: 'success',
        txHash: tx.hash,
        error: null,
        type: 'Remove Liquidity'
      });

      console.log('✅ Liquidity removed successfully!');

      // Reset form
      setLiquidityToRemove('');

      // Refresh balances
      const balance = await pair.getBalance(userAddress);
      setLpBalance(balance);
      
      // Trigger balance refresh
      setApprovalCheckTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Remove liquidity failed:', err);

      // Update modal to error
      setTxModal({
        isOpen: true,
        status: 'error',
        txHash: null,
        error: err.reason || err.message || 'Transaction failed',
        type: 'Remove Liquidity'
      });
    }
  };

  // Get button state for add liquidity
  const getAddButtonState = () => {
    // Check wallet and tokens first
    if (!signer || !userAddress) {
      return { text: 'Connect Wallet', disabled: true };
    }
    
    if (!tokenAHook.isValid || !tokenBHook.isValid) {
      return { text: 'Select tokens', disabled: true };
    }
    
    if (!amountA || !amountB) {
      return { text: 'Enter amounts', disabled: true };
    }
    
    if (tokenAHook.loading || tokenBHook.loading) {
      return { text: 'Validating tokens...', disabled: true };
    }

    // Validate amounts are numbers
    if (parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      return { text: 'Enter valid amounts', disabled: true };
    }

    // Check Token A balance
    if (balanceA) {
      try {
        const amountAParsed = parseTokenAmount(amountA, tokenAHook.decimals);
        if (amountAParsed.gt(balanceA)) {
          return {
            text: `Insufficient ${tokenAHook.symbol} balance`,
            disabled: true,
            isError: true
          };
        }
      } catch (e) {
        return { text: 'Invalid Token A amount', disabled: true };
      }
    }

    // Check Token B balance
    if (balanceB) {
      try {
        const amountBParsed = parseTokenAmount(amountB, tokenBHook.decimals);
        if (amountBParsed.gt(balanceB)) {
          return {
            text: `Insufficient ${tokenBHook.symbol} balance`,
            disabled: true,
            isError: true
          };
        }
      } catch (e) {
        return { text: 'Invalid Token B amount', disabled: true };
      }
    }

    // Check approvals
    console.log('🔍 Button state check:', {
      isApprovedA,
      isApprovedB,
      tokenA: tokenAHook.symbol,
      tokenB: tokenBHook.symbol,
    });

    if (!isApprovedA) {
      return { 
        text: `Approve ${tokenAHook.symbol}`, 
        disabled: false, 
        approveA: true 
      };
    }
    
    if (!isApprovedB) {
      return { 
        text: `Approve ${tokenBHook.symbol}`, 
        disabled: false, 
        approveB: true 
      };
    }
    console.log('🔍 Router loading:', router.loading);
    console.log('🔍 Tx modal status:', txModal.status);
    if (router.loading || txModal.status === 'pending') {
      return { text: 'Adding...', disabled: true, loading: true };
    }
    
    // Both approved, ready to add liquidity!
    console.log('✅ Both tokens approved, showing Add Liquidity button');
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
                  <button className="token-selector" onClick={() => setActiveModal('tokenA')}>
                    <div className="token-icon" />
                    <span className="token-symbol">{tokenAHook.symbol}</span>
                    <ChevronDownIcon />
                  </button>
                ) : (
                  <button className="token-selector select-token" onClick={() => setActiveModal('tokenA')}>
                    Select <ChevronDownIcon />
                  </button>
                )}
              </div>

              {/* USD Value Display for Token A */}
              {usdValueA && (
                <div className="usd-value">
                  {tokenAPrice.loading ? '...' : usdValueA}
                </div>
              )}

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
            <div className={`token-input-box ${tokenB && !tokenBHook.isValid && !tokenBHook.loading ? 'has-error' : ''}`} style={{ position: 'relative' }}>
              <div className="token-input-row">
                <span className="token-input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Token B 
                  <span style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-tertiary)', 
                    fontWeight: 'normal',
                    background: 'var(--bg-tertiary)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    auto-calculated
                  </span>
                </span>
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
                  readOnly
                  style={{ cursor: 'not-allowed', opacity: 0.7 }}
                  title="Amount is auto-calculated based on pool ratio"
                />
                {tokenBHook.isValid ? (
                  <button className="token-selector" onClick={() => setActiveModal('tokenB')}>
                    <div className="token-icon" />
                    <span className="token-symbol">{tokenBHook.symbol}</span>
                    <ChevronDownIcon />
                  </button>
                ) : (
                  <button className="token-selector select-token" onClick={() => setActiveModal('tokenB')}>
                    Select <ChevronDownIcon />
                  </button>
                )}
              </div>

              {/* Auto-calculation message */}
              {tokenAHook.isValid && tokenBHook.isValid && amountB && (
                <div className="token-status info" style={{ fontSize: '12px', marginTop: '8px' }}>
                  💡 Amount based on current pool ratio (1 {tokenAHook.symbol} = {amountB} {tokenBHook.symbol})
                </div>
              )}
              {tokenAHook.isValid && tokenBHook.isValid && !amountB && amountA && (
                <div className="token-status info" style={{ fontSize: '12px', marginTop: '8px' }}>
                  ⏳ Calculating optimal amount...
                </div>
              )}

              {/* USD Value Display for Token B */}
              {usdValueB && (
                <div className="usd-value">
                  {tokenBPrice.loading ? '...' : usdValueB}
                </div>
              )}

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

            {/* Prices and Pool Share */}
            {tokenAHook.isValid && tokenBHook.isValid && amountA && amountB && (
              <div className="liquidity-preview">
                <h4>Prices and Pool Share</h4>

                {/* LP Tokens Estimate */}
                {lpTokensToReceive && (
                  <div className="preview-stat">
                    <span className="label">LP Tokens to Receive</span>
                    <span className="value highlighted">
                      {formatTokenAmount(lpTokensToReceive, lpDecimals, 6)} LP
                    </span>
                  </div>
                )}

                {/* Pool Share */}
                {poolSharePercentage && (
                  <div className="preview-stat">
                    <span className="label">Share of Pool</span>
                    <span className="value">{poolSharePercentage}%</span>
                  </div>
                )}

                {/* Price Ratio */}
                {priceRatio ? (
                  <>
                    <div className="preview-stat" style={{ 
                      backgroundColor: 'rgba(33, 114, 229, 0.1)', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      marginBottom: '8px',
                      border: '1px solid rgba(33, 114, 229, 0.2)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
                        📊 Current Pool Price
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="label" style={{ color: 'var(--text-secondary)' }}>1 {tokenAHook.symbol} =</span>
                        <span className="value" style={{ fontWeight: 'bold', color: 'var(--blue-primary)' }}>
                          {priceRatio.priceAtoB} {tokenBHook.symbol}
                        </span>
                      </div>
                    </div>
                    <div className="preview-stat" style={{ fontSize: '12px', opacity: 0.9 }}>
                      <span className="label">1 {tokenBHook.symbol} =</span>
                      <span className="value">{priceRatio.priceBtoA} {tokenAHook.symbol}</span>
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--text-secondary)', 
                      marginTop: '8px', 
                      padding: '10px', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)'
                    }}>
                      ℹ️ You must add liquidity at the pool's current price ratio, not USD values
                    </div>
                  </>
                ) : (
                  <div className="preview-stat">
                    <span className="label">Initial Price</span>
                    <span className="value">
                      You will set the initial price for this pool
                    </span>
                  </div>
                )}

                {/* First Liquidity Warning */}
                {isFirstLiquidity && (
                  <div className="warning-box">
                    <strong>⚠️ You are the first liquidity provider.</strong>
                    <p>
                      This is a new pool. The ratio of tokens you add will set the initial price.
                      Token B amount is set to match Token A (1:1 ratio) by default.
                      You can adjust Token A to change the ratio.
                    </p>
                  </div>
                )}

                {/* Price Impact Warning */}
                {priceImpact && parseFloat(priceImpact) > 1 && (
                  <div className={`preview-stat ${parseFloat(priceImpact) > 5 ? 'warning' : ''}`}>
                    <span className="label">Price Impact</span>
                    <span className="value">{priceImpact}%</span>
                  </div>
                )}

                {priceImpact && parseFloat(priceImpact) > 15 && (
                  <div className="warning-box error">
                    <strong>⚠️ High Price Impact</strong>
                    <p>
                      This transaction will significantly shift the pool's price.
                      Consider splitting into smaller additions.
                    </p>
                  </div>
                )}

                {/* Minimum Amounts with Slippage */}
                <div className="preview-stat muted">
                  <span className="label">Min {tokenAHook.symbol} Deposited</span>
                  <span className="value">
                    {formatTokenAmount(
                      applySlippage(parseTokenAmount(amountA, tokenAHook.decimals), slippage),
                      tokenAHook.decimals,
                      6
                    )}
                  </span>
                </div>
                <div className="preview-stat muted">
                  <span className="label">Min {tokenBHook.symbol} Deposited</span>
                  <span className="value">
                    {formatTokenAmount(
                      applySlippage(parseTokenAmount(amountB, tokenBHook.decimals), slippage),
                      tokenBHook.decimals,
                      6
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Total USD Value */}
            {usdValueA && usdValueB && (
              <div className="total-usd-value">
                Total: {
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(
                    parseFloat(amountA || 0) * (tokenAPrice.price || 0) +
                    parseFloat(amountB || 0) * (tokenBPrice.price || 0)
                  )
                }
              </div>
            )}

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
              className={`swap-button ${addButtonState.isError ? 'error' : ''} ${addButtonState.approveA || addButtonState.approveB ? 'approve' : ''}`}
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
                <span className="token-input-label">Amount</span>
                <span className="token-balance">
                  Balance: {formatTokenAmount(lpBalance, lpDecimals, 8)} LP
                </span>
              </div>
              
              <div className="token-input-main">
                <input
                  type="text"
                  className="amount-input"
                  placeholder="0.0"
                  value={liquidityToRemove}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow valid number input
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setLiquidityToRemove(value);
                    }
                  }}
                  style={{ fontSize: '24px', fontWeight: '600' }}
                />
                <button className="token-selector" style={{ cursor: 'default', pointerEvents: 'none', opacity: 0.8 }}>
                  <span className="token-symbol">LP</span>
                </button>
              </div>
              
              {/* Percentage Buttons */}
              {lpBalance.gt(0) && (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  {[25, 50, 75, 100].map(percent => (
                    <button
                      key={percent}
                      onClick={() => {
                        const percentValue = lpBalance.mul(percent).div(100);
                        const formatted = ethers.utils.formatUnits(percentValue, lpDecimals);
                        console.log(`Setting ${percent}% of LP:`, {
                          percent,
                          raw: percentValue.toString(),
                          formatted,
                          decimals: lpDecimals,
                        });
                        setLiquidityToRemove(formatted);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: liquidityToRemove && Math.abs((parseFloat(liquidityToRemove) / parseFloat(ethers.utils.formatUnits(lpBalance, lpDecimals))) * 100 - percent) < 1 ? '#dbeafe' : 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1e40af',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.borderColor = '#3b82f6'}
                      onMouseLeave={(e) => e.target.style.borderColor = '#e5e7eb'}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              )}
              
              {/* Show what you'll receive */}
              {liquidityToRemove && parseFloat(liquidityToRemove) > 0 && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: '#f0fdf4', 
                  borderRadius: '8px',
                  border: '1px solid #86efac'
                }}>
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', marginBottom: '8px' }}>
                    💰 You will receive:
                  </div>
                  {(() => {
                    try {
                      const { reserveA, reserveB } = pair.getOrderedReserves();
                      const totalSupply = pair.totalSupply;
                      if (reserveA && reserveB && totalSupply && totalSupply.gt(0)) {
                        const lpAmount = parseTokenAmount(liquidityToRemove, lpDecimals);
                        
                        // Calculate minimum amounts (after slippage)
                        const shareA = calculateLiquidityShare(lpAmount, totalSupply, reserveA);
                        const shareB = calculateLiquidityShare(lpAmount, totalSupply, reserveB);
                        
                        const minA = shareA.mul(10000 - slippage).div(10000);
                        const minB = shareB.mul(10000 - slippage).div(10000);
                        
                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ color: '#15803d' }}>{tokenAHook.symbol}:</span>
                              <span style={{ fontWeight: 'bold', color: '#15803d' }}>
                                {formatTokenAmount(shareA, tokenAHook.decimals, 6)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ color: '#15803d' }}>{tokenBHook.symbol}:</span>
                              <span style={{ fontWeight: 'bold', color: '#15803d' }}>
                                {formatTokenAmount(shareB, tokenBHook.decimals, 6)}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#16a34a', paddingTop: '8px', borderTop: '1px solid #bbf7d0' }}>
                              Minimum after {slippage / 100}% slippage: {formatTokenAmount(minA, tokenAHook.decimals, 6)} {tokenAHook.symbol} + {formatTokenAmount(minB, tokenBHook.decimals, 6)} {tokenBHook.symbol}
                            </div>
                          </>
                        );
                      }
                    } catch (e) {
                      console.error('Failed to calculate receive amounts:', e);
                      return <span style={{ color: '#64748b' }}>Calculating...</span>;
                    }
                    return <span style={{ color: '#64748b' }}>Select amount to see estimate</span>;
                  })()}
                </div>
              )}
            </div>

            {/* Remove Liquidity Info */}
            {liquidityToRemove && parseFloat(liquidityToRemove) > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>You'll receive (estimated):</div>
                    <div style={{ fontWeight: 'bold', color: '#1e40af' }}>
                      ~{(() => {
                        try {
                          const { reserveA, reserveB } = pair.getOrderedReserves();
                          const totalSupply = pair.totalSupply;
                          if (reserveA && reserveB && totalSupply && totalSupply.gt(0)) {
                            const lpAmount = parseTokenAmount(liquidityToRemove, lpDecimals);
                            const shareA = calculateLiquidityShare(lpAmount, totalSupply, reserveA);
                            const shareB = calculateLiquidityShare(lpAmount, totalSupply, reserveB);
                            return `${formatTokenAmount(shareA, tokenAHook.decimals, 4)} ${tokenAHook.symbol} + ${formatTokenAmount(shareB, tokenBHook.decimals, 4)} ${tokenBHook.symbol}`;
                          }
                        } catch (e) {
                          return 'Calculating...';
                        }
                        return 'Calculating...';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Button */}
            <button
              className="swap-button"
              style={{ marginTop: '1rem' }}
              disabled={
                !liquidityToRemove || 
                parseFloat(liquidityToRemove) <= 0 ||
                router.loading ||
                txModal.status === 'pending' ||
                lpBalance.isZero()
              }
              onClick={handleRemoveLiquidity}
            >
              {router.loading || txModal.status === 'pending' ? 'Removing...' : 
               !liquidityToRemove || parseFloat(liquidityToRemove) <= 0 ? 'Enter LP amount' :
               lpBalance.isZero() ? 'No LP tokens' :
               'Remove Liquidity'}
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

      {/* Token List Modals */}
      <TokenListModal
        isOpen={activeModal === 'tokenA'}
        tokens={tokens}
        selectedToken={
          tokenAHook.isValid
            ? {
                id: tokenA.toLowerCase(),
                symbol: tokenAHook.symbol,
                name: tokenAHook.name || tokenAHook.symbol,
                address: tokenA,
                decimals: tokenAHook.decimals
              }
            : null
        }
        onSelectToken={(token) => handleTokenSelect(token, 'A')}
        onClose={() => setActiveModal(null)}
        title="Select Token A"
      />

      <TokenListModal
        isOpen={activeModal === 'tokenB'}
        tokens={tokens}
        selectedToken={
          tokenBHook.isValid
            ? {
                id: tokenB.toLowerCase(),
                symbol: tokenBHook.symbol,
                name: tokenBHook.name || tokenBHook.symbol,
                address: tokenB,
                decimals: tokenBHook.decimals
              }
            : null
        }
        onSelectToken={(token) => handleTokenSelect(token, 'B')}
        onClose={() => setActiveModal(null)}
        title="Select Token B"
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txModal.isOpen}
        status={txModal.status}
        txHash={txModal.txHash}
        error={txModal.error}
        txType={txModal.type}
        onClose={() => setTxModal({ ...txModal, isOpen: false })}
      />

      {/* Approval Modal - Security Feature */}
      <ApprovalModal
        isOpen={approvalModal.isOpen}
        token={approvalModal.token}
        amount={approvalModal.amount}
        spender={approvalModal.spender}
        onApprove={approvalModal.tokenType === 'A' ? handleApprovalConfirmA : handleApprovalConfirmB}
        onCancel={() => setApprovalModal({ ...approvalModal, isOpen: false })}
      />
    </div>
  );
}
