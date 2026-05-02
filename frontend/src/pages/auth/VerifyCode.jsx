import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { forgotPassword, verifyCode } from '../../api/authApi'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function VerifyCode() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [timer, setTimer] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (location.state && location.state.email) {
      setEmail(location.state.email)
    } else {
      toast.error('Session expired. Please enter your email again.')
      navigate('/forgot-password')
    }
  }, [location, navigate])

  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [timer])

  const handleResend = async () => {
    if (timer > 0 || resending) return
    setResending(true)
    try {
      await forgotPassword({ email })
      toast.success('A new code has been sent!')
      setTimer(30) // 30-second cooldown
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setResending(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (code.length !== 5) {
      setErr('Please enter a 5-digit code.')
      return
    }
    setLoading(true)
    setErr('')
    try {
      await verifyCode({ email, code })
      toast.success('Code verified successfully!')
      // Redirect to Reset Password page, passing email AND code
      navigate('/reset-password', { state: { email, code } })
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Verify Your Email</h2>
          {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

          <form onSubmit={handleVerify}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: 8, textAlign: 'center' }}>
                <p style={{ color: 'rgba(56, 189, 248, 0.8)', fontSize: '.9rem', marginBottom: 4 }}>We sent a 5-digit code to</p>
                <p style={{ color: 'rgba(56, 189, 248, 1)', fontWeight: 700, fontSize: '.95rem', wordBreak: 'break-all' }}>{email}</p>
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '.75rem', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', display: 'block' }}>Enter 5-Digit Code</label>
                <input 
                  className="form-input" 
                  type="text" 
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code} 
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))} 
                  placeholder="12345" 
                  maxLength={5}
                  style={{ 
                    letterSpacing: '20px', 
                    fontSize: '1.5rem', 
                    textAlign: 'center', 
                    fontWeight: 800, 
                    background: '#fef9c3', 
                    color: '#334155',
                    border: '2px solid rgba(250, 204, 21, 0.4)',
                    padding: '14px',
                    borderRadius: '12px',
                  }}
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}>
                {loading ? <span className="spinner spinner-sm" /> : <><CheckCircle size={18} /> Verify Code</>}
              </button>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>
                  Didn't receive the code?{' '}
                  <button 
                    type="button"
                    onClick={handleResend}
                    disabled={timer > 0 || resending}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      color: (timer > 0 || resending) ? 'var(--gray-500)' : 'var(--primary)', 
                      fontWeight: 600, 
                      cursor: (timer > 0 || resending) ? 'not-allowed' : 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {resending ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
                  </button>
                </p>
              </div>
            </div>
          </form>

          <div className="divider" style={{ marginTop: 24, marginBottom: 24 }} />
          <p style={{ textAlign: 'center' }}>
            <Link to="/forgot-password" style={{ color: 'var(--gray-400)', fontSize: '.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <ArrowLeft size={14} /> Back to Email Input
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
