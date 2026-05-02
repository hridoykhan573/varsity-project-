import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Phone, Mail, Globe, CheckCircle, Calendar, Send, Trash2, Edit2 } from 'lucide-react'
import { getShelter, getShelterServices, getShelterReviews } from '../../api/shelterApi'
import { createBooking } from '../../api/bookingApi'
import { createReview, deleteReview, updateReview } from '../../api/reviewApi'
import ReviewModal from '../../components/ui/ReviewModal'
import { capitalize, formatDate, formatPrice, errorMessage } from '../../utils/helpers'
import AOS from 'aos'
import 'aos/dist/aos.css'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { getMyPets } from '../../api/petApi'

function ServiceCard({ service, onBook, delay = 0 }) {
  const TYPE_EMOJI = { boarding:'🛏️', grooming:'✂️', vaccination:'💉', training:'🎓', daycare:'☀️', veterinary:'🏥', bath:'🛁', other:'🐾' }
  return (
    <div style={{ background: 'var(--gray-800)', border: '1px solid rgba(128,128,128,.15)', borderRadius: 'var(--radius-lg)', padding: 20 }} data-aos="fade-up" data-aos-delay={delay}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: '1.4rem', marginRight: 8 }}>{TYPE_EMOJI[service.service_type] || '🐾'}</span>
          <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--gray-100)' }}>{service.name}</span>
        </div>
        <span className={`badge ${service.is_available ? 'badge-green' : 'badge-red'}`}>
          {service.is_available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      {service.description && <p style={{ color: 'var(--gray-400)', fontSize: '.83rem', marginBottom: 12, lineHeight: 1.6 }}>{service.description}</p>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {service.discount_percentage > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ textDecoration: 'line-through', color: 'var(--gray-500)', fontSize: '.8rem' }}>{formatPrice(service.price)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--orange-400)' }}>{formatPrice(service.discounted_price)}</span>
                <span className="badge badge-orange" style={{ padding: '2px 6px', fontSize: '.65rem' }}>SAVE {service.discount_percentage}%</span>
              </div>
            </div>
          ) : (
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--orange-400)' }}>{formatPrice(service.price)}</span>
          )}
          <span style={{ color: 'var(--gray-500)', fontSize: '.78rem' }}> {service.price_unit}</span>
        </div>
        {service.is_available && (
          <button className="btn btn-primary btn-sm" onClick={() => onBook(service)}>
            <Calendar size={13} /> Book
          </button>
        )}
      </div>
    </div>
  )
}

function StarRow({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onChange(i)} style={{ fontSize: '1.5rem', cursor: 'pointer', color: i <= value ? 'var(--amber-400)' : 'var(--gray-600)', transition: 'var(--transition)' }}>★</span>
      ))}
    </div>
  )
}

