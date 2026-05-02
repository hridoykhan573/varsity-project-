import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Unlock, ArrowLeft } from 'lucide-react'
import { resetPassword } from '../../api/authApi'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (location.state && location.state.email && location.state.code) {
      setEmail(location.state.email)
      setCode(location.state.code)
    } else {
      toast.error('Session expired. Please start over.')
      navigate('/forgot-password')
    }
  }, [location, navigate])

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErr('Passwords do not match.')
      return
    }
    setLoading(true)
    setErr('')
    try {
      await resetPassword({ email, code, new_password: newPassword, confirm_password: confirmPassword })
      toast.success('Your password has been reset successfully!')
      navigate('/login')
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,.1) 0%, transparent 70%)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900 }}>
              🐾 Paw<span className="brand-hub">Hub</span>
            </span>
          </Link>
          <p style={{ color: 'var(--gray-400)', marginTop: 8 }}>Password Recovery</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Reset Your Password</h2>
          {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

          <form onSubmit={handleReset}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', lineHeight: 1.5, marginBottom: 8, textAlign: 'center' }}>
                Enter your new password below to finalize the recovery process.
              </p>

              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>Confirm Password</label>
                <input className="form-input" type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}>
                {loading ? <span className="spinner spinner-sm" /> : <><Unlock size={18} /> Set New Password</>}
              </button>
            </div>
          </form>

          <div className="divider" style={{ marginTop: 24, marginBottom: 24 }} />
          <p style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--gray-400)', fontSize: '.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
