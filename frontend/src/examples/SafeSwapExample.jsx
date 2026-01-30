/**
 * Example: Safe Token Swap Implementation
 * Demonstrates how to use the safe swap system with verified tokens only
 */

import React, { useState } from 'react';
import { useSafeSwap, useSwapValidation, useFilteredOutputTokens } from '../hooks/useSafeSwap';
import { VERIFIED_TOKENS } from '../constants/tokens';

/**
 * Simple Token Selector Component
 */
function TokenSelector({ label, selectedToken, availableTokens, onSelect, disabled }) {
  return (
    <div style={{ margin: '10px 0' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
        {label}
      </label>
      <select 
        value={selectedToken || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        style={{ 
          width: '100%', 
          padding: '10px', 
          fontSize: '16px',
          borderRadius: '8px',
          border: '1px solid #ccc'
        }}
      >
        <option value="">Select a token</option>
        {availableTokens.map(token => (
          <option key={token.address} value={token.address}>
            {token.symbol} - {token.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Main Example Component
 */
export function SafeSwapExample() {
  // State for selected tokens
  const [tokenIn, setTokenIn] = useState('');
  const [tokenOut, setTokenOut] = useState('');

  // Use the safe swap hook
  const { 
    tokens,           // All verified tokens
    pairMapping,      // Pair mapping data
    loading,          // Loading state
    error,            // Error message
    getOutputTokens,  // Function to get compatible tokens
    canSwap,          // Function to check if swap is valid
    getStats,         // Get statistics
    refresh,          // Refresh pair data
  } = useSafeSwap();

  // Get filtered output tokens based on selected input
  const outputTokens = useFilteredOutputTokens(tokenIn, pairMapping);

  // Validate the swap
  const validation = useSwapValidation(tokenIn, tokenOut, pairMapping);

  // Get statistics
  const stats = getStats();

  return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '50px auto', 
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      backgroundColor: '#fff'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Safe Swap Example</h2>

      {/* Loading State */}
      {loading && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          marginBottom: '15px' 
        }}>
          ⏳ Loading liquidity pools...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#ffebee', 
          borderRadius: '8px',
          marginBottom: '15px',
          color: '#c62828'
        }}>
          ❌ Error: {error}
          <button 
            onClick={refresh}
            style={{ 
              marginLeft: '10px', 
              padding: '5px 10px',
              cursor: 'pointer' 
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      {!loading && !error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>System Status:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>✅ {stats.totalTokens} verified tokens</li>
            <li>💧 {stats.tokensWithPairs} tokens with liquidity</li>
            <li>🔄 {stats.totalPairs} available trading pairs</li>
          </ul>
        </div>
      )}

      {/* Token Selection */}
      <div style={{ marginBottom: '20px' }}>
        {/* Input Token Selector */}
        <TokenSelector
          label="You Pay"
          selectedToken={tokenIn}
          availableTokens={tokens}
          onSelect={setTokenIn}
          disabled={loading}
        />

        {/* Swap Direction Indicator */}
        <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '20px' }}>
          ⬇️
        </div>

        {/* Output Token Selector */}
        <TokenSelector
          label="You Receive"
          selectedToken={tokenOut}
          availableTokens={outputTokens}
          onSelect={setTokenOut}
          disabled={loading || !tokenIn}
        />

        {/* Output Token Count Info */}
        {tokenIn && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '5px',
            fontStyle: 'italic'
          }}>
            {outputTokens.length > 0 
              ? `${outputTokens.length} compatible token${outputTokens.length !== 1 ? 's' : ''} available`
              : 'No compatible tokens found'
            }
          </div>
        )}
      </div>

      {/* Validation Result */}
      {tokenIn && tokenOut && (
        <div style={{ 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '15px',
          backgroundColor: validation.isValid ? '#e8f5e9' : '#fff3e0',
          border: `1px solid ${validation.isValid ? '#4caf50' : '#ff9800'}`
        }}>
          {validation.isValid ? (
            <div style={{ color: '#2e7d32' }}>
              ✅ Valid swap pair!
            </div>
          ) : (
            <div style={{ color: '#e65100' }}>
              ⚠️ {validation.message}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginTop: '20px',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '20px'
      }}>
        <button
          onClick={() => {
            setTokenIn(VERIFIED_TOKENS.WETH.address);
            setTokenOut(VERIFIED_TOKENS.USDC.address);
          }}
          style={{ 
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #2196f3',
            backgroundColor: '#fff',
            color: '#2196f3',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          WETH → USDC
        </button>
        <button
          onClick={() => {
            setTokenIn(VERIFIED_TOKENS.USDC.address);
            setTokenOut(VERIFIED_TOKENS.WETH.address);
          }}
          style={{ 
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #2196f3',
            backgroundColor: '#fff',
            color: '#2196f3',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          USDC → WETH
        </button>
      </div>

      {/* Developer Info */}
      <details style={{ marginTop: '20px', fontSize: '12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          Developer Info
        </summary>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '11px'
        }}>
{JSON.stringify({
  tokenIn: tokenIn || 'Not selected',
  tokenOut: tokenOut || 'Not selected',
  isValid: validation.isValid,
  canSwapCheck: tokenIn && tokenOut ? canSwap(tokenIn, tokenOut) : null,
  outputTokenCount: outputTokens.length,
  pairMappingLoaded: Object.keys(pairMapping).length > 0,
}, null, 2)}
        </pre>
      </details>

      {/* Instructions */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <strong>How it works:</strong>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Select an input token from the verified list</li>
          <li>Output dropdown shows ONLY tokens with liquidity pools</li>
          <li>System validates the pair automatically</li>
          <li>No random/scam tokens can be selected</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Minimal Example - Just the essentials
 */
export function MinimalSafeSwapExample() {
  const [tokenIn, setTokenIn] = useState('');
  const [tokenOut, setTokenOut] = useState('');
  
  const { tokens, pairMapping, loading } = useSafeSwap();
  const outputTokens = useFilteredOutputTokens(tokenIn, pairMapping);
  const validation = useSwapValidation(tokenIn, tokenOut, pairMapping);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Minimal Safe Swap</h3>
      
      <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)}>
        <option value="">Select input token</option>
        {tokens.map(t => (
          <option key={t.address} value={t.address}>{t.symbol}</option>
        ))}
      </select>

      <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value)}>
        <option value="">Select output token</option>
        {outputTokens.map(t => (
          <option key={t.address} value={t.address}>{t.symbol}</option>
        ))}
      </select>

      {!validation.isValid && <p>❌ {validation.message}</p>}
      {validation.isValid && <p>✅ Valid swap</p>}
    </div>
  );
}

export default SafeSwapExample;

