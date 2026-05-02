import { useEffect, useState } from 'react'
import { getReviews } from '../../api/reviewApi'
import { Star } from 'lucide-react'

export default function ReviewCarousel() {
  const [reviews, setReviews] = useState([])

  const fetchReviews = () => {
    getReviews()
      .then(res => {
        const dataList = res.data?.results || res.data || []
        const validReviews = dataList.filter(r => r.comment && r.comment.length > 2 && r.review_type === 'platform')
        setReviews(validReviews)
      })
      .catch(err => console.error("Could not fetch reviews:", err))
  }

  useEffect(() => {
    fetchReviews()
    
    // Listen for custom event on window for immediate local updates
    const handleReviewAdded = () => fetchReviews()
    window.addEventListener('reviewAdded', handleReviewAdded)
    return () => window.removeEventListener('reviewAdded', handleReviewAdded)
  }, [])

  if (reviews.length === 0) return null

  // Duplicate for seamless infinite loop
  const displayReviews = [...reviews, ...reviews]

  return (
    <div style={{ padding: '60px 0', background: '#F8F9FA', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#212529', fontWeight: 800 }}>
          What Pet Owners Say
        </h2>
      </div>

      <div style={{
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
      }}>
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          padding: '1rem 0',
          width: 'max-content',
          animation: 'scrollTrack 35s linear infinite'
        }}
        onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'paused'}
        onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'running'}
        >
          {displayReviews.map((review, idx) => (
            <div key={`${review.id}-${idx}`} style={{
              background: '#ffffff',
              border: '1px solid #E9ECEF',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '320px',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: '#ea580c', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem',
                  textTransform: 'uppercase', flexShrink: 0
                }}>
                  {review.user_detail?.avatar ? (
                    <img src={review.user_detail.avatar} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    (review.user_detail?.username || 'U').substring(0, 2)
                  )}
                </div>
                <div style={{ color: '#FFB800', display: 'flex', gap: '3px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} fill={i < review.rating ? "#FFB800" : "#e2e8f0"} strokeWidth={0} />
                  ))}
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#334155', margin: 0, fontStyle: 'italic' }}>
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes scrollTrack {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 0.75rem)); }
        }
      `}</style>
    </div>
  )
}
