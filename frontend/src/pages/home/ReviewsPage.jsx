import { useState, useEffect } from 'react'
import { createReview, getReviews, deleteReview, updateReview } from '../../api/reviewApi'
import useAuthStore from '../../store/authStore'
import { Link } from 'react-router-dom'
import { Star, Edit2, Trash2 } from 'lucide-react'

export default function ReviewsPage() {
  const { user, isAuthenticated } = useAuthStore()

  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState([])
  const [editingReviewId, setEditingReviewId] = useState(null)

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0)
    
    getReviews().then(res => {
      const dataList = res.data?.results || res.data || []
      setReviews(dataList)
    }).catch(err => console.error("Error fetching reviews:", err))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setError("Please select a rating.")
      return
    }
    setError(null)
    setLoading(true)

    try {
      if (editingReviewId) {
        await updateReview(editingReviewId, { rating, comment })
        setReviews(prev => prev.map(r => r.id === editingReviewId ? { ...r, rating, comment } : r))
        setEditingReviewId(null)
      } else {
        const res = await createReview({ rating, comment })
        // Update local page state immediately using response data if available
        setReviews(prev => [res.data || {
          id: Date.now(), 
          rating, 
          comment, 
          user_detail: { username: 'You', district: 'Bangladesh' },
          created_at: new Date().toISOString()
        }, ...prev])
      }
      
      // Notify the carousel component on the home page
      window.dispatchEvent(new Event('reviewAdded'))
      
      setRating(0)
      setComment('')

    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || err.message || "Failed to submit review.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return
    try {
      await deleteReview(id)
      setReviews(prev => prev.filter(r => r.id !== id))
      window.dispatchEvent(new Event('reviewAdded')) // trigger carousel refresh
    } catch (err) {
      console.error(err)
      alert("Failed to delete review.")
    }
  }

  const handleEditClick = (review) => {
    setEditingReviewId(review.id)
    setRating(review.rating)
    setComment(review.comment)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '60px 20px' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#0f172a', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
            Community Reviews
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Read real experiences from the PawHub community or share your own!
          </p>
        </div>

        <div style={{ display: 'grid', gap: '40px', gridTemplateColumns: '1fr' }}>
          
          {/* Submit Review Card */}
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editingReviewId ? 'Edit Your Review' : 'Rate & Review PawHub'}</span>
              {editingReviewId && (
                <button 
                  onClick={() => { setEditingReviewId(null); setRating(0); setComment(''); }}
                  style={{ background: 'none', border: 'none', fontSize: '0.9rem', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Cancel Edit
                </button>
              )}
            </h2>
            
            {!isAuthenticated ? (
               <div style={{ textAlign: 'center', padding: '20px 0' }}>
                 <p style={{ color: '#64748b', marginBottom: '16px' }}>Please log in to share your experience and see your previous reviews.</p>
                 <Link to="/login" style={{ padding: '10px 24px', background: '#e85d04', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 600 }}>Log In</Link>
               </div>
            ) : (
              <>
                {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.95rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                        size={36} 
                        fill={(hoveredRating || rating) >= star ? "#FFB800" : "none"} 
                        stroke={(hoveredRating || rating) >= star ? "#FFB800" : "#cbd5e1"} 
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#64748b' }}>Click to set your rating</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                  Share your experience
                </label>
                <textarea
                  rows="4"
                  placeholder="Tell us what you love or how we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{
                    width: '100%', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '12px',
                    fontSize: '1rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical'
                  }}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '12px 28px', border: 'none', background: '#e85d04', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', opacity: loading ? 0.7 : 1, transition: 'background 0.2s' }}
                >
                  {loading ? (editingReviewId ? 'Updating...' : 'Submitting...') : (editingReviewId ? 'Update Review' : 'Submit Review')}
                </button>
              </div>
            </form>
            </>
            )}
          </div>

          {/* Existing Reviews Feed */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '20px', fontWeight: 700 }}>
              Community Feedback ({reviews.length})
            </h3>
            
            {reviews.length === 0 ? (
              <p style={{ fontSize: '1rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No reviews yet. Be the first to share!</p>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {reviews.map(r => {
                const isMyReview = user && r.user === user.id;
                return (
                  <div key={r.id} style={{ 
                    background: '#ffffff', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: isMyReview ? '2px solid #ea580c' : '1px solid #f1f5f9', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    position: 'relative'
                  }}>
                    {isMyReview && (
                      <span style={{ 
                        position: 'absolute', top: '-12px', right: '24px', background: '#ea580c', color: '#fff', 
                        padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        Your Review
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '46px', height: '46px', borderRadius: '50%', background: isMyReview ? '#ea580c' : '#64748b', color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem',
                          textTransform: 'uppercase', flexShrink: 0
                        }}>
                          {(r.user_detail?.username || 'U').substring(0, 2)}
                        </div>
                        
                        {/* Name and Meta */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                              {r.user_detail?.username || 'User'}
                            </span>
                            {r.review_type === 'platform' && (
                              <span style={{ fontSize: '0.7rem', color: '#0ea5e9', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Platform</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {new Date(r.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            <span>·</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
                            {r.user_detail?.district || r.user_detail?.city || 'Dhaka, Bangladesh'}
                          </span>
                        </div>
                      </div>

                      {/* Stars and Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        {isMyReview && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEditClick(r)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={18} fill={i < r.rating ? "#FFB800" : "#cbd5e1"} strokeWidth={0} />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Comment */}
                    <p style={{ fontSize: '1.05rem', color: '#334155', margin: 0, lineHeight: 1.6 }}>{r.comment}</p>
                  </div>
                );
              })}
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
