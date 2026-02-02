import React, { useState } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { isAddress } from 'viem';
import { setCustomArbitrumRpc } from '../connectors/impersonator';

export const ImpersonatorModal = ({ isOpen, onClose }) => {
  const [inputAddress, setInputAddress] = useState('');
  const [customRpcUrl, setCustomRpcUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const { connect, connectors } = useConnect();
  const { address: currentAddress } = useAccount();
  const { disconnect } = useDisconnect();

  const impersonatorConnector = connectors.find(c => c.id === 'impersonator');

  const handleImpersonate = async () => {
    setError('');
    
    if (!inputAddress.trim()) {
      setError('Please enter an address');
      return;
    }

    if (!isAddress(inputAddress)) {
      setError('Invalid Ethereum address');
      return;
    }

    // Validate custom RPC URL if provided
    if (customRpcUrl.trim()) {
      try {
        new URL(customRpcUrl);
      } catch (e) {
        setError('Invalid RPC URL format');
        return;
      }
    }

    try {
      // Set custom Arbitrum RPC if provided
      if (customRpcUrl.trim()) {
        setCustomArbitrumRpc(customRpcUrl);
        console.log('Custom Arbitrum RPC set:', customRpcUrl);
      } else {
        setCustomArbitrumRpc(undefined);
      }

      // If already connected with impersonator, disconnect first
      if (currentAddress && impersonatorConnector) {
        await disconnect();
      }

      // Connect with impersonator
      if (impersonatorConnector) {
        // Set the address before connecting
        if (impersonatorConnector.setAddress) {
          impersonatorConnector.setAddress(inputAddress);
        }
        await connect({ connector: impersonatorConnector });
        onClose();
      }
    } catch (err) {
      console.error('Impersonation error:', err);
      setError(err.message || 'Failed to impersonate address');
    }
  };

  const suggestedAddresses = [
    { label: 'Vitalik.eth', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
    { label: 'USDC Whale', address: '0x55FE002aefF02F77364de339a1292923A15844B8' },
    { label: 'Uniswap Router', address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎭 Impersonate Account</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '16px', color: '#999', fontSize: '14px' }}>
            Enter any Ethereum address to impersonate. This allows you to test the interface as if you owned that account.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Address to Impersonate
            </label>
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #2c2f36',
                background: '#1a1d1f',
                color: 'white',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#ff007a20',
              color: '#ff007a',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Quick Select
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestedAddresses.map(({ label, address }) => (
                <button
                  key={address}
                  onClick={() => setInputAddress(address)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2c2f36',
                    background: '#1a1d1f',
                    color: '#999',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#2c2f36'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#1a1d1f'}
                >
                  <span>{label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings - Custom Arbitrum RPC */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF007A',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0'
              }}
            >
              <span style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▶
              </span>
              Advanced: Custom Arbitrum RPC
            </button>
            
            {showAdvanced && (
              <div style={{ 
                marginTop: '12px',
                padding: '12px',
                background: '#1a1d1f',
                borderRadius: '8px',
                border: '1px solid #2c2f36'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#999' }}>
                  Custom RPC URL (Arbitrum Only)
                </label>
                <input
                  type="text"
                  value={customRpcUrl}
                  onChange={(e) => setCustomRpcUrl(e.target.value)}
                  placeholder="https://arb1.arbitrum.io/rpc"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #2c2f36',
                    background: '#0d0e0f',
                    color: 'white',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ 
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#666',
                  lineHeight: '1.4'
                }}>
                  💡 Specify a custom RPC endpoint for Arbitrum Mainnet & Sepolia. 
                  Useful for local Foundry forks or private nodes with unlocked accounts.
                </p>
              </div>
            )}
          </div>

          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: '#2c2f3620',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#999'
          }}>
            ⚠️ <strong>Note:</strong> Impersonation is read-only. You cannot sign transactions or send real funds. 
            Use this for testing and viewing data only.
          </div>

          <button
            onClick={handleImpersonate}
            disabled={!inputAddress.trim()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: inputAddress.trim() ? '#FF007A' : '#2c2f36',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              cursor: inputAddress.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (inputAddress.trim()) {
                e.currentTarget.style.background = '#ff1a8a';
              }
            }}
            onMouseLeave={(e) => {
              if (inputAddress.trim()) {
                e.currentTarget.style.background = '#FF007A';
              }
            }}
          >
            Start Impersonating
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #0d0e0f;
          border-radius: 20px;
          max-width: 480px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid #2c2f36;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 24px 16px;
          border-bottom: 1px solid #2c2f36;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          color: #999;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #2c2f36;
          color: white;
        }

        .modal-body {
          padding: 24px;
        }
      `}</style>
    </div>
  );
};

