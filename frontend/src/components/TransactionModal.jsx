import React from 'react';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg className="spinner" viewBox="0 0 50 50">
    <circle
      className="spinner-path"
      cx="25"
      cy="25"
      r="20"
      fill="none"
      strokeWidth="4"
    />
  </svg>
);

const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="status-icon success">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="status-icon error">
    <circle cx="12" cy="12" r="10"/>
    <path d="M15 9l-6 6M9 9l6 6"/>
  </svg>
);

/**
 * TransactionModal Component
 * Shows transaction status: pending, success, or error
 */
export function TransactionModal({ isOpen, status, txHash, error, onClose, txType = 'Transaction' }) {
  if (!isOpen) return null;

  const getExplorerLink = (hash) => {
    // Arbitrum mainnet
    return `https://arbiscan.io/tx/${hash}`;
  };

  return (
    <div className="modal-overlay">
      <div className="transaction-modal">
        {/* Header */}
        <div className="modal-header">
          <h3>{txType}</h3>
          {status !== 'pending' && (
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Pending State */}
          {status === 'pending' && (
            <div className="status-section">
              <LoadingSpinner />
              <h4>Waiting for Confirmation</h4>
              <p>Confirm this transaction in your wallet</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="status-section">
              <SuccessIcon />
              <h4>Transaction Submitted</h4>
              <p>Your transaction has been submitted to the network</p>
              {txHash && (
                <a
                  href={getExplorerLink(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Arbiscan →
                </a>
              )}
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="status-section">
              <ErrorIcon />
              <h4>Transaction Failed</h4>
              <p className="error-message">
                {error || 'An unknown error occurred'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {status !== 'pending' && (
          <div className="modal-footer">
            <button className="modal-button primary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
