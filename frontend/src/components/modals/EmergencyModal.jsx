import { useState, useEffect } from 'react'
import { AlertCircle, MapPin, X, Loader2, Zap, MessageSquare, ChevronRight } from 'lucide-react'
import { requestEmergency } from '../../api/veterinaryApi'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function EmergencyModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('confirm') // confirm | locating | finding | result
  const [error, setError] = useState('')
  const [doctorInfo, setDoctorInfo] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setStep('confirm')
      setError('')
      setDoctorInfo(null)
    }
  }, [isOpen])

  const startEmergency = () => {
    setStep('locating')
    setError('')

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setStep('confirm')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStep('finding')
        try {
          const { data } = await requestEmergency(pos.coords.latitude, pos.coords.longitude)
          setDoctorInfo(data)
          setStep('result')
          toast.success('Emergency response initiated!', { icon: '🚨' })
        } catch (err) {
          setError(err.response?.data?.error || 'Could not find a doctor at this time.')
          setStep('confirm')
        }
      },
      (err) => {
        setError('Location access denied. Please allow GPS to use the emergency system.')
        setStep('confirm')
      },
      { timeout: 10000 }
    )
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: step === 'result' ? 480 : 420, padding: 0, overflow: 'hidden' }}>
        
        {/* Header (Visual) */}
        <div style={{ 
          height: 120, 
          background: step === 'confirm' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(249, 115, 22, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          position: 'relative'
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <X size={18} />
          </button>
          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', 
            background: step === 'result' ? 'var(--green-500)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
            animation: step === 'locating' || step === 'finding' ? 'pulse 1.5s infinite' : 'none'
          }}>
            <Zap size={32} color="#fff" />
          </div>
        </div>

        <div style={{ padding: '32px 28px' }}>
          {step === 'confirm' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>Emergency Help</h2>
              <p style={{ color: 'var(--gray-400)', fontSize: '.95rem', lineHeight: 1.6, marginBottom: 28 }}>
                Clicking the button below will share your GPS location with our network of approved veterinarians to find the nearest help.
              </p>
              
              {error && (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button onClick={startEmergency} className="btn btn-danger btn-lg" style={{ flex: 2, justifyContent: 'center' }}>
                  Locate Nearest Doctor
                </button>
              </div>
            </div>
          )}

          {(step === 'locating' || step === 'finding') && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 className="spinner" style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
                {step === 'locating' ? 'Accessing GPS...' : 'Analyzing Nearest Doctors...'}
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '.9rem' }}>
                Please stay on this page. We are broadcasting your request to active medical personnel.
              </p>
            </div>
          )}

          {step === 'result' && doctorInfo && (
            <div style={{ animation: 'slideUp .4s ease' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green-400)', marginBottom: 4 }}>Help is on the way!</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--gray-400)', fontSize: '.85rem' }}>
                  <MapPin size={14} /> Assigned doctor is {doctorInfo.distance_km}km away
                </div>
              </div>

              <div style={{ 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', alignItems: 'center', gap: 16,
                marginBottom: 32
              }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gray-700)', overflow: 'hidden' }}>
                  {doctorInfo.doctor_details.avatar ? (
                    <img src={doctorInfo.doctor_details.avatar} alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem' }}>👨‍⚕️</div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{doctorInfo.doctor_details.full_name}</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--orange-400)', fontWeight: 600 }}>{doctorInfo.doctor_details.specialization}</div>
                  <div style={{ fontSize: '.85rem', color: 'var(--gray-500)' }}>{doctorInfo.doctor_details.clinic_name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', height: 48, justifyContent: 'center', fontSize: '1rem' }}
                  onClick={() => {
                    onClose()
                    navigate('/chat')
                    toast('Redirecting to consultation room...', { icon: '💬' })
                  }}
                >
                  <MessageCircle size={18} /> Start Emergency Consultation
                </button>
                <div style={{ textAlign: 'center' }}>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '.85rem', fontWeight: 600 }}>
                    Close this window
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
