import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, PlusCircle, Save } from 'lucide-react'
import { getPet, updatePet } from '../../api/petApi'
import { PET_TYPES, PET_EMOJI } from '../../utils/constants'
import { capitalize, errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const INITIAL = {
  name: '', ageInput: '', ageUnit: 'months', pet_type: 'dog', breed: '', gender: 'unknown',
  color: '', description: '', listing_type: 'adoption', price: '', currency: 'USD',
  location: '', is_vaccinated: false, is_neutered: false, is_microchipped: false,
}

export default function EditPetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const { data } = await getPet(id)
        setForm({
          name: data.name || '',
          ageInput: data.age !== null ? data.age : '',
          ageUnit: 'months',
          pet_type: data.pet_type || 'dog',
          breed: data.breed || '',
          gender: data.gender || 'unknown',
          color: data.color || '',
          description: data.description || '',
          listing_type: data.listing_type || 'adoption',
          price: data.price || '',
          currency: data.currency || 'USD',
          location: data.location || '',
          is_vaccinated: data.is_vaccinated || false,
          is_neutered: data.is_neutered || false,
          is_microchipped: data.is_microchipped || false,
        })
        if (data.photo) setPreview(data.photo)
      } catch (e) {
        toast.error('Failed to load pet details.')
        navigate('/pets')
      }
    }
    fetchPet()
  }, [id, navigate])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const fd = new FormData()
      
      let finalAgeMonths = 0
      const parsedAge = parseInt(form.ageInput, 10) || 0
      if (form.ageUnit === 'years') finalAgeMonths = parsedAge * 12
      else if (form.ageUnit === 'days') finalAgeMonths = Math.max(0, Math.round(parsedAge / 30))
      else finalAgeMonths = parsedAge

      const dataToSubmit = { ...form, age: finalAgeMonths }
      delete dataToSubmit.ageInput
      delete dataToSubmit.ageUnit

      Object.entries(dataToSubmit).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
        if (k === 'price' && dataToSubmit.listing_type === 'adoption') {
          fd.append(k, '') // empty price if adoption
        }
      })
      if (photo) fd.append('photo', photo)
      await updatePet(id, fd)
      toast.success('Pet updated successfully! 🎉')
      navigate(`/pets/${id}`)
    } catch (e) {
      setErr(errorMessage(e))
    } finally { setLoading(false) }
  }

  return (
    <div className="container page-wrapper">
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 }}>Edit Pet Details</h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 6 }}>Update the information for your pet listing.</p>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: 32, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-200)' }}>📸 Pet Photo</h3>
            <label htmlFor="photo-upload" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(255,255,255,.15)', borderRadius: 'var(--radius-lg)',
              padding: 32, cursor: 'pointer', transition: 'var(--transition)',
              background: preview ? 'transparent' : 'rgba(255,255,255,.02)',
            }}>
              {preview
                ? <img src={preview} alt="preview" style={{ maxHeight: 220, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                : <>
                    <Upload size={32} style={{ color: 'var(--gray-500)', marginBottom: 12 }} />
                    <span style={{ color: 'var(--gray-400)', fontSize: '.9rem' }}>Click to upload a photo</span>
                    <span style={{ color: 'var(--gray-600)', fontSize: '.78rem', marginTop: 4 }}>JPG, PNG up to 5MB</span>
                  </>
              }
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-200)' }}>🐾 Basic Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Pet Name *</label>
                  <input className="form-input" name="name" placeholder="e.g. Buddy" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" name="ageInput" type="number" min="0" placeholder="e.g. 2" value={form.ageInput} onChange={handleChange} required style={{ flex: 1 }} />
                    <select className="form-select" name="ageUnit" value={form.ageUnit} onChange={handleChange} style={{ width: '110px', flexShrink: 0 }}>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Pet Type *</label>
                  <select className="form-select" name="pet_type" value={form.pet_type} onChange={handleChange}>
                    {PET_TYPES.map(t => <option key={t} value={t}>{PET_EMOJI[t]} {capitalize(t)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Breed</label>
                  <input className="form-input" name="breed" placeholder="e.g. Golden Retriever" value={form.breed} onChange={handleChange} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input className="form-input" name="color" placeholder="e.g. Golden Brown" value={form.color} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" name="location" placeholder="City, Country" value={form.location} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" name="description" placeholder="Describe personality, habits, special needs…" value={form.description} onChange={handleChange} style={{ minHeight: 120 }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-200)' }}>💰 Listing Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Listing Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['adoption','❤️ For Adoption','Free!'],['sale','🏷️ For Sale','Set a price']].map(([v, label, sub]) => (
                    <div key={v} onClick={() => setForm(f => ({...f, listing_type: v}))} style={{
                      padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)',
                      border: `2px solid ${form.listing_type === v ? 'var(--orange-500)' : 'rgba(255,255,255,.08)'}`,
                      background: form.listing_type === v ? 'rgba(249,115,22,.08)' : 'rgba(255,255,255,.02)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {form.listing_type === 'sale' && (
                <div className="form-group">
                  <label className="form-label">Price</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-select" name="currency" value={form.currency} onChange={handleChange} style={{ width: '130px', flexShrink: 0 }}>
                      <option value="USD">Dollar ($)</option>
                      <option value="BDT">BDT (৳)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                    <input className="form-input" name="price" type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={handleChange} style={{ flex: 1 }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 28 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-200)' }}>🏥 Health Status</h3>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[['is_vaccinated','Vaccinated'],['is_neutered','Neutered / Spayed'],['is_microchipped','Microchipped']].map(([name, label]) => (
                <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" name={name} checked={form[name]} onChange={handleChange} style={{ width: 16, height: 16, accentColor: 'var(--orange-500)' }} />
                  <span style={{ fontSize: '.9rem', color: 'var(--gray-300)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <span className="spinner spinner-sm" /> : <><Save size={18} /> Save Changes</>}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost btn-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
