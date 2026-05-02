import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Save, Camera, Trash2 } from 'lucide-react'
import { getProfile, updateProfile, deleteProfile } from '../../api/authApi'
import useAuthStore from '../../store/authStore'
import { capitalize, errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import ChangePasswordCard from '../../components/profile/ChangePasswordCard'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { setUser, logout } = useAuthStore()
  const [form, setForm] = useState({ username: '', phone: '', location: '', bio: '' })
  const [avatar, setAvatar] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmState, setConfirmState] = useState({ isOpen: false })

  useEffect(() => {
    getProfile().then(({ data }) => {
      setForm({ username: data.username || '', phone: data.phone || '', location: data.location || '', bio: data.bio || '' })
      if (data.avatar) setPreview(data.avatar)
    }).finally(() => setLoading(false))
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatar(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setErr('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (avatar) fd.append('avatar', avatar)
      const { data } = await updateProfile(fd)
      setUser(data)
      toast.success('Profile updated! ✓')
    } catch (e) {
      setErr(errorMessage(e))
    } finally { setSaving(false) }
  }

  const requestDeleteAccount = () => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Account',
      message: 'Are you absolutely sure you want to delete your account? All your pets, shelters, and services will be permanently removed.',
      confirmText: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        setLoading(true)
        try {
          await deleteProfile()
          logout()
          toast.success('Your account has been permanently deleted.')
          navigate('/')
        } catch (e) {
          toast.error(errorMessage(e))
          setLoading(false)
        }
      }
    })
  }

  if (loading) return <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>

  return (
    <div className="container page-wrapper">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            marginBottom: 10,
            background: 'linear-gradient(135deg, #fff 0%, var(--orange-400) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            My Profile
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '1.1rem' }}>Manage your personal account and professional presence</p>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom: 24 }}>{err}</div>}

        {/* Avatar Card */}
        <div className="card" style={{ 
          padding: 32, 
          marginBottom: 24, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 32,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {preview
              ? <img src={preview} alt="avatar" style={{ width: 100, height: 100, borderRadius: '30px', objectFit: 'cover', border: '3px solid var(--orange-500)', boxShadow: 'var(--shadow-glow)' }} />
              : <div className="avatar" style={{ width: 100, height: 100, fontSize: '2rem', borderRadius: '30px' }}>{form.username?.slice(0, 2).toUpperCase()}</div>
            }
            <label htmlFor="avatar-input" style={{
              position: 'absolute', bottom: -6, right: -6, background: 'var(--orange-500)', borderRadius: '12px',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: '3px solid var(--gray-850)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease'
            }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Camera size={16} color="#fff" />
              <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>{form.username || 'User'}</h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', fontWeight: 500 }}>Upload a professional photo to build trust with pet owners.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" name="username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={{ fontSize: '1rem', padding: '12px 16px' }} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" name="phone" placeholder="+8801..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ fontSize: '1rem', padding: '12px 16px' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Location</label>
                  <input className="form-input" name="location" placeholder="City, Area" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={{ fontSize: '1rem', padding: '12px 16px' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Professional Bio</label>
                <textarea className="form-textarea" placeholder="Describe your experience and love for animals..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ minHeight: 120, fontSize: '1rem', padding: '12px 16px' }} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', padding: '12px 28px', fontSize: '1rem', fontWeight: 700 }}>
                {saving ? <span className="spinner spinner-sm" /> : <><Save size={18} /> Update Profile</>}
              </button>
            </div>
          </div>
        </form>

        <ChangePasswordCard />

        <div className="card" style={{ padding: 32, marginTop: 32, border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)' }}>
          <h3 style={{ fontWeight: 800, color: '#f87171', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem' }}>
            <Trash2 size={20} /> Permanent Deletion
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '.926rem', marginBottom: 20, lineHeight: 1.6 }}>
            Warning: deleting your account is irreversible. All records, blogs, and patient consultations will be permanently erased from our servers.
          </p>
          <button onClick={requestDeleteAccount} className="btn btn-danger" style={{ fontWeight: 700 }}>
            Delete My Account
          </button>
        </div>

      </div>
      <ConfirmModal {...confirmState} onCancel={() => setConfirmState({ isOpen: false })} />
    </div>
  )
}
