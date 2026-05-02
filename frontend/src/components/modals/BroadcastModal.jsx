import React from 'react'
import { Send, X, MessageSquare, Info } from 'lucide-react'

export default function BroadcastModal({ 
  isOpen, 
  onClose, 
  onSend, 
  type = 'bootcamp', 
  loading = false 
}) {
  const [message, setMessage] = React.useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    onSend(message)
    setMessage('')
  }

  const targetLabel = type === 'shelter' ? 'All Shelter Customers' : 'All Bootcamp Participants'

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 500, 
          padding: 0,
          background: 'var(--gray-900)', 
          border: '1px solid rgba(128,128,128,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          background: 'rgba(128,128,128,0.03)', 
          borderBottom: '1px solid rgba(128,128,128,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: 10, 
              background: 'rgba(249, 115, 22, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--orange-400)'
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--gray-50)' }}>Broadcast Message</h2>
              <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', margin: '2px 0 0 0' }}>Send real-time updates instantly</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="modal-close"
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ 
            background: 'rgba(249, 115, 22, 0.05)', 
            border: '1px solid rgba(249, 115, 22, 0.12)', 
            borderRadius: 12, 
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12
          }}>
            <Info size={18} style={{ color: 'var(--orange-400)', marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: '.82rem', color: 'var(--orange-500)', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              Your message will be sent to <strong style={{ color: 'var(--orange-400)' }}>{targetLabel}</strong>. 
              This will appear in their real-time notification feed.
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: 'block', fontSize: '.75rem', fontWeight: 700, 
              color: 'var(--gray-500)', textTransform: 'uppercase', 
              letterSpacing: '0.05em', marginBottom: 10 
            }}>
              Message Content
            </label>
            <textarea
              required
              autoFocus
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What would you like to say?..."
              className="form-textarea"
              style={{
                width: '100%',
                minHeight: 140,
                background: 'var(--gray-950)',
                border: '1px solid var(--gray-700)',
                borderRadius: 12,
                padding: 16,
                color: 'var(--gray-100)',
                fontSize: '.95rem',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
                transition: 'var(--transition)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !message.trim()}
              style={{ flex: 1, justifyContent: 'center', gap: 10, padding: '12px' }}
            >
              {loading ? (
                <>Sending...</>
              ) : (
                <>
                  <Send size={18} />
                  Send Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
