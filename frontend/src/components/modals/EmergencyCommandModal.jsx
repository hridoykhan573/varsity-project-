import { useState, useEffect, memo } from 'react'
import { X, MessageCircle, MapPin, Clock, AlertTriangle, ExternalLink, Image as ImageIcon, Loader2, Trash2, CheckCircle, Zap } from 'lucide-react'
import api from '../../api/axiosInstance'
import useChatStore from '../../store/chatStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
function EmergencyCommandModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [emergencies, setEmergencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchEmergencies()
    }
  }, [isOpen])

  const fetchEmergencies = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/vet/emergencies/my_emergencies/')
      setEmergencies(data)
    } catch (err) {
      toast.error('Could not load emergencies.')
    } finally {
      setLoading(false)
    }
  }

  const handleConsult = async (emergency) => {
    try {
      // 1. Approve the request (moves it to 'active' status and removes from incoming list)
      await api.post(`/api/vet/emergencies/${emergency.id}/approve/`)
      
      // 2. Remove from local state so it immediately disappears from this portal
      setEmergencies(prev => prev.filter(e => e.id !== emergency.id))

      toast.success(`Consultation Approved! Case moved to Ongoing Consultations.`, { icon: '✅' })

      // Close the modal so the doctor can see the "Ongoing" card updated
      onClose()
    } catch (err) {
      console.error("Approval error:", err)
      toast.error('Could not approve consultation.')
    }
  }

  const handleDelete = async (emId) => {
    if (!window.confirm("Are you sure you want to clear this request? This will remove it from your feed.")) return
    
    try {
      await api.delete(`/api/vet/emergencies/${emId}/`)
      setEmergencies(prev => prev.filter(e => e.id !== emId))
      toast.success('Emergency request removed.')
    } catch (err) {
      toast.error('Could not delete request.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-box" style={{ maxWidth: 800, width: '90%', padding: 0, overflow: 'hidden', background: 'var(--gray-900)' }}>
        
        {/* Header */}
        <div style={{ 
          padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.1)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Zap size={24} className="text-danger" /> Emergency
            </h2>
            <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', marginTop: 2 }}>Manage incoming urgent medical assistance requests.</p>
          </div>
          <button onClick={onClose} className="modal-close" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Loader2 className="spinner" />
              <p style={{ marginTop: 12, color: 'var(--gray-400)' }}>Syncing with Emergency Dispatch...</p>
            </div>
          ) : emergencies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
              <h3 style={{ fontWeight: 700, color: 'var(--gray-200)' }}>No Active Emergencies</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '.9rem', marginTop: 8, maxWidth: 300, margin: '8px auto' }}>
                Great job! All assigned emergency cases are currently cleared. You'll be alerted when a new request arrives.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {emergencies.map(em => (
                <div key={em.id} className="card" style={{ 
                  padding: 24, background: 'var(--gray-850)', border: '1px solid rgba(255,255,255,0.05)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {em.status === 'accepted' && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'var(--danger)' }} />
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-100)' }}>{em.patient_name}</span>
                        <span style={{ 
                          fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', 
                          padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)'
                        }}>Urgent Request</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, color: 'var(--gray-400)', fontSize: '.75rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(em.created_at).toLocaleTimeString()}</span>
                        {em.distance_km && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {em.distance_km} km away</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleDelete(em.id)}
                        className="btn btn-ghost" 
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--gray-500)', WebkitTextFillColor: 'unset' }}
                        title="Delete Request"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleConsult(em)}
                        className="btn btn-primary" 
                        style={{ background: '#10b981', borderColor: '#10b981', gap: 8 }}
                      >
                        <CheckCircle size={16} /> Approved
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '.85rem', color: 'var(--gray-300)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {em.message || "No specific message provided."}
                    </p>
                  </div>

                  {em.images && em.images.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {em.images.map((img, i) => {
                        const fullUrl = img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${img}`
                        return (
                          <div 
                            key={i} 
                            onClick={() => setSelectedImage(fullUrl)}
                            style={{ 
                              width: 100, height: 100, borderRadius: 8, overflow: 'hidden', 
                              border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in',
                              transition: 'var(--transition)'
                            }}
                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--danger)'}
                            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                          >
                            <img src={fullUrl} alt="Emergency evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                      )})}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    {em.latitude && em.longitude && (
                      <a 
                        href={`https://www.google.com/maps?q=${em.latitude},${em.longitude}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '.75rem', color: 'var(--orange-400)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                      >
                         <MapPin size={12} /> View Location on Map <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 28px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <p style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>
            Please prioritize emergency responses. Lives depend on your swift action.
          </p>
        </div>

      </div>

      {/* 🖼️ Image Lightbox Popup */}
      {selectedImage && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(0,0,0,0.94)', zIndex: 2000, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', padding: 40,
          }}
          onClick={() => setSelectedImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: 30, right: 30, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} />
          </button>
          <img 
            src={selectedImage} 
            alt="Full evidence" 
            style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default memo(EmergencyCommandModal)
