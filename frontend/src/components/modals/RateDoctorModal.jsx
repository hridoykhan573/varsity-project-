import { useState } from 'react'
import { X, Star, Loader2, HeartPulse } from 'lucide-react'
import api from '../../api/axiosInstance'
import toast from 'react-hot-toast'

export default function RateDoctorModal({ isOpen, onClose, doctor, onReviewSuccess }) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !doctor) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return toast.error('Please select a rating')
    
    setSubmitting(true)
    try {
      await api.post('/api/reviews/', {
        target_user: doctor.id,
        rating,
        comment,
      })
      toast.success(`Review submitted for ${doctor.full_name}!`, { icon: '⭐' })
      if (onReviewSuccess) onReviewSuccess()
      onClose()
      setRating(0)
      setComment('')
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || 'Could not submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-box" style={{ maxWidth: 450 }}>
        <button onClick={onClose} className="modal-close" style={{ top: 20, right: 20 }}>
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            width: 60, height: 60, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            color: 'var(--orange-500)'
          }}>
            <HeartPulse size={30} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-100)' }}>Rate Your Doctor</h2>
          <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', marginTop: 4 }}>
            How was your experience with <strong>{doctor.full_name}</strong>?
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Star 
                    size={40} 
                    fill={(hoveredRating || rating) >= star ? "var(--orange-400)" : "none"} 
                    stroke={(hoveredRating || rating) >= star ? "var(--orange-400)" : "var(--gray-600)"} 
                    strokeWidth={1.5}
                    style={{ transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
                  />
                </button>
              ))}
            </div>
            <p style={{ fontSize: '.75rem', fontWeight: 600, color: rating ? 'var(--orange-400)' : 'var(--gray-500)' }}>
              {rating ? ['Terrible', 'Poor', 'Average', 'Very Good', 'Excellent'][rating - 1] : 'Click to select star rating'}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '.85rem' }}>Your Comments</label>
            <textarea 
              className="form-input" 
              rows={4} 
              placeholder="What did you like? What could be improved..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              required
              style={{ minHeight: '100px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting || rating === 0} 
            className="btn btn-primary btn-block"
            style={{ height: 48, fontWeight: 800, fontSize: '1rem', marginTop: 10 }}
          >
            {submitting ? <Loader2 className="spinner-sm" /> : 'SUBMIT FEEDBACK'}
          </button>
        </form>
      </div>
    </div>
  )
}
