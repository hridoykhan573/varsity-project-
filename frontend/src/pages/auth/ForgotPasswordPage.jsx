import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Send, Lock, Unlock, ArrowLeft } from 'lucide-react'
import { forgotPassword, resetPassword } from '../../api/authApi'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = request email code, 2 = verify and reset
  
  // Form elements
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [err, setErr] = useState('')

  const handleRequestCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      await forgotPassword({ email })
      toast.success('Authentication code sent! Please check your email.')
      setStep(2)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      await resetPassword({ email, code, new_password: newPassword })
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900 }}>
              🐾 Paw<span className="brand-hub">Hub</span>
            </span>
          </Link>
          <p style={{ color: 'var(--gray-400)', marginTop: 8 }}>
            {step === 1 ? 'Reset your password' : 'Create new password'}
          </p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

          {step === 1 ? (
            <form onSubmit={handleRequestCode}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', lineHeight: 1.5, marginBottom: 8 }}>
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
          ) : (
            <form onSubmit={handleResetPassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: 8 }}>
                  <p style={{ color: 'rgba(56, 189, 248, 0.8)', fontSize: '.9rem', marginBottom: 4 }}>We sent a 5-digit code to</p>
                  <p style={{ color: 'rgba(56, 189, 248, 1)', fontWeight: 700, fontSize: '.95rem', wordBreak: 'break-all' }}>{email}</p>
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>5-Digit Code</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
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

                <div className="form-group">
                  <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8, borderRadius: '12px' }}>
                  {loading ? <span className="spinner spinner-sm" /> : <><Unlock size={18} /> Set New Password</>}
                </button>
              </div>
            </form>
          )}

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
