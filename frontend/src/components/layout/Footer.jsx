import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--gray-900)',
      borderTop: '1px solid rgba(255,255,255,.06)',
      padding: '40px 0 24px',
      marginTop: 'auto',
    }}>
      <div className="container">
        <div className="grid-3" style={{ marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: '1.5rem' }}>🐾</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-100)' }}>Paw<span className="brand-hub">Hub</span></span>
            </div>
            <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', lineHeight: 1.6, maxWidth: '281px' }}>
              Pet Analysis Welfare connecting pets with loving homes, Adoption, boarding, care, buying pet's food, and shop — all in one place.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-100)', fontSize: '.95rem', letterSpacing: '0.05em' }}>Explore</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              {[
                { label: 'Pets for Adoption', to: '/pets?type=adoption' },
                { label: 'Pets for Sale', to: '/pets?type=sale' },
                { label: 'Find Shelters', to: '/shelters' },
                { label: 'About Us', to: '/about' }
              ].map((item) => (
                <Link 
                  key={item.to} 
                  to={item.to} 
                  style={{ color: 'var(--gray-400)', fontSize: '.9rem', transition: 'var(--transition)' }}
                  onMouseOver={e => e.target.style.color = 'var(--orange-400)'}
                  onMouseOut={e => e.target.style.color = 'var(--gray-400)'}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h4 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-100)', fontSize: '.95rem', letterSpacing: '0.05em' }}>Account</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              {[
                { label: 'Register', to: '/register' },
                { label: 'Login', to: '/login' },
                { label: 'Dashboard', to: '/dashboard' }
              ].map((item) => (
                <Link 
                  key={item.to} 
                  to={item.to} 
                  style={{ color: 'var(--gray-400)', fontSize: '.9rem', transition: 'var(--transition)' }}
                  onMouseOver={e => e.target.style.color = 'var(--orange-400)'}
                  onMouseOut={e => e.target.style.color = 'var(--gray-400)'}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: 'var(--gray-500)', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            © {new Date().getFullYear()} Paw<span style={{ color: 'var(--green-600)' }}>Hub</span>. Made with <Heart size={12} style={{ color: 'var(--orange-500)' }} /> for pets.
          </p>
          <p style={{ color: 'var(--gray-600)', fontSize: '.82rem' }}>
            Made by <span style={{ fontWeight: 700, color: 'var(--gray-400)' }}>Ashik Hasan Redoy</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
