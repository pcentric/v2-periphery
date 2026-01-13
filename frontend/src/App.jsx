import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SwapComponent } from './components/SwapComponent';
import { LiquidityComponent } from './components/LiquidityComponent';
import { NETWORK_CONFIG } from './config/contracts';
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
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [activeTab, setActiveTab] = useState('swap');

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(address);
      setChainId(network.chainId);

      if (network.chainId !== NETWORK_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                chainName: NETWORK_CONFIG.name,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
              }],
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount('');
    setChainId(null);
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [account]);

  const isConnected = account && chainId === NETWORK_CONFIG.chainId;

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
        </nav>

        {/* Wallet Section */}
        <div className="wallet-section">
          {account && (
            <div className="network-badge">
              {NETWORK_CONFIG.name}
            </div>
          )}
          
          {!account ? (
            <button className="connect-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <button className="account-button" onClick={disconnectWallet}>
              <div className="account-avatar" />
              {account.slice(0, 6)}...{account.slice(-4)}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {isConnected ? (
          <>
            {activeTab === 'swap' && (
              <SwapComponent provider={provider} signer={signer} />
            )}
            {activeTab === 'liquidity' && (
              <LiquidityComponent provider={provider} signer={signer} />
            )}
          </>
        ) : (
          <div className="swap-card">
            <div className="connect-prompt">
              <p>Connect a wallet to swap tokens</p>
              <button className="connect-button" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Uniswap V2 · Built on Ethereum</p>
      </footer>
    </div>
  );
}

export default App;
