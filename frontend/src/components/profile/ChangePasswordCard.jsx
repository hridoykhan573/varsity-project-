import { useState } from 'react'
import { changePassword } from '../../api/authApi'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { errorMessage } from '../../utils/helpers'
import { Eye, EyeOff, Lock, CheckCircle2, ShieldCheck } from 'lucide-react'

const ReqItem = ({ met, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: met ? 'var(--green-400)' : 'var(--gray-500)', transition: 'all 0.2s ease' }}>
    <CheckCircle2 size={12} color={met ? 'var(--green-400)' : 'transparent'} style={{ border: met ? 'none' : '1px solid var(--gray-500)', borderRadius: '50%' }} />
    <span>{text}</span>
  </div>
)

export default function ChangePasswordCard() {
  const { logout } = useAuthStore()
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  
  // Real-time validation checks
  const pass = form.new_password
  const reqs = {
    length: pass.length >= 8,
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[@$!%*?&]/.test(pass),
  }
  const match = pass && pass === form.confirm_password

  const toggleShow = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check local requirements first
    if (!reqs.length || !reqs.upper || !reqs.lower || !reqs.number || !reqs.special) {
       toast.error("New password does not meet all security requirements.")
       return
    }
    if (!match) {
       toast.error("Passwords do not match.")
       return
    }

    setLoading(true)
    try {
      await changePassword(form)
      toast.success('Password changed successfully! Please log in again.', { duration: 5000, icon: '🔐' })
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => {
        logout()
      }, 1500)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 28, marginTop: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 style={{ fontWeight: 700, color: 'var(--gray-100)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={18} color="var(--orange-400)" /> Security Settings
      </h3>
      <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', marginBottom: 20 }}>
        Ensure your account is using a long, random password to stay secure. You will be asked to log in again after changing your password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">CURRENT PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={show.current ? "text" : "password"} 
              className="form-input" 
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
              style={{ paddingRight: 40 }}
            />
            <button 
              type="button"
              onClick={() => toggleShow('current')}
              style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
              {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">NEW PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={show.new ? "text" : "password"} 
              className="form-input" 
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
              style={{ paddingRight: 40 }}
            />
            <button 
              type="button"
              onClick={() => toggleShow('new')}
              style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
              {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        {form.new_password && (
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: -8 }}>
                <ReqItem met={reqs.length} text="At least 8 characters" />
                <ReqItem met={reqs.upper} text="One uppercase letter" />
                <ReqItem met={reqs.lower} text="One lowercase letter" />
                <ReqItem met={reqs.number} text="One number" />
                <ReqItem met={reqs.special} text="One special char (@$!%*?&)" />
            </div>
        )}

        <div className="form-group">
          <label className="form-label">CONFIRM NEW PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={show.confirm ? "text" : "password"} 
              className="form-input" 
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              required
              style={{ paddingRight: 40 }}
            />
            <button 
              type="button"
              onClick={() => toggleShow('confirm')}
              style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
              {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        {form.confirm_password && (
            <ReqItem met={match} text={match ? "Passwords match!" : "Passwords do not match"} />
        )}

        <div style={{ marginTop: 8 }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !match || !reqs.length || !reqs.upper || !reqs.lower || !reqs.number || !reqs.special}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? <span className="spinner spinner-sm" /> : <><Lock size={16} /> Update Password</>}
          </button>
        </div>
      </form>
    </div>
  )
}
