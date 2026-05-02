import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { login } from '../../api/authApi'
import useAuthStore from '../../store/authStore'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens, fetchProfile } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const { data } = await login(form)
      setTokens(data.access, data.refresh)
      await fetchProfile()
      toast.success('Welcome back! 🐾')
      navigate('/dashboard')
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
          <p style={{ color: 'var(--gray-400)', marginTop: 8 }}>Sign in to your account</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          {err && <div className="alert alert-error" style={{ marginBottom: 20 }}>{err}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showPass ? 'text' : 'password'} name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? <span className="spinner spinner-sm" /> : <><LogIn size={17} /> Sign In</>}
              </button>
            </div>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '.9rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--orange-400)', fontWeight: 600 }}>Create one free</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/forgot-password" style={{ fontSize: '.85rem', color: 'var(--orange-400)', fontWeight: 500 }}>Forgot Password?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
