import { useState, useEffect, memo } from 'react'
import { X, MessageCircle, MapPin, Clock, User, ExternalLink, CheckCircle, Loader2, FileText } from 'lucide-react'
import api from '../../api/axiosInstance'
import useChatStore from '../../store/chatStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ConfirmModal from '../ui/ConfirmModal'

function OngoingConsultsModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [consults, setConsults] = useState([])
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedConsultId, setSelectedConsultId] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchConsults()
    }
  }, [isOpen])

  const fetchConsults = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/vet/emergencies/active_consultations/')
      setConsults(data)
    } catch (err) {
      toast.error('Could not load active consultations.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = async (consult) => {
    try {
      const patientId = consult.patient
      if (!patientId) {
        return toast.error("Invalid patient details.")
      }

      // Find or create conversation with the patient
      const { data } = await api.get(`/api/chat/conversations/find_or_create/?user_id=${patientId}`)
      
      // Navigate to chat and set active conversation
      navigate('/chat')
      
      setTimeout(() => {
        useChatStore.getState().setActiveConversation(data)
        toast.success(`Opening chat with ${consult.patient_name}`, { icon: '💬' })
      }, 100)

      onClose()
    } catch (err) {
      console.error("Chat error:", err)
      toast.error('Could not open chat room.')
    }
  }

  const handleComplete = async (consultId) => {
    setSelectedConsultId(consultId)
    setShowConfirm(true)
  }

  const onConfirmResolve = async () => {
    if (!selectedConsultId) return
    try {
      await api.post(`/api/vet/emergencies/${selectedConsultId}/resolve/`)
      toast.success('Consultation marked as completed!')
      setShowConfirm(false)
      fetchConsults() // Refresh list
    } catch (err) {
      toast.error('Could not complete consultation.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-box" style={{ 
        maxWidth: 700, width: '90%', padding: 0, overflow: 'hidden', 
        background: 'var(--gray-950)', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Header */}
        <div style={{ 
          padding: '24px 28px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(139, 92, 246, 0.1)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--gray-50)' }}>
              <MessageCircle size={24} color="#8b5cf6" /> Ongoing Consultations
            </h2>
            <p style={{ fontSize: '.85rem', color: 'var(--gray-200)', marginTop: 2 }}>Manage your active patient sessions and medical records.</p>
          </div>
          <button onClick={onClose} className="modal-close" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 className="spinner" />
              <p style={{ marginTop: 12, color: 'var(--gray-400)' }}>Syncing active sessions...</p>
            </div>
          ) : consults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>☕</div>
              <h3 style={{ fontWeight: 700, color: 'var(--gray-100)' }}>All Quiet</h3>
              <p style={{ color: 'var(--gray-300)', fontSize: '.9rem', marginTop: 8 }}>You have no active consultations at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {consults.map(c => (
                <div key={c.id} style={{ 
                  padding: 20, background: 'var(--gray-900)', border: '1px solid var(--border-color)',
                  borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
                  transition: 'none' // Remove transitions to avoid lag during scrolling
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 52, height: 52, borderRadius: '16px', background: 'rgba(139, 92, 246, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      {c.patient_avatar ? (
                        <img 
                          src={c.patient_avatar.startsWith('http') ? c.patient_avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${c.patient_avatar}`} 
                          alt="Patient" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <User size={24} color="#8b5cf6" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-50)' }}>{c.patient_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, color: 'var(--gray-300)', fontSize: '.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> 
                          Active since {c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                        </span>
                        {c.distance_km && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {c.distance_km} km away</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      onClick={async () => {
                        try {
                          await api.post('/api/vet/consultation/select', { consultation_id: c.id })
                          onClose()
                          window.dispatchEvent(new CustomEvent('open-prescription-modal', { detail: { ownerId: c.patient } }))
                        } catch (err) {
                          toast.error('Could not select consultation context.')
                        }
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ 
                        background: 'rgba(139, 92, 246, 0.1)', 
                        color: '#a78bfa',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        gap: 8, padding: '8px 16px',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <FileText size={16} /> Prescription
                    </button>
                    <button 
                      onClick={() => handleComplete(c.id)}
                      className="btn btn-sm" 
                      style={{ 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        color: 'var(--green-400)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        gap: 8, padding: '8px 16px',
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <CheckCircle size={16} /> Complete
                    </button>
                    <button 
                      onClick={() => handleOpenChat(c)}
                      className="btn btn-primary btn-sm" 
                      style={{ background: '#8b5cf6', borderColor: '#8b5cf6', gap: 8, padding: '8px 24px' }}
                    >
                      <MessageCircle size={16} /> Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 28px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p style={{ fontSize: '.75rem', color: 'var(--gray-200)', fontWeight: 600 }}>
            Session data is synced in real-time. Use the "Message" button to resume contact.
          </p>
        </div>
      </div>
      <ConfirmModal 
        isOpen={showConfirm}
        title="Complete Consultation"
        message="Mark this medical session as completed? This will move it to patient history and allow them to leave a review."
        confirmText="Yes, Complete"
        variant="purple"
        onConfirm={onConfirmResolve}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}

export default memo(OngoingConsultsModal)
