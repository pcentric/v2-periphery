import React, { useState } from 'react';
import { ethers } from 'ethers';
import { formatTokenAmount } from '../utils/calculations';

/**
 * ApprovalModal - Security-focused approval interface
 * Gives users explicit choice between exact and unlimited approvals
 * 
 * This is a CRITICAL security feature that protects users from:
 * - Compromised router contracts
 * - Wallet compromises
 * - Unlimited token exposure
 */
export function ApprovalModal({
  isOpen,
  token,
  amount, // BigNumber
  spender,
  onApprove,
  onCancel,
}) {
  const [approvalType, setApprovalType] = useState('exact'); // 'exact' | 'unlimited'
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const approvalAmount = approvalType === 'unlimited' 
        ? ethers.constants.MaxUint256 
        : amount;
      
      await onApprove(approvalAmount);
    } finally {
      setLoading(false);
    }
  };

  const formattedAmount = token.decimals 
    ? formatTokenAmount(amount, token.decimals, 6)
    : amount.toString();

  const spenderName = getSpenderName(spender);

  return (
    <div className="modal-overlay">
      <div className="approval-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="approval-icon">🔐</div>
          <h2>Token Approval Required</h2>
          <button 
            className="modal-close" 
            onClick={onCancel}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          <div className="approval-info">
            <p>
              Allow <strong>{spenderName}</strong> to spend your <strong>{token.symbol}</strong> tokens?
            </p>
            <div className="contract-address">
              <small>Contract: {spender.slice(0, 10)}...{spender.slice(-8)}</small>
            </div>
          </div>

          {/* Approval Type Selection */}
          <div className="approval-options">
            <h3>Choose Approval Amount:</h3>

            {/* Option 1: Exact Amount (RECOMMENDED) */}
            <label 
              className={`approval-option ${approvalType === 'exact' ? 'selected' : ''} recommended`}
              onClick={() => setApprovalType('exact')}
            >
              <input
                type="radio"
                name="approvalType"
                value="exact"
                checked={approvalType === 'exact'}
                onChange={() => setApprovalType('exact')}
              />
              <div className="option-content">
                <div className="option-header">
                  <strong>Exact Amount</strong>
                  <span className="badge recommended">✅ Recommended</span>
                </div>
                <div className="option-description">
                  Approve only <strong>{formattedAmount} {token.symbol}</strong> for this transaction
                </div>
                <div className="option-pros-cons">
                  <div className="pros">
                    <div className="pro-item">
                      <span className="icon">🛡️</span>
                      <span>Maximum security - only this transaction can spend tokens</span>
                    </div>
                    <div className="pro-item">
                      <span className="icon">🔒</span>
                      <span>Protected from contract exploits</span>
                    </div>
                  </div>
                  <div className="cons">
                    <div className="con-item">
                      <span className="icon">⚠️</span>
                      <span>Need to re-approve for future transactions</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>

            {/* Option 2: Unlimited Amount */}
            <label 
              className={`approval-option ${approvalType === 'unlimited' ? 'selected' : ''} unlimited`}
              onClick={() => setApprovalType('unlimited')}
            >
              <input
                type="radio"
                name="approvalType"
                value="unlimited"
                checked={approvalType === 'unlimited'}
                onChange={() => setApprovalType('unlimited')}
              />
              <div className="option-content">
                <div className="option-header">
                  <strong>Unlimited</strong>
                  <span className="badge warning">⚡ Convenience</span>
                </div>
                <div className="option-description">
                  Approve unlimited {token.symbol} for all future transactions
                </div>
                <div className="option-pros-cons">
                  <div className="pros">
                    <div className="pro-item">
                      <span className="icon">✅</span>
                      <span>No need to approve again for this token</span>
                    </div>
                    <div className="pro-item">
                      <span className="icon">⚡</span>
                      <span>Save gas on future transactions</span>
                    </div>
                  </div>
                  <div className="cons">
                    <div className="con-item">
                      <span className="icon">🚨</span>
                      <span><strong>All tokens at risk</strong> if contract or wallet is compromised</span>
                    </div>
                    <div className="con-item">
                      <span className="icon">⚠️</span>
                      <span>Requires manual revocation to remove access</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Security Warning for Unlimited */}
          {approvalType === 'unlimited' && (
            <div className="security-warning">
              <div className="warning-icon">🚨</div>
              <div className="warning-content">
                <strong>Security Notice:</strong>
                <p>
                  With unlimited approval, the contract can spend <strong>ALL</strong> of your {token.symbol} tokens at any time. 
                  Only proceed if you trust this contract completely.
                </p>
                <p>
                  You can revoke this approval later in the "Approvals" section.
                </p>
              </div>
            </div>
          )}

          {/* Security Info */}
          {approvalType === 'exact' && (
            <div className="security-info">
              <div className="info-icon">ℹ️</div>
              <div className="info-content">
                <strong>Why Exact Approval?</strong>
                <p>
                  Exact approvals provide the highest level of security by limiting contract access to only the tokens needed for this specific transaction.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button
            className={`approve-button ${approvalType === 'unlimited' ? 'danger' : ''}`}
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-small" />
                Approving...
              </>
            ) : (
              <>
                {approvalType === 'exact' ? '🛡️' : '⚡'} 
                Approve {approvalType === 'exact' ? 'Exact' : 'Unlimited'}
              </>
            )}
          </button>
          <button
            className="cancel-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {/* Bottom Note */}
        <div className="modal-note">
          <small>
            💡 Tip: You can manage all your approvals in the "Security" tab
          </small>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .approval-modal {
          background: var(--bg-primary, #fff);
          border-radius: 16px;
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        .approval-icon {
          font-size: 2rem;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          flex: 1;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary, #6b7280);
          cursor: pointer;
          padding: 0.25rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .modal-close:hover:not(:disabled) {
          background: var(--bg-tertiary, #f3f4f6);
          color: var(--text-primary, #111);
        }

        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-content {
          padding: 1.5rem;
        }

        .approval-info {
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .approval-info p {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          color: var(--text-primary, #111);
        }

        .contract-address {
          color: var(--text-secondary, #6b7280);
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .approval-options {
          margin-bottom: 1rem;
        }

        .approval-options h3 {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-primary, #111);
        }

        .approval-option {
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .approval-option:hover {
          border-color: var(--primary-color, #2172e5);
          background: var(--bg-module, #f9fafb);
        }

        .approval-option.selected {
          border-color: var(--primary-color, #2172e5);
          background: rgba(33, 114, 229, 0.05);
        }

        .approval-option.recommended.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .approval-option input[type="radio"] {
          margin-top: 0.25rem;
          cursor: pointer;
        }

        .option-content {
          flex: 1;
        }

        .option-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .option-header strong {
          font-size: 1rem;
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .badge.recommended {
          background: #d1fae5;
          color: #065f46;
        }

        .badge.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .option-description {
          font-size: 0.875rem;
          color: var(--text-secondary, #6b7280);
          margin-bottom: 0.75rem;
        }

        .option-pros-cons {
          font-size: 0.8rem;
        }

        .pros, .cons {
          margin-bottom: 0.5rem;
        }

        .pro-item, .con-item {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          align-items: flex-start;
        }

        .pro-item .icon {
          flex-shrink: 0;
        }

        .con-item {
          color: #dc2626;
        }

        .con-item .icon {
          flex-shrink: 0;
        }

        .security-warning {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .warning-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .warning-content strong {
          color: #991b1b;
          display: block;
          margin-bottom: 0.25rem;
        }

        .warning-content p {
          font-size: 0.875rem;
          color: #7f1d1d;
          margin: 0.25rem 0;
        }

        .security-info {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .info-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .info-content strong {
          color: #1e40af;
          display: block;
          margin-bottom: 0.25rem;
        }

        .info-content p {
          font-size: 0.875rem;
          color: #1e3a8a;
          margin: 0;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color, #e5e7eb);
          display: flex;
          gap: 0.75rem;
        }

        .approve-button {
          flex: 1;
          background: var(--primary-color, #2172e5);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .approve-button:hover:not(:disabled) {
          background: #1e63c5;
          transform: translateY(-1px);
        }

        .approve-button.danger {
          background: #ef4444;
        }

        .approve-button.danger:hover:not(:disabled) {
          background: #dc2626;
        }

        .approve-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .cancel-button {
          flex: 1;
          background: var(--bg-tertiary, #f3f4f6);
          color: var(--text-primary, #111);
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button:hover:not(:disabled) {
          background: var(--bg-quaternary, #e5e7eb);
        }

        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .modal-note {
          padding: 0.75rem 1.5rem;
          background: var(--bg-module, #f9fafb);
          text-align: center;
          color: var(--text-secondary, #6b7280);
          border-top: 1px solid var(--border-color, #e5e7eb);
        }
      `}</style>
    </div>
  );
}

/**
 * Get friendly name for spender address
 */
function getSpenderName(address) {
  const lowerAddress = address.toLowerCase();
  
  // Add known contract names
  const knownContracts = {
    // Add your router addresses here
  };
  
  return knownContracts[lowerAddress] || 'Uniswap V2 Router';
}

export default ApprovalModal;

