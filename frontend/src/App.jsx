import React, { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SwapComponent } from './components/SwapComponent';
import { LiquidityComponent } from './components/LiquidityComponent';
import { PoolDiagnostic } from './components/PoolDiagnostic';
import { ImpersonatorModal } from './components/ImpersonatorModal';
import { getNetworkByChainId } from './config/contracts';
import { chains } from './config/wagmi';
import './assets/styles.css';

// Uniswap Logo SVG
const UniswapLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 48c13.255 0 24-10.745 24-24S37.255 0 24 0 0 10.745 0 24s10.745 24 24 24z" fill="#FF007A"/>
    <path d="M16.5 12.5c-.5.5-.5 1.5 0 2s1.5.5 2 0c1-1 2.5-1.5 4-1.5 3 0 5.5 2.5 5.5 5.5 0 2-1 3.5-2.5 4.5-2 1-3 2.5-3 4.5v1c0 .5.5 1 1 1s1-.5 1-1v-1c0-1.5.5-2.5 2-3 2-1.5 3.5-3.5 3.5-6 0-4-3.5-7.5-7.5-7.5-2 0-4.5 1-5.5 2z" fill="white"/>
    <path d="M24 34c-.825 0-1.5.675-1.5 1.5S23.175 37 24 37s1.5-.675 1.5-1.5S24.825 34 24 34z" fill="white"/>
  </svg>
);

function App() {
  const [activeTab, setActiveTab] = useState('swap');
  const [showImpersonator, setShowImpersonator] = useState(false);
  const { isConnected } = useAccount();

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <UniswapLogo />
          <h1>Uniswap</h1>
        </div>

        {/* Navigation */}
        <nav className="nav-links">
          <button
            className={activeTab === 'swap' ? 'active' : ''}
            onClick={() => setActiveTab('swap')}
          >
            Swap
          </button>
          <button
            className={activeTab === 'liquidity' ? 'active' : ''}
            onClick={() => setActiveTab('liquidity')}
          >
            Pool
          </button>
          <button
            className={activeTab === 'diagnostic' ? 'active' : ''}
            onClick={() => setActiveTab('diagnostic')}
            style={{ fontSize: '13px' }}
          >
            🔍 Debug
          </button>
        </nav>

        {/* Wallet Section */}
        <div className="wallet-section">
          {/* Impersonator Button */}
          <button
            onClick={() => setShowImpersonator(true)}
            className="impersonator-button"
            title="Impersonate any account for testing"
          >
            🎭
          </button>
          
          {/* RainbowKit Connect Button */}
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 'diagnostic' ? (
          <div className="swap-card">
            <PoolDiagnostic />
          </div>
        ) : isConnected ? (
          <>
            {activeTab === 'swap' && (
              <SwapComponent />
            )}
            {activeTab === 'liquidity' && (
              <LiquidityComponent />
            )}
          </>
        ) : (
          <div className="swap-card">
            <div className="connect-prompt">
              <p>Connect a wallet to swap tokens</p>
              <ConnectButton />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Uniswap V2 · Built on Ethereum</p>
      </footer>

      {/* Impersonator Modal */}
      <ImpersonatorModal 
        isOpen={showImpersonator} 
        onClose={() => setShowImpersonator(false)} 
      />
    </div>
  );
}

export default App;
