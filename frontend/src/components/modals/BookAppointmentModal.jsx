import { useState, useEffect } from 'react'
import { X, Calendar, Clock, PawPrint, AlertCircle, CheckCircle2, Loader2, ChevronRight, Activity } from 'lucide-react'
import { getAvailableSlots, bookAppointment } from '../../api/appointmentApi'
import toast from 'react-hot-toast'

export default function BookAppointmentModal({ doctor, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [dailyLimit, setDailyLimit] = useState(null)
  
  const [formData, setFormData] = useState({
    pet_name: '',
    symptoms: ''
  })
  const [booking, setBooking] = useState(false)

  // Fetch slots whenever date changes
  useEffect(() => {
    if ((doctor?.user || doctor?.user_id) && date) {
      fetchSlots()
    }
  }, [date, doctor])

  const fetchSlots = async () => {
    setLoadingSlots(true)
    try {
      const res = await getAvailableSlots(doctor.user_id || doctor.user, date)
      setSlots(res.data.slots || [])
      setDailyLimit(res.data.daily_limit || null)
      setSelectedSlots([]) // Reset on date change
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load time slots")
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBook = async () => {
    if (selectedSlots.length === 0) return toast.error("Please select at least one time slot")
    if (!formData.pet_name) return toast.error("Pet name is required")
    
    setBooking(true)
    try {
      const results = await Promise.allSettled(
        selectedSlots.map(slot => bookAppointment({
          doctor: doctor.user_id || doctor.user,
          appointment_date: date,
          time_slot: slot.time,
          ...formData
        }))
      )
      
      const successCount = results.filter(r => r.status === 'fulfilled').length
      if (successCount === selectedSlots.length) {
        toast.success("Appointment request(s) sent! Wait for doctor approval.")
        onSuccess?.()
        onClose()
      } else if (successCount > 0) {
        toast.success(`Partially successful: ${successCount} out of ${selectedSlots.length} slots booked.`)
        onSuccess?.()
        onClose()
      } else {
        const firstError = results.find(r => r.status === 'rejected')?.reason
        toast.error(firstError?.response?.data?.error || "Booking failed for selected slots.")
      }
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--orange-500)' }}>
              <Calendar size={24} style={{ margin: '0 auto' }} />
            </div>
            <div>
              <h3 className="modal-title">Book Appointment</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Dr. {doctor.full_name || doctor.user_details?.full_name}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Select Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                  <input 
                    type="date" 
                    className="form-input" 
                    value={date} 
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDate(e.target.value)}
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Available Slots</label>
                {dailyLimit && (
                  <div style={{ 
                    marginBottom: 16, 
                    padding: '10px 14px', 
                    background: 'rgba(249,115,22,0.1)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(249,115,22,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.8rem',
                    color: 'var(--orange-400)',
                    fontWeight: 600
                  }}>
                    <Activity size={16} />
                    <span>Special Daily Capacity: {dailyLimit} patients max</span>
                  </div>
                )}
                {loadingSlots ? (
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <Loader2 size={24} className="spinner" />
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 10 }}>Checking schedule...</p>
                  </div>
                ) : slots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                    {slots.map((slot, idx) => (
                      <button 
                        key={idx}
                        disabled={!slot.available}
                        onClick={() => {
                          if (selectedSlots.some(s => s.time === slot.time)) {
                            setSelectedSlots(prev => prev.filter(s => s.time !== slot.time))
                          } else {
                            setSelectedSlots(prev => [...prev, slot])
                          }
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: selectedSlots.some(s => s.time === slot.time) ? 'var(--orange-500)' : 'var(--border-color)',
                          background: selectedSlots.some(s => s.time === slot.time) ? 'rgba(249,115,22,0.1)' : slot.available ? 'var(--gray-800)' : 'rgba(255,255,255,0.05)',
                          color: selectedSlots.some(s => s.time === slot.time) ? 'var(--orange-400)' : slot.available ? 'var(--gray-200)' : 'var(--gray-500)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: '0.2s',
                          filter: !slot.available ? 'blur(0.8px)' : 'none',
                          opacity: !slot.available ? 0.6 : 1,
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={14} />
                            {slot.time}
                          </span>
                          {slot.remaining !== undefined && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 800,
                              color: slot.available ? 'var(--green-500)' : 'var(--danger)',
                              textTransform: 'uppercase'
                            }}>
                              {slot.available ? `${slot.remaining} seats left` : 'FULL'}
                            </span>
                          )}
                        </div>
                        {!slot.available && (
                           <div style={{ 
                             position: 'absolute', 
                             top: 0, left: 0, right: 0, bottom: 0, 
                             background: 'rgba(0,0,0,0.4)', 
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             zIndex: 1
                           }}>
                             <span style={{ 
                               fontSize: '0.6rem', 
                               color: '#fff', 
                               fontWeight: 900, 
                               transform: 'rotate(-15deg)', 
                               border: '1px solid #fff', 
                               padding: '2px 4px',
                               borderRadius: 4
                             }}>BOOKED</span>
                           </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-info" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <AlertCircle size={24} style={{ margin: '0 auto' }} />
                    <p>No available slots for this date. Please try another day.</p>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 10, padding: 14 }}
                disabled={selectedSlots.length === 0}
                onClick={() => setStep(2)}
              >
                Continue to Pet Details <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
               <div className="form-group">
                <label className="form-label">Pet Name</label>
                <div style={{ position: 'relative' }}>
                  <PawPrint size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                  <input 
                    className="form-input" 
                    placeholder="Enter pet name"
                    value={formData.pet_name}
                    onChange={e => setFormData({...formData, pet_name: e.target.value})}
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason for Visit / Symptoms</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Describe what's wrong with your pet..."
                  value={formData.symptoms}
                  onChange={e => setFormData({...formData, symptoms: e.target.value})}
                  rows={4}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  disabled={booking || !formData.pet_name}
                  onClick={handleBook}
                >
                  {booking ? <Loader2 size={18} className="spinner" /> : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
