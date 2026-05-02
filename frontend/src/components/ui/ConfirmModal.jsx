import React from 'react'
import { AlertCircle } from 'lucide-react'

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  variant = 'danger' 
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 400, animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ 
            width: 56, height: 56, borderRadius: '50%', 
            background: variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : variant === 'purple' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: variant === 'danger' ? '#f87171' : variant === 'purple' ? '#8b5cf6' : 'var(--orange-400)',
            marginBottom: 20
          }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12, color: 'var(--gray-50)' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '.95rem', lineHeight: 1.5, marginBottom: 28 }}>
            {message}
          </p>
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button 
              className={`btn ${variant === 'danger' ? 'btn-danger' : variant === 'purple' ? 'btn-primary' : 'btn-primary'}`} 
              onClick={onConfirm} 
              style={{ 
                flex: 1, justifyContent: 'center',
                background: variant === 'purple' ? '#8b5cf6' : undefined,
                borderColor: variant === 'purple' ? '#8b5cf6' : undefined
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
