import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { User, MapPin, Phone, Mail, Star, Calendar, Trash2, Edit2, Send } from 'lucide-react'
import ReviewModal from '../../components/ui/ReviewModal'
import api from '../../api/axiosInstance'
import { formatDate, errorMessage } from '../../utils/helpers'
import { getReviews, createReview, deleteReview } from '../../api/reviewApi'
import { getMyAdoptions } from '../../api/adoptionApi'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

function StarRow({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onChange(i)} style={{ fontSize: '1.5rem', cursor: 'pointer', color: i <= value ? 'var(--amber-400)' : 'var(--gray-600)', transition: 'var(--transition)' }}>★</span>
      ))}
    </div>
  )
}

export default function UserProfilePage() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [tab, setTab] = useState('about')
  const [canReview, setCanReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', image: null })
  const [imagePreview, setImagePreview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const loadReviews = async () => {
    try {
      const { data } = await getReviews({ target_user: id })
      setReviews(data?.results || data || [])
    } catch (e) { console.error('Failed to load reviews') }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const pRes = await api.get(`/api/auth/users/${id}/`)
        setProfile(pRes.data)
        await loadReviews()

        if (isAuthenticated && String(user?.id) !== String(id)) {
           const { data } = await getMyAdoptions()
           const mySentRequests = data?.results || data || []
           const hasAcceptedInteraction = mySentRequests.some(r => 
             (r.pet_detail?.owner === parseInt(id) || r.pet_owner_id === parseInt(id)) && 
             r.status === 'accepted'
           )
           const alreadyReviewed = reviews.some(r => r.user === user?.id)
           setCanReview(hasAcceptedInteraction && !alreadyReviewed)
        }
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, isAuthenticated])

  const handleReview = async (e) => {
    e.preventDefault()
    setReviewLoading(true)
    try {
      const formData = new FormData()
      formData.append('target_user', id)
      formData.append('rating', reviewForm.rating)
      formData.append('comment', reviewForm.comment)
      formData.append('review_type', 'user')
      if (reviewForm.image) formData.append('image', reviewForm.image)

      await createReview(formData)
      toast.success('Review submitted! ⭐')
      setReviewForm({ rating: 5, comment: '', image: null })
      setImagePreview(null)
      setCanReview(false)
      await loadReviews()
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setReviewLoading(false) }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    try {
      await deleteReview(reviewId)
      toast.success('Review deleted')
      await loadReviews()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  if (loading) return <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>

  if (error) {
    return (
      <div className="container page-wrapper">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3>User not found</h3>
          <p>{error}</p>
          <Link to="/pets" className="btn btn-primary" style={{ marginTop: 16 }}>Go Back</Link>
        </div>
      </div>
    )
  }

  const ratingAvg = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const myReviewsCount = reviews.filter(r => user && r.user === user.id).length
  const canPostNewReview = isAuthenticated && String(user?.id) !== String(id) && myReviewsCount < 2

  return (
    <div className="container page-wrapper">
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div className="card" style={{ padding: '40px 30px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(249,115,22,0.03)', zIndex: 0 }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', position: 'relative', marginBottom: 20 }}>
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--orange-500)', boxShadow: 'var(--shadow-glow)' }} />
              ) : (
                <div className="avatar" style={{ width: 120, height: 120, fontSize: '2.5rem', border: '4px solid var(--orange-500)', boxShadow: 'var(--shadow-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: 'var(--orange-500)', color: '#fff', borderRadius: '50%' }}>
                  {profile.username?.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, marginBottom: 8, color: 'var(--gray-100)' }}>{profile.username}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(128,128,128,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(128,128,128,0.15)' }}>
                  <Star size={14} style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }} />
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-100)' }}>{ratingAvg}</span>
                  <span style={{ color: 'var(--gray-500)', fontSize: '.8rem' }}>({reviews.length} reviews)</span>
               </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', color: 'var(--gray-400)', fontSize: '.95rem' }}>
              {profile.location && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={16} className="text-orange" /> {profile.location}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} className="text-orange" /> Member since {formatDate(profile.created_at || new Date())}</div>
            </div>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 32 }}>
          {[{ id: 'about', label: '👤 User Profile' }, { id: 'reviews', label: `⭐ Seller Reviews (${reviews.length})` }].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'about' ? (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, color: 'var(--gray-100)' }}>
                <User size={20} className="text-orange" /> About User
              </h3>
              {profile.doctor_profile && (
                <div style={{ marginBottom: 20, padding: '16px 20px', background: 'rgba(249,115,22,0.06)', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ color: 'var(--orange-400)', fontSize: '.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Veterinary Expert</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{profile.doctor_profile.specialization?.charAt(0).toUpperCase() + profile.doctor_profile.specialization?.slice(1)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: 'var(--gray-500)', fontSize: '.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Emergency Fee</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--red-400)' }}>
                        {profile.doctor_profile.emergency_fee ? `৳${Number(profile.doctor_profile.emergency_fee).toLocaleString()}` : 'Free'}
                      </p>
                    </div>
                  </div>
                  {profile.doctor_profile.clinic_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-300)', fontSize: '.9rem' }}>
                      <Building size={14} className="text-gray-500" /> {profile.doctor_profile.clinic_name}
                    </div>
                  )}
                </div>
              )}
              {profile.bio ? <p style={{ color: 'var(--gray-300)', lineHeight: 1.6 }}>{profile.bio}</p> : <p style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>This user hasn't added a bio yet.</p>}
            </div>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, color: 'var(--gray-100)' }}>
                <Phone size={20} className="text-orange" /> Contact Info
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(249,115,22,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange-500)' }}><Mail size={18} /></div>
                  <div><p style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>Email</p><p style={{ fontWeight: 500, color: 'var(--gray-100)' }}>{profile.email || 'Contact via platform'}</p></div>
                </div>
                {profile.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(249,115,22,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange-500)' }}><Phone size={18} /></div>
                    <div><p style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>Phone</p><p style={{ fontWeight: 500, color: 'var(--gray-100)' }}>{profile.phone}</p></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
             {canReview && canPostNewReview && (
                <div className="card" style={{ padding: 24, marginBottom: 32, border: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.02)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><Star size={20} className="text-orange" fill="currentColor" /><h3 style={{ fontWeight: 700, color: 'var(--gray-100)' }}>Leave a Seller Review ({myReviewsCount}/2)</h3></div>
                   <form onSubmit={handleReview}>
                     <div style={{ marginBottom: 20 }}><label className="form-label" style={{ marginBottom: 10, display: 'block', fontSize: '.85rem' }}>Your Rating</label><StarRow value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} /></div>
                     <textarea className="form-textarea" placeholder="How was the process?..." value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} style={{ minHeight: 100, marginBottom: 20 }} required />
                     <div style={{ marginBottom: 20 }}>
                       <label className="form-label" style={{ marginBottom: 12, display: 'block', fontSize: '.85rem' }}>📸 Photo (Optional)</label>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                         <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>Select Image<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files[0]; if (file) { setReviewForm(f => ({ ...f, image: file })); setImagePreview(URL.createObjectURL(file)) } }} /></label>
                         {imagePreview && (
                            <div style={{ position: 'relative' }}>
                              <img src={imagePreview} alt="Preview" style={{ width: 50, height: 50, borderRadius: '10px', objectFit: 'cover', border: '2px solid var(--orange-500)' }} />
                              <button type="button" onClick={() => { setReviewForm(f => ({ ...f, image: null })); setImagePreview(null); }} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--red-500)', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>✕</button>
                            </div>
                         )}
                       </div>
                     </div>
                     <button type="submit" className="btn btn-primary" disabled={reviewLoading}>{reviewLoading ? <span className="spinner spinner-sm" /> : <><Send size={15} /> Post Review</>}</button>
                   </form>
                </div>
             )}

             {reviews.length === 0 ? (
               <div className="empty-state"><div className="empty-icon">⭐</div><h3>No reviews yet</h3></div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 {reviews.map(r => (
                   <div key={r.id} className="card" style={{ padding: 24 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div className="avatar" style={{ width: 38, height: 38, fontSize: '.9rem' }}>{r.user_detail?.avatar ? <img src={r.user_detail.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : r.user_detail?.username?.slice(0,2).toUpperCase()}</div>
                         <div><p style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--gray-100)' }}>{r.user_detail?.username || 'User'}</p><p style={{ color: 'var(--gray-500)', fontSize: '.75rem' }}>{formatDate(r.created_at)}</p></div>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{ display: 'flex', gap: 2 }}>{[1,2,3,4,5].map(i => <Star key={i} size={14} style={{ color: i <= r.rating ? 'var(--amber-400)' : 'var(--gray-700)', fill: i <= r.rating ? 'currentColor' : 'none' }} />)}</div>
                         {user && user.id === r.user && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { setEditingReview(r); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: 4 }}><Edit2 size={13} /></button>
                              <button onClick={() => handleDeleteReview(r.id)} style={{ background: 'none', border: 'none', color: 'var(--red-450)', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                            </div>
                         )}
                       </div>
                     </div>
                     {r.comment && <p style={{ color: 'var(--gray-300)', fontSize: '.9rem', lineHeight: 1.7, fontStyle: 'italic', marginBottom: r.image ? 12 : 0 }}>"{r.comment}"</p>}
                     {r.image && <img src={r.image} alt="Review" style={{ width: '100%', maxHeight: 250, borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(128,128,128,0.15)' }} />}
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
      <ReviewModal 
        isOpen={isEditModalOpen} 
        onClose={() => { setIsEditModalOpen(false); setEditingReview(null); }}
        targetUserId={id}
        petName={profile.username}
        editReview={editingReview}
        onSuccess={loadReviews}
      />
    </div>
  )
}
