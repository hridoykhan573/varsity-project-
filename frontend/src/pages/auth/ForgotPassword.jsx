import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Send, ArrowLeft } from 'lucide-react'
import { forgotPassword } from '../../api/authApi'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleRequestCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      await forgotPassword({ email })
      toast.success('Authentication code sent! Please check your email.')
      // Redirect to Verify Code page, passing email in state
      navigate('/verify-code', { state: { email } })
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Forgot Password?</h2>
          {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

          <form onSubmit={handleRequestCode}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', lineHeight: 1.5, marginBottom: 8, textAlign: 'center' }}>
                Enter your registered email address and we will send you a 5-digit authentication code to reset your password.
              </p>
            
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}>
                {loading ? <span className="spinner spinner-sm" /> : <><Send size={16} /> Send Authentication Code</>}
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
