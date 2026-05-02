import { useState, useEffect } from 'react'
import { createReview, getReviews } from '../../api/reviewApi'
import { Star, X } from 'lucide-react'

export default function PlatformReviewModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (isOpen) {
      getReviews().then(res => {
        const validRev = res.data.filter(r => r.comment && r.comment.length > 2)
        setReviews(validRev.slice(0, 50)) // Show up to 50 recent
      }).catch(err => console.error("Error fetching reviews:", err))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setError("Please select a rating.")
      return
    }
    setError(null)
    setLoading(true)

    try {
      // Create a platform review (no shelter, no target_user)
      await createReview({ rating, comment })
      
      // Notify the carousel component
      window.dispatchEvent(new Event('reviewAdded'))
      
      // Update local modal state immediately
      setReviews(prev => [{
        id: Date.now(), 
        rating, 
        comment, 
        user_detail: { username: 'You', district: 'Dhaka' },
        created_at: new Date().toISOString()
      }, ...prev])

      setRating(0)
      setComment('')

    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || err.message || "Failed to submit review.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Rate & Review PawHub</h2>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', flexShrink: 0 }}>{error}</div>}

        {/* Existing Reviews List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '24px', paddingRight: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Recent Reviews</h3>
          {reviews.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No reviews yet. Be the first!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {/* Avatar */}
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%', background: '#ea580c', color: '#ffffff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem',
                        textTransform: 'uppercase', flexShrink: 0
                      }}>
                        {(r.user_detail?.username || 'U').substring(0, 2)}
                      </div>
                      
                      {/* Name and Meta */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                          {r.user_detail?.username || 'User'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {new Date(r.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span>·</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
                          {r.user_detail?.district || r.user_detail?.city || 'Dhaka, Bangladesh'}
                        </span>
                      </div>
                    </div>

                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} fill={i < r.rating ? "#FFB800" : "#cbd5e1"} strokeWidth={0} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Comment */}
                  <p style={{ fontSize: '0.95rem', color: '#334155', margin: 0, lineHeight: 1.5 }}>{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ flexShrink: 0 }}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Star 
                    size={32} 
                    fill={(hoveredRating || rating) >= star ? "#FFB800" : "none"} 
                    stroke={(hoveredRating || rating) >= star ? "#FFB800" : "#cbd5e1"} 
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Select your rating</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
              Share your experience
            </label>
            <textarea
              rows="4"
              placeholder="Tell us what you love or how we can improve..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px',
                fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical'
              }}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 16px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 20px', border: 'none', background: '#0ea5e9', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
