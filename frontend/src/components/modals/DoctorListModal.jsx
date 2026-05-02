import { useState, useEffect } from 'react'
import { X, Search, MapPin, MessageCircle, Star, ShieldCheck, Loader2, AlertCircle, PlusCircle } from 'lucide-react'
import { getOnlineDoctors } from '../../api/veterinaryApi'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axiosInstance'
import useChatStore from '../../store/chatStore'
import toast from 'react-hot-toast'

export default function DoctorListModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // New State for form
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [message, setMessage] = useState('')
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDoctors()
      setSelectedDoctor(null)
      setMessage('')
      setImages([])
    }
  }, [isOpen])

  const fetchDoctors = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getOnlineDoctors()
      setDoctors(data.results || data || [])
    } catch (err) {
      setError('Could not load active doctors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEmergency = async () => {
    if (!selectedDoctor) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('forced_doctor_id', selectedDoctor.user_id)
      formData.append('message', message)
      
      // Location (optional, try to get if possible)
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
          formData.append('latitude', position.coords.latitude)
          formData.append('longitude', position.coords.longitude)
        })
      }

      images.forEach((file) => {
        formData.append('images', file)
      })

      const { data } = await api.post('/api/vet/emergencies/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Find or create conversation with the doctor
      const chatRes = await api.get(`/api/chat/conversations/find_or_create/?user_id=${selectedDoctor.user_id}`)
      useChatStore.getState().setActiveConversation(chatRes.data)

      toast.success(`Emergency alert sent to ${selectedDoctor.full_name}!`, { icon: '🚨' })
      onClose()
      navigate('/chat')
    } catch (err) {
      toast.error('Could not initiate emergency contact.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + images.length > 5) {
      return toast.error('Maximum 5 images allowed')
    }
    setImages([...images, ...files])
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-box glass" style={{ maxWidth: 520, padding: 0, overflow: 'hidden', backdropFilter: 'blur(16px)' }}>
        
        {/* Header */}
        <div style={{ 
          padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.08)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-50)' }}>
              <ShieldCheck size={22} className="text-danger" /> Emergency Doctor Portal
            </h2>
            <p style={{ fontSize: '.85rem', color: 'var(--gray-200)', marginTop: 2, fontWeight: 500 }}>
              {selectedDoctor ? `Contacting ${selectedDoctor.full_name}` : 'Only showing currently online, verified professionals.'}
            </p>
          </div>
          <button onClick={onClose} className="modal-close" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>
          {!selectedDoctor ? (
            // Step 1: Search Doctors
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Loader2 className="spinner" />
                  <p style={{ marginTop: 12, color: 'var(--gray-400)' }}>Scanning for active medical personnel...</p>
                </div>
              ) : error ? (
                <div className="alert alert-error">
                  <AlertCircle size={16} /> {error}
                </div>
              ) : doctors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😿</div>
                  <h3 style={{ fontWeight: 700 }}>No online doctors found</h3>
                  <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', marginTop: 6 }}>
                    There are no veterinary doctors active at this moment. You can still leave a message or try again in a few minutes.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {doctors.map(doctor => (
                    <div key={doctor.id} className="card" style={{ 
                      padding: 16, display: 'flex', alignItems: 'center', gap: 16,
                      border: '1px solid var(--border-color)', background: 'var(--gray-800)',
                    }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gray-700)', overflow: 'hidden' }}>
                        {doctor.avatar ? (
                          <img src={doctor.avatar} alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.4rem' }}>👨‍⚕️</div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{doctor.full_name}</span>
                          {doctor.approval_status === 'approved' && <ShieldCheck size={14} className="text-green-500" />}
                        </div>
                        <p style={{ fontSize: '.8rem', color: 'var(--orange-400)', fontWeight: 600 }}>{doctor.specialization}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-500)', fontSize: '.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {doctor.clinic_name}</span>
                          {doctor.rating_stats && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fb923c' }}>
                              <Star size={12} fill="currentColor" /> 
                              {doctor.rating_stats.average || '0.0'} 
                              <span style={{ color: 'var(--gray-600)', fontSize: '.7rem' }}>({doctor.rating_stats.count})</span>
                            </span>
                          )}
                          <span style={{ 
                            padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', 
                            color: 'var(--danger)', fontWeight: 800, fontSize: '.7rem'
                          }}>
                            Fee: {doctor.emergency_fee ? `৳${Number(doctor.emergency_fee).toLocaleString()}` : 'Free'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDoctor(doctor)}
                        className="btn btn-primary btn-sm"
                        style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                      >
                        <MessageCircle size={14} /> Contact Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Step 2: Emergency Details Form
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <button 
                onClick={() => setSelectedDoctor(null)}
                style={{ background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: '.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Back to doctor list
              </button>
              
              <div className="form-group">
                <label style={{ color: 'var(--gray-100)', marginBottom: 8, display: 'block', fontSize: '.9rem', fontWeight: 700 }}>
                  What is the emergency? <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea 
                  className="form-control"
                  placeholder="Describe your pet's condition (e.g., severe bleeding, difficulty breathing, accident)..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ 
                    background: 'var(--gray-900)', 
                    border: '1px solid var(--border-color)',
                    color: 'var(--gray-50)',
                    fontSize: '.95rem',
                    padding: '12px 16px',
                    borderRadius: 8,
                    resize: 'none',
                    transition: 'var(--transition)',
                    width: '100%',
                    outline: 'none',
                    fontWeight: '500'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--danger)'; e.target.style.boxShadow = '0 0 0 2px rgba(239, 68, 68,0.1)'; }}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              <div className="form-group">
                <label style={{ color: 'var(--gray-300)', marginBottom: 8, display: 'block', fontSize: '.9rem', fontWeight: 600 }}>
                  Attach Photos (Visual evidence helps doctors)
                </label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageChange}
                  id="emergency-photos"
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <label htmlFor="emergency-photos" style={{ 
                    width: 80, height: 80, borderRadius: 8, border: '2px dashed rgba(255,255,255,0.1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--gray-500)', transition: 'var(--transition)'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--danger)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    <PlusCircle size={20} />
                    <span style={{ fontSize: '.65rem', marginTop: 4 }}>Add Photo</span>
                  </label>
                  {images.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' }}>
                      <img src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSubmitEmergency}
                disabled={submitting || !message.trim()}
                className="btn btn-danger btn-block"
                style={{ height: 48, fontWeight: 800, fontSize: '1rem' }}
              >
                {submitting ? <Loader2 className="spinner-sm" /> : '🚀 SEND EMERGENCY ALERT'}
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 28px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p style={{ fontSize: '.75rem', color: 'var(--gray-200)', fontWeight: 600 }}>
            All consultations are recorded for pet safety and quality assurance.
          </p>
        </div>

      </div>
    </div>
  )
}
