import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Tag, MapPin, Phone, Shield, Stethoscope, Send, Star, Bell, XCircle, Trash2 } from 'lucide-react'
import { getPet, getPetHealth, deletePet, updatePet } from '../../api/petApi'
import { sendAdoption } from '../../api/adoptionApi'
import { PET_EMOJI, STATUS_BADGE, LISTING_BADGE } from '../../utils/constants'
import { ageLabel, formatPrice, formatDate, capitalize, errorMessage } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function PetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [pet, setPet] = useState(null)
  const [health, setHealth] = useState([])
  const [loading, setLoading] = useState(true)
  const [adoptMsg, setAdoptMsg] = useState('')
  const [adoptLoading, setAdoptLoading] = useState(false)
  const [showAdoptForm, setShowAdoptForm] = useState(false)
  const [uploadPhotoLoading, setUploadPhotoLoading] = useState(false)
  const [confirmState, setConfirmState] = useState({ isOpen: false })

  useEffect(() => {
    const load = async () => {
      try {
        const [petRes, healthRes] = await Promise.allSettled([getPet(id), getPetHealth(id)])
        if (petRes.status === 'fulfilled') setPet(petRes.value.data)
        if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data?.results || healthRes.value.data || [])
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  const handleAdopt = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/login'); return }
    setAdoptLoading(true)
    try {
      await sendAdoption({ pet: pet.id, message: adoptMsg })
      toast.success('Adoption request sent! 🐾')
      setShowAdoptForm(false)
    } catch (e) { toast.error(errorMessage(e)) }
    finally { setAdoptLoading(false) }
  }

  const requestDelete = () => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Pet Listing',
      message: 'Are you absolutely sure you want to delete this pet listing? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deletePet(pet.id)
          toast.success('Pet listing permanently deleted.')
          navigate('/pets')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadPhotoLoading(true)
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const { data } = await updatePet(pet.id, formData)
      setPet(data)
      toast.success('Pet photo updated! 📸')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploadPhotoLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '120px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
  if (!pet) return <div className="container page-wrapper"><div className="empty-state"><div className="empty-icon">🐾</div><h3>Pet not found</h3><Link to="/pets" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Pets</Link></div></div>

  const isOwner = user?.id === pet.owner?.id
  const emoji = PET_EMOJI[pet.pet_type] || '🐾'

  return (
    <div className="container page-wrapper">
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
        {/* Left: details */}
        <div>
          {/* Photo */}
          <div style={{ position: 'relative' }}>
            {pet.photo
              ? <img src={pet.photo} alt={pet.name} style={{ width: '100%', height: 380, objectFit: 'cover', borderRadius: 'var(--radius-xl)' }} />
              : <div style={{ width: '100%', height: 380, background: 'var(--gray-800)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8rem' }}>{emoji}</div>
            }

            {isOwner && (
              <label style={{ 
                position: 'absolute', bottom: 16, right: 16, 
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-full)',
                fontSize: '.85rem', fontWeight: 600, cursor: uploadPhotoLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'var(--transition)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
              onMouseOver={e => !uploadPhotoLoading && (e.currentTarget.style.background = 'var(--orange-500)')}
              onMouseOut={e => !uploadPhotoLoading && (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
              >
                {uploadPhotoLoading ? <span className="spinner spinner-sm" /> : <>📸 Update Photo</>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploadPhotoLoading} />
              </label>
            )}
          </div>

          {/* Description */}
          {pet.description && (
            <div className="card" style={{ padding: 24, marginTop: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--gray-100)' }}>About {pet.name}</h3>
              <p style={{ color: 'var(--gray-300)', lineHeight: 1.8 }}>{pet.description}</p>
            </div>
          )}

          {/* Health records */}
          {health.length > 0 && (
            <div className="card" style={{ padding: 24, marginTop: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope size={18} style={{ color: 'var(--orange-400)' }} /> Health Records
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {health.map((h) => (
                  <div key={h.id} style={{ background: 'rgba(128,128,128,.1)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--gray-100)' }}>{h.title}</p>
                      <p style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{capitalize(h.record_type)} · {formatDate(h.date)}</p>
                    </div>
                    {h.next_due_date && <span className="badge badge-yellow">Due: {formatDate(h.next_due_date)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: info card */}
        <div style={{ position: 'sticky', top: 90 }}>
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gray-100)' }}>{pet.name}</h1>
              <span className={`badge ${LISTING_BADGE[pet.listing_type]}`}>{capitalize(pet.listing_type)}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <span className={`badge ${STATUS_BADGE[pet.status]}`}>{capitalize(pet.status)}</span>
              {pet.is_vaccinated && <span className="badge badge-green">✓ Vaccinated</span>}
              {pet.is_neutered && <span className="badge badge-blue">✓ Neutered</span>}
              {pet.is_microchipped && <span className="badge badge-purple">✓ Microchipped</span>}
            </div>

            {/* Attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                ['Type', `${emoji} ${capitalize(pet.pet_type)}`],
                ['Breed', pet.breed || '—'],
                ['Age', ageLabel(pet.age)],
                ['Gender', capitalize(pet.gender)],
                ['Color', pet.color || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(128,128,128,.1)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <p style={{ fontSize: '.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
                  <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--gray-100)' }}>{value}</p>
                </div>
              ))}
            </div>

            {pet.location && <p style={{ color: 'var(--gray-400)', fontSize: '.85rem', marginBottom: 16 }}><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />{pet.location}</p>}

            {pet.listing_type === 'sale' && pet.price && (
              <div style={{ background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
                <span style={{ fontSize: '.82rem', color: 'var(--orange-300)', display: 'block', marginBottom: 2 }}>Sale Price</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--orange-400)' }}>{formatPrice(pet.price, pet.currency)}</span>
              </div>
            )}

            {/* CTA */}
            {!isOwner && pet.status === 'available' && (
              <>
                {showAdoptForm ? (
                  <form onSubmit={handleAdopt}>
                    <textarea
                      className="form-textarea"
                      placeholder={pet.listing_type === 'sale' ? 'Tell the owner why you want to buy…' : 'Tell them why you\'d be a great owner…'}
                      value={adoptMsg}
                      onChange={e => setAdoptMsg(e.target.value)}
                      style={{ marginBottom: 12 }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="btn btn-primary" disabled={adoptLoading} style={{ flex: 1, justifyContent: 'center' }}>
                        {adoptLoading ? <span className="spinner spinner-sm" /> : <><Send size={15} /> Send Request</>}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowAdoptForm(false)}><XCircle size={15} /></button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                    onClick={() => isAuthenticated ? setShowAdoptForm(true) : navigate('/login')}
                  >
                    <Heart size={17} /> {pet.listing_type === 'sale' ? 'Request to Buy' : 'Request Adoption'}
                  </button>
                )}
              </>
            )}

            {isOwner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to={`/pets/${pet.id}/edit`} className="btn btn-primary" style={{ justifyContent: 'center', background: 'var(--orange-500)', color: 'white' }}>
                  Edit Pet
                </Link>
                <Link to={`/dashboard`} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                  <Shield size={15} /> Manage in Dashboard
                </Link>
                <button onClick={requestDelete} className="btn btn-danger" style={{ justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-400)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <Trash2 size={15} /> Delete Listing
                </button>
                
                <Link to="/vaccination-portal" className="btn btn-ghost" style={{ justifyContent: 'center', marginTop: 10, border: '1px dashed rgba(249,115,22,0.3)', color: 'var(--orange-400)' }}>
                  <Bell size={15} /> Sync Vaccination Roadmap
                </Link>
              </div>
            )}
          </div>

          {/* Owner info */}
          {pet.owner && (
            <Link 
              to={`/users/${pet.owner.id}`} 
              className="card" 
              style={{ 
                display: 'block', 
                padding: 24, 
                marginTop: 20, 
                transition: 'var(--transition)',
                textDecoration: 'none'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--orange-400)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(128,128,128,.15)'}
            >
              <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginBottom: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Seller Information</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>
                  {pet.owner.avatar ? <img src={pet.owner.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : pet.owner.username?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-100)', marginBottom: 2 }}>{pet.owner.username}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={13} style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }} />
                      <span style={{ fontWeight: 800, fontSize: '.9rem', color: 'var(--gray-200)' }}>{pet.owner.rating_avg || '0.0'}</span>
                    </div>
                    <span style={{ color: 'var(--gray-500)', fontSize: '.75rem' }}>·</span>
                    <span style={{ color: 'var(--gray-400)', fontSize: '.8rem', textDecoration: 'underline' }}>{pet.owner.total_reviews || 0} reviews</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(128,128,128,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '.82rem' }}>
                 <Shield size={14} className="text-orange" />
                 <span>Verified Pet Seller · Click to see profile</span>
              </div>
            </Link>
          )}
        </div>
      </div>
      <ConfirmModal {...confirmState} onCancel={() => setConfirmState({ isOpen: false })} />
    </div>
  )
}
