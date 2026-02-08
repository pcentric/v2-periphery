/**
 * Pool Diagnostic Component
 * Helps debug pool reserve calculations and verify DEX configuration
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3React } from '../providers/Web3Provider';
import { VERIFIED_TOKENS } from '../constants/tokens';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export function PoolDiagnostic() {
  const { library } = useWeb3React();
  const provider = library;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkPools = async () => {
    if (!provider) {
      setError('Provider not available. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const weth = VERIFIED_TOKENS.WETH.address;
      const usdc = VERIFIED_TOKENS.USDC.address;

      // Check SushiSwap Factory
      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.FACTORY,
        ['function getPair(address, address) view returns (address)'],
        provider
      );

      const pairAddress = await factory.getPair(weth, usdc);
      
      if (pairAddress === ethers.constants.AddressZero) {
        setResults({
          exists: false,
          message: 'WETH/USDC pair does not exist on SushiSwap',
        });
        setLoading(false);
        return;
      }

      // Fetch pair reserves
      const pairContract = new ethers.Contract(
        pairAddress,
        [
          'function getReserves() view returns (uint112, uint112, uint32)',
          'function token0() view returns (address)',
          'function token1() view returns (address)',
          'function totalSupply() view returns (uint256)'
        ],
        provider
      );

      const [reserves, token0, token1, totalSupply] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.token1(),
        pairContract.totalSupply()
      ]);

      // Determine which token is which
      const isToken0WETH = token0.toLowerCase() === weth.toLowerCase();
      const wethReserve = isToken0WETH ? reserves[0] : reserves[1];
      const usdcReserve = isToken0WETH ? reserves[1] : reserves[0];

      // Calculate ratio
      const wethAmount = ethers.utils.formatEther(wethReserve);
      const usdcAmount = ethers.utils.formatUnits(usdcReserve, 6);
      const ratio = parseFloat(usdcAmount) / parseFloat(wethAmount);

      // Calculate what you get for 1 WETH
      const oneWETH = ethers.utils.parseEther('1');
      const usdcFor1WETH = oneWETH.mul(usdcReserve).div(wethReserve);
      const usdcFor1WETHFormatted = ethers.utils.formatUnits(usdcFor1WETH, 6);

      setResults({
        exists: true,
        dex: 'SushiSwap',
        pairAddress,
        token0,
        token1,
        isToken0WETH,
        reserves: {
          weth: wethAmount,
          usdc: usdcAmount,
        },
        ratio: ratio.toFixed(2),
        calculation: {
          input: '1 WETH',
          output: usdcFor1WETHFormatted + ' USDC',
          formatted: parseFloat(usdcFor1WETHFormatted).toFixed(2) + ' USDC'
        },
        totalSupply: ethers.utils.formatEther(totalSupply),
      });

      setLoading(false);
    } catch (err) {
      console.error('Diagnostic failed:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider) {
      checkPools();
    }
  }, [provider]);

  if (!provider) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'rgba(255, 193, 7, 0.1)', 
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '8px',
        margin: '20px',
        color: 'var(--text-primary)'
      }}>
        ⚠️ Please connect wallet to run diagnostics
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'var(--bg-module)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      margin: '20px',
      fontFamily: 'monospace',
      fontSize: '13px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '12px', 
          color: 'var(--text-primary)',
          fontSize: '20px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔍 Pool Diagnostic Tool
        </h3>
        <div style={{
          background: 'rgba(33, 114, 229, 0.1)',
          border: '1px solid rgba(33, 114, 229, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: 'var(--text-primary)', 
            fontFamily: 'Inter, sans-serif',
            lineHeight: '1.6',
            fontWeight: '500'
          }}>
            <strong>📋 What is this tool for?</strong>
          </p>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '13px', 
            color: 'var(--text-secondary)', 
            fontFamily: 'Inter, sans-serif',
            lineHeight: '1.5'
          }}>
            The Debug tab helps you verify liquidity pools, check real-time reserves, debug swap calculations, and validate DEX configuration. 
            It's useful for:
          </p>
          <ul style={{
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            <li>Verifying pool existence on SushiSwap (Arbitrum)</li>
            <li>Checking real-time token reserves and ratios</li>
            <li>Understanding price calculations</li>
            <li>Troubleshooting swap or liquidity issues</li>
          </ul>
        </div>
      </div>
      
      <button 
        onClick={checkPools}
        disabled={loading}
        style={{
          padding: '12px 24px',
          backgroundColor: 'var(--pink-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px',
          fontWeight: '600',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.target.style.backgroundColor = 'var(--pink-secondary)';
            e.target.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'var(--pink-primary)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        {loading ? '⏳ Checking...' : '🔄 Check WETH/USDC Pool'}
      </button>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: 'rgba(220, 53, 69, 0.1)', 
          color: '#dc3545',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: results.exists ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
          border: results.exists ? '1px solid rgba(40, 167, 69, 0.3)' : '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '6px'
        }}>
          {results.exists ? (
            <>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ fontSize: '16px', color: '#28a745' }}>
                  ✅ Pool Found on {results.dex}
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '8px', color: 'var(--text-primary)' }}>
                <strong>Pair Address:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{results.pairAddress}</span>

                <strong>Token 0:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{results.isToken0WETH ? 'WETH' : 'USDC'} ({results.token0.slice(0, 10)}...)</span>

                <strong>Token 1:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{results.isToken0WETH ? 'USDC' : 'WETH'} ({results.token1.slice(0, 10)}...)</span>

                <strong>WETH Reserve:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{parseFloat(results.reserves.weth).toFixed(4)} WETH</span>

                <strong>USDC Reserve:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{parseFloat(results.reserves.usdc).toLocaleString()} USDC</span>

                <strong>Total LP Supply:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{parseFloat(results.totalSupply).toFixed(6)} LP</span>

                <div style={{ gridColumn: '1 / -1', height: '1px', backgroundColor: 'var(--border-color)', margin: '8px 0' }} />

                <strong style={{ color: '#2196F3' }}>Pool Ratio:</strong>
                <span style={{ fontWeight: 'bold', color: '#2196F3' }}>
                  1 WETH = {results.ratio} USDC
                </span>

                <div style={{ gridColumn: '1 / -1', height: '1px', backgroundColor: 'var(--border-color)', margin: '8px 0' }} />

                <strong style={{ color: '#28a745' }}>Calculation Test:</strong>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {results.calculation.input} → {results.calculation.formatted}
                </span>
              </div>

              <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: '4px',
                fontSize: '12px',
                color: 'var(--text-primary)'
              }}>
                <strong>💡 Expected Behavior:</strong>
                <br />
                When you enter 1 WETH in the liquidity form, Token B should show: <strong>{results.calculation.formatted}</strong>
              </div>

              {parseFloat(results.ratio) !== parseFloat(results.calculation.formatted.replace(' USDC', '')) && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}>
                  ⚠️ <strong>Note:</strong> There's a small rounding difference in display vs actual calculation.
                </div>
              )}
            </>
          ) : (
            <div>
              <strong style={{ color: '#ffc107' }}>⚠️ {results.message}</strong>
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                This pair might not have liquidity on SushiSwap. 
                Check <a href="https://analytics.sushi.com/arbitrum/pairs" target="_blank" style={{ color: '#2196F3' }}>SushiSwap Analytics</a>
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        border: '1px solid rgba(33, 150, 243, 0.3)',
        borderRadius: '6px',
        fontSize: '11px',
        color: 'var(--text-primary)'
      }}>
        <strong>ℹ️ About DEX Differences:</strong>
        <ul style={{ marginLeft: '20px', marginTop: '5px', color: 'var(--text-secondary)' }}>
          <li>Different DEXs (Uniswap vs SushiSwap) have separate pools</li>
          <li>Same token pair can have different prices on each DEX</li>
          <li>This is normal and creates arbitrage opportunities</li>
          <li>Your app uses: <strong style={{ color: 'var(--text-primary)' }}>SushiSwap</strong> (V2-compatible)</li>
          <li>To match uniswap.org exactly, you'd need to use Uniswap V3</li>
        </ul>
      </div>
    </div>
  );
}

export default PoolDiagnostic;