export default function ShelterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [shelter, setShelter] = useState(null)
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [myPets, setMyPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('services')
  const [bookService, setBookService] = useState(null)
  const [booking, setBooking] = useState({ pet: '', start_date: '', end_date: '', special_instructions: '' })
  const [bookLoading, setBookLoading] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', image: null })
  const [imagePreview, setImagePreview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, svRes, rvRes] = await Promise.allSettled([
          getShelter(id), getShelterServices(id), getShelterReviews(id)
        ])
        if (sRes.status === 'fulfilled') setShelter(sRes.value.data)
        if (svRes.status === 'fulfilled') setServices(svRes.value.data?.results || svRes.value.data || [])
        if (rvRes.status === 'fulfilled') setReviews(rvRes.value.data?.results || rvRes.value.data || [])
      } finally { setLoading(false) }
    }
    load()
    if (isAuthenticated) getMyPets().then(r => setMyPets(r.data?.results || r.data || [])).catch(() => {})
  }, [id, isAuthenticated])

  const handleBook = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/login'); return }
    setBookLoading(true)
    try {
      await createBooking({ shelter: id, service: bookService.id, ...booking })
      toast.success('Booking request sent! 🎉')
      setBookService(null)
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setBookLoading(false) }
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/login'); return }
    setReviewLoading(true)
    try {
      const formData = new FormData()
      formData.append('shelter', id)
      formData.append('rating', reviewForm.rating)
      formData.append('comment', reviewForm.comment)
      if (reviewForm.image) {
        formData.append('image', reviewForm.image)
      }

      await createReview(formData)
      toast.success('Review submitted! ⭐')
      setReviewForm({ rating: 5, comment: '', image: null })
      setImagePreview(null)
      // Refresh reviews
      const { data } = await getShelterReviews(id)
      setReviews(data?.results || data || [])
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setReviewLoading(false) }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    try {
      await deleteReview(reviewId)
      toast.success('Review deleted')
      const { data } = await getShelterReviews(id)
      setReviews(data?.results || data || [])
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const myReviewsCount = reviews.filter(r => user && r.user === user.id).length
  const canPostNewReview = isAuthenticated && myReviewsCount < 2

  if (loading) return <div style={{ padding: '120px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
  if (!shelter) return <div className="container page-wrapper"><div className="empty-state"><h3>Shelter not found</h3><Link to="/shelters" className="btn btn-primary" style={{ marginTop: 16 }}>Back</Link></div></div>

  return (
    <div className="container page-wrapper">
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="card" style={{ padding: 32, marginBottom: 24 }} data-aos="fade-down">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {shelter.logo || shelter.owner_avatar
            ? <img src={shelter.logo || shelter.owner_avatar} alt={shelter.name} style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', objectFit: 'cover' }} />
            : <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--orange-600), var(--orange-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>🏠</div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--gray-100)' }}>{shelter.name}</h1>
              {shelter.is_verified && <span className="badge badge-green"><CheckCircle size={11} /> Verified</span>}
            </div>
            {shelter.description && <p style={{ color: 'var(--gray-400)', lineHeight: 1.7, marginBottom: 14 }}>{shelter.description}</p>}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', color: 'var(--gray-400)', fontSize: '.85rem' }}>
              {shelter.location && <span><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />{shelter.location}</span>}
              {shelter.phone && <span><Phone size={14} style={{ display: 'inline', marginRight: 4 }} />{shelter.phone}</span>}
              {shelter.contact_email && <span><Mail size={14} style={{ display: 'inline', marginRight: 4 }} />{shelter.contact_email}</span>}
              {shelter.website && <a href={shelter.website} target="_blank" rel="noreferrer" style={{ color: 'var(--orange-400)' }}><Globe size={14} style={{ display: 'inline', marginRight: 4 }} />Website</a>}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Star size={18} style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }} />
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gray-100)' }}>{parseFloat(shelter.rating_avg || 0).toFixed(1)}</span>
            </div>
            <p style={{ color: 'var(--gray-500)', fontSize: '.8rem' }}>{shelter.total_reviews} reviews</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" data-aos="fade-up">
        {['services', 'reviews'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'services' ? `🛠️ Services (${services.length})` : `⭐ Reviews (${reviews.length})`}
          </button>
        ))}
      </div>

      {/* Services tab */}
      {tab === 'services' && (
        <div data-aos="fade-up">
          {services.length === 0
            ? <div className="empty-state"><div className="empty-icon">🛠️</div><h3>No services listed yet</h3></div>
            : <div className="grid-2">
                {services.map((s, idx) => <ServiceCard key={s.id} service={s} onBook={(service) => !isAuthenticated ? navigate('/login') : setBookService(service)} delay={(idx % 12) * 50} />)}
              </div>
          }
        </div>
      )}

      {tab === 'reviews' && (
        <div style={{ maxWidth: 700 }} data-aos="fade-up">
          {canPostNewReview ? (
             <div className="card" style={{ padding: 24, marginBottom: 24, background: 'rgba(249,115,22,0.02)', border: '1px solid rgba(249,115,22,0.1)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>Leave a Review ({myReviewsCount}/2)</h3>
              <form onSubmit={handleReview}>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Your Rating</label>
                  <StarRow value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} />
                </div>
                <textarea className="form-textarea" placeholder="Share your experience…" value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} style={{ marginBottom: 14 }} />
                
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ marginBottom: 4, display: 'block', fontSize: '.8rem' }}>Add a Photo (Optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      📸 Select File
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files[0]; if (file) { setReviewForm(f => ({ ...f, image: file })); setImagePreview(URL.createObjectURL(file)) } }} />
                    </label>
                    {imagePreview && (
                      <div style={{ position: 'relative' }}>
                        <img src={imagePreview} alt="Preview" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--orange-500)' }} />
                        <button type="button" onClick={() => { setReviewForm(f => ({ ...f, image: null })); setImagePreview(null); }} style={{ position: 'absolute', top: -5, right: -5, background: 'var(--red-500)', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={reviewLoading}>
                  {reviewLoading ? <span className="spinner spinner-sm" /> : <><Send size={15} /> Submit Review</>}
                </button>
              </form>
            </div>
          ) : isAuthenticated && <p style={{ marginBottom: 24, color: 'var(--gray-500)' }}>You have reached the maximum of 2 reviews for this shelter.</p>}

          {reviews.length === 0
            ? <div className="empty-state"><div className="empty-icon">⭐</div><h3>No reviews yet</h3><p>Be the first to review this shelter!</p></div>
            : reviews.map((r, idx) => (
                <div key={r.id} className="card" style={{ padding: 20, marginBottom: 14 }} data-aos="fade-up" data-aos-delay={(idx % 12) * 50}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: '.8rem' }}>
                        {r.user_detail?.username?.slice(0,2).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '.9rem' }}>{r.user_detail?.username || 'User'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ color: 'var(--gray-500)', fontSize: '.75rem' }}>{formatDate(r.created_at)}</p>
                          {r.user_detail?.location && (
                            <span style={{ color: 'var(--gray-500)', fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                              · <MapPin size={10} /> {r.user_detail.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= r.rating ? 'var(--amber-400)' : 'var(--gray-600)' }}>★</span>)}
                      </div>
                      {user && user.id === r.user && (
                        <>
                          <button 
                            onClick={() => { setEditingReview(r); setIsEditModalOpen(true); }}
                            style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                            title="Edit review"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteReview(r.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--red-450)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                            title="Delete review"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {r.comment && <p style={{ color: 'var(--gray-300)', fontSize: '.88rem', lineHeight: 1.7, marginBottom: r.image ? 12 : 0 }}>{r.comment}</p>}
                  {r.image && (
                    <img 
                      src={r.image} 
                      alt="Review" 
                      style={{ width: '100%', maxHeight: 300, borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '1px solid rgba(128,128,128,0.15)' }} 
                    />
                  )}
                </div>
              ))
          }
        </div>
      )}

      {bookService && (
        <div className="modal-overlay" onClick={() => setBookService(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Book: {bookService.name}</h2>
              <button className="modal-close" onClick={() => setBookService(null)}>✕</button>
            </div>
            <form onSubmit={handleBook}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Select Pet</label>
                  <select className="form-select" value={booking.pet} onChange={e => setBooking(b => ({ ...b, pet: e.target.value }))} required>
                    <option value="">-- Choose your pet --</option>
                    {myPets.map(p => <option key={p.id} value={p.id}>{p.name} ({capitalize(p.pet_type)})</option>)}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" value={booking.start_date} min={new Date().toISOString().split('T')[0]} onChange={e => setBooking(b => ({ ...b, start_date: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" value={booking.end_date} min={booking.start_date} onChange={e => setBooking(b => ({ ...b, end_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Special Instructions</label>
                  <textarea className="form-textarea" placeholder="Any special care notes…" value={booking.special_instructions} onChange={e => setBooking(b => ({ ...b, special_instructions: e.target.value }))} style={{ minHeight: 80 }} />
                </div>
                <div style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '.85rem', color: 'var(--gray-300)' }}>
                  <strong style={{ color: 'var(--orange-400)' }}>Total Price: </strong>
                  {bookService.discount_percentage > 0 && (
                    <span style={{ textDecoration: 'line-through', color: 'var(--gray-500)', marginRight: 8 }}>{formatPrice(bookService.price)}</span>
                  )}
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatPrice(bookService.discounted_price)}</span> {bookService.price_unit}
                  {bookService.discount_percentage > 0 && (
                    <span style={{ color: 'var(--green-400)', marginLeft: 8, fontWeight: 600 }}>(Discount Applied)</span>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" disabled={bookLoading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                  {bookLoading ? <span className="spinner spinner-sm" /> : <><Calendar size={16} /> Confirm Booking</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
