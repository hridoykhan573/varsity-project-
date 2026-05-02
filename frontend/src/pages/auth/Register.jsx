import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { register } from '../../api/authApi'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'owner', label: '🐾 Pet Owner', desc: 'Adopt pets & book shelter services' },
  { value: 'shelter_staff', label: '🏠 Shelter Staff', desc: 'Manage shelter, services & bookings' },
  { value: 'seller', label: '🛒 Seller', desc: 'Sell pet food & accessories' },
]

const DOC_TYPES = [
  { value: 'nid', label: '🪪 NID', placeholder: '10, 13, or 17-digit NID', help: 'Provide your 10, 13, or 17-digit National ID.' },
  { value: 'tin', label: '📜 TIN', placeholder: '12-digit e-TIN', help: 'Provide your 12-digit electronic TIN.' },
  { value: 'brn', label: '👶 BRN', placeholder: '17-digit Birth Registration Number', help: 'Provide your 17-digit Birth Registration Number.' },
  { value: 'tl', label: '🏗️ Trade License', placeholder: 'TL-DNCC-XXX-XX-XXXX-XXXXXX', help: 'Format: TL-DNCC-041-02-2026-009874' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    password2: '', 
    role: 'owner', 
    phone: '', 
    location: '', 
    identity_document: '',
    identity_type: 'nid' 
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validateIdentity = (doc, type) => {
    if (!doc) return { valid: false, message: 'Identity document is required for sellers.' }

    switch (type) {
      case 'tl':
        const tlRegex = /^TL-(DNCC|DSCC|CTG|KCC|RCC|SCC)-\d{3}-\d{2}-\d{4}-\d{6}$/
        if (tlRegex.test(doc)) return { valid: true, type: 'Trade License' }
        return { valid: false, message: 'Invalid Trade License. (e.g. TL-DNCC-041-02-2026-009874)' }
      
      case 'tin':
        if (doc.length === 12 && /^\d+$/.test(doc)) return { valid: true, type: 'TIN' }
        return { valid: false, message: 'Invalid TIN. Must be exactly 12 digits.' }
      
      case 'brn':
        if (doc.length === 17 && /^\d+$/.test(doc)) return { valid: true, type: 'BRN' }
        return { valid: false, message: 'Invalid BRN. Must be exactly 17 digits.' }
      
      case 'nid':
        if ([10, 13, 17].includes(doc.length) && /^\d+$/.test(doc)) return { valid: true, type: 'NID' }
        return { valid: false, message: 'Invalid NID. Must be 10, 13, or 17 digits.' }

      default:
        return { valid: false, message: 'Unsupported document type selected.' }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) { setErr('Passwords do not match.'); return }
    
    if (['seller', 'shelter_staff'].includes(form.role)) {
      const v = validateIdentity(form.identity_document, form.identity_type)
      if (!v.valid) { setErr(v.message); return }
    }

    if (form.phone && form.phone.length !== 10) {
      setErr('Phone number must be exactly 10 digits (excluding +880).');
      return;
    }

    setLoading(true); setErr('')
    try {
      // Prepend +880 for the backend if phone exists
      const finalForm = { ...form, phone: form.phone ? `+880${form.phone}` : '' }
      await register(finalForm)
      toast.success('Account created! Please sign in. 🎉')
      navigate('/login')
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // Filter doc types based on role. Shelter staff only show TIN and Trade License.
  const filteredDocTypes = form.role === 'shelter_staff' 
    ? DOC_TYPES.filter(d => ['tin', 'tl'].includes(d.value))
    : DOC_TYPES;

  const selectedDocType = DOC_TYPES.find(d => d.value === form.identity_type) || filteredDocTypes[0]

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: val });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,.1) 0%, transparent 70%)' }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900 }}>
              🐾 Paw<span className="brand-hub">Hub</span>
            </span>
          </Link>
          <p style={{ color: 'var(--gray-400)', marginTop: 8 }}>Create your free account</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

          {/* Role selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
            {ROLES.map(({ value, label, desc }) => (
              <div key={value}
                onClick={() => {
                  const update = { role: value };
                  // Reset doc type if the new role doesn't support the current selection
                  if (value === 'shelter_staff' && !['tin', 'tl'].includes(form.identity_type)) {
                    update.identity_type = 'tin';
                  }
                  setForm({ ...form, ...update });
                }}
                style={{
                  padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)',
                  border: `2px solid ${form.role === value ? 'var(--orange-500)' : 'rgba(255,255,255,.08)'}`,
                  background: form.role === value ? 'rgba(249,115,22,.08)' : 'rgba(255,255,255,.02)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>{desc}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" name="username" placeholder="john_doe" value={form.username} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: 12, color: 'var(--gray-400)', fontWeight: 600, fontSize: '.9rem' }}>+880</span>
                    <input 
                      className="form-input" 
                      name="phone" 
                      placeholder="1712345678" 
                      value={form.phone} 
                      onChange={handlePhoneChange} 
                      style={{ paddingLeft: 52 }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" name="location" placeholder="City, Country" value={form.location} onChange={handleChange} />
              </div>

              {['seller', 'shelter_staff'].includes(form.role) && (
                <div style={{ animation: 'fadeIn .3s ease', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--orange-400)', fontWeight: 700 }}>Select Identity Document Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${filteredDocTypes.length === 2 ? 2 : 2}, 1fr)`, gap: 8 }}>
                      {filteredDocTypes.map(({ value, label }) => (
                        <div key={value}
                          onClick={() => setForm({ ...form, identity_type: value })}
                          style={{
                            padding: '10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)',
                            border: `1.5px solid ${form.identity_type === value ? 'var(--orange-500)' : 'rgba(255,255,255,.05)'}`,
                            background: form.identity_type === value ? 'rgba(249,115,22,.05)' : 'rgba(255,255,255,.01)',
                            textAlign: 'center', fontSize: '.8rem', fontWeight: 600
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--orange-400)', fontWeight: 700 }}>{selectedDocType.label} Number</label>
                    <input 
                      className="form-input" 
                      name="identity_document" 
                      placeholder={selectedDocType.placeholder} 
                      value={form.identity_document} 
                      onChange={handleChange} 
                      required 
                      style={{ borderColor: 'var(--orange-500)', background: 'rgba(249,115,22,.02)' }}
                    />
                    <p style={{ fontSize: '.7rem', color: 'var(--gray-500)', marginTop: 4 }}>
                      {selectedDocType.help}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showPass ? 'text' : 'password'} name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input className="form-input" type="password" name="password2" placeholder="••••••••" value={form.password2} onChange={handleChange} required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? <span className="spinner spinner-sm" /> : <><UserPlus size={17} /> Create Account</>}
              </button>
            </div>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '.9rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--orange-400)', fontWeight: 600 }}>Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  )
}
