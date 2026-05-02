import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '6rem', marginBottom: 24 }}>🐾</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: 900, color: 'var(--orange-400)', marginBottom: 12 }}>404</h1>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: 12 }}>Oops! Page Not Found</h2>
      <p style={{ color: 'var(--gray-400)', maxWidth: 400, marginBottom: 36, lineHeight: 1.7 }}>
        The page you're looking for seems to have wandered off. Let's get you back on track.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary">Go Home</Link>
        <Link to="/pets" className="btn btn-ghost">Browse Pets</Link>
      </div>
    </div>
  )
}
