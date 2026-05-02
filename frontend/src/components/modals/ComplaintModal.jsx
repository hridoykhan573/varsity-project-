import { useState } from 'react'
import { X, Upload, Send, MessageCircle } from 'lucide-react'
import { submitComplaint } from '../../api/complaintApi'
import toast from 'react-hot-toast'

export default function ComplaintModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    document: null
  })

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject || !formData.description) {
      return toast.error('Please fill in all required fields')
    }

    setLoading(true)
    try {
      const data = new FormData()
      data.append('subject', formData.subject)
      data.append('description', formData.description)
      if (formData.document) {
        data.append('document', formData.document)
      }

      await submitComplaint(data)
      toast.success('Message sent successfully. Admin will review it.')
      setFormData({ subject: '', description: '', document: null })
      onClose()
    } catch (err) {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--orange-500)', padding: 8, borderRadius: 10 }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Message to Admin</h3>
              <p style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>Get in touch with the support team for assistance</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Invalid listing information"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Describe the issue in detail..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
              style={{ resize: 'none' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Supporting Document (Optional)</label>
            <div 
              style={{ 
                border: '2px dashed rgba(255,255,255,0.1)', 
                borderRadius: 12, 
                padding: '20px', 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: formData.document ? 'rgba(52, 211, 153, 0.05)' : 'transparent',
                borderColor: formData.document ? '#34d399' : 'rgba(255,255,255,0.1)'
              }}
              onClick={() => document.getElementById('complaint-doc').click()}
            >
              <Upload size={24} style={{ color: 'var(--gray-500)', marginBottom: 8 }} />
              <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>
                {formData.document ? formData.document.name : 'Click to upload support documents'}
              </p>
              <input 
                id="complaint-doc"
                type="file" 
                style={{ display: 'none' }} 
                onChange={e => setFormData({ ...formData, document: e.target.files[0] })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, background: 'var(--orange-500)', borderColor: 'var(--orange-500)' }}>
              {loading ? 'Sending...' : <><Send size={16} /> Send Message</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
