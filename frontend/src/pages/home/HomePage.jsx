import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getPetCategoryCounts, getPlatformStats } from '../../api/petApi'
import { ArrowRight, Shield, Star, Heart, Search, Building2, PawPrint, Stethoscope, Calendar, ShoppingBag } from 'lucide-react'

const HERO_PETS_DEF = [
  { emoji: '🐶', label: 'Dogs', key: 'dog' },
  { emoji: '🐱', label: 'Cats', key: 'cat' },
  { emoji: '🐦', label: 'Birds', key: 'bird' },
  { emoji: '🐇', label: 'Rabbits', key: 'rabbit' },
]

const FEATURES = [
  { icon: <ShoppingBag size={24} />, title: 'Buy Pet Food or Accessories', desc: 'Shop top quality pet food, toys, and accessories from verified sellers.', link: '/shop', cta: 'Shop Now' },
  { icon: <Shield size={24} />, title: 'Verified Shelters', desc: 'All shelters are reviewed and verified. Ratings and reviews keep the community honest.' },
]

const STEPS = [
  { num: '01', title: 'Create Account', desc: 'Sign up as a pet owner or shelter staff in under 60 seconds.' },
  { num: '02', title: 'Browse Pets or Shelters', desc: 'Search and filter by type, location, breed, and services.' },
  { num: '03', title: 'Connect & Book', desc: 'Send adoption requests or book shelter services with one click.' },
  { num: '04', title: 'Give or Receive Love', desc: 'Complete the adoption, enjoy the service, and leave a review.' },
]

export default function HomePage() {
  const [counts, setCounts] = useState({})
  const [stats, setStats] = useState({ total_pets: 0, total_shelters: 0, total_adoptions: 0, happy_owners_percent: 100 })

  useEffect(() => {
    getPetCategoryCounts()
      .then(res => setCounts(res.data))
      .catch(err => console.error("Could not fetch pet counts:", err))
      
    getPlatformStats()
      .then(res => setStats(res.data))
      .catch(err => console.error("Could not fetch platform stats:", err))
  }, [])

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero-gradient" style={{ padding: '100px 0 80px', textAlign: 'center' }}>
        <div className="container">
          <div data-aos="zoom-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,.12)', border: '1px solid rgba(249,115,22,.25)', borderRadius: 'var(--radius-full)', padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ fontSize: '.82rem', color: 'var(--orange-400)', fontWeight: 600 }}>🐾 Find your perfect companion</span>
          </div>
          <h1 data-aos="fade-up" data-aos-delay="100" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 7vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
            Every Pet Deserves<br />
            <span style={{ background: 'linear-gradient(135deg, var(--orange-400), var(--amber-400))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>A Loving Home</span>
          </h1>
          <p data-aos="fade-up" data-aos-delay="200" style={{ color: 'var(--gray-400)', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Adopt, buy, board, and care for pets — all on one beautiful platform. Join thousands of pet lovers today.
          </p>

          <div data-aos="fade-up" data-aos-delay="300" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <Link to="/pets" className="btn btn-primary btn-lg">
              <Search size={18} /> Browse Pets <ArrowRight size={16} />
            </Link>
            <Link to="/shelters" className="btn btn-secondary btn-lg">
              <Building2 size={18} /> Find Shelters
            </Link>
          </div>

          {/* Pet type chips */}
          <div data-aos="fade-up" data-aos-delay="400" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {HERO_PETS_DEF.map(({ emoji, label, key }) => (
              <Link key={label} to={`/pets?pet_type=${key}`} style={{
                textDecoration: 'none',
                background: 'var(--gray-800)',
                border: '1px solid rgba(128,128,128,.15)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 100,
                transition: 'var(--transition)',
                display: 'block',
              }} className="category-card"
                onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,.4)'; e.currentTarget.style.background = 'rgba(249,115,22,.08)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(128,128,128,.15)'; e.currentTarget.style.background = 'var(--gray-800)' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>{emoji}</div>
                <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--gray-200)' }}>{label}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--orange-400)' }}>{counts[key] || 0} Listed</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: '60px 0', background: 'var(--gray-900)', borderTop: '1px solid rgba(128,128,128,.08)' }}>
        <div className="container">
          <div className="grid-4" data-aos="fade-up">
            {[[`${stats.total_pets}+`,'Pets Listed'],[`${stats.total_shelters}+`,'Shelters'],[`${stats.total_adoptions}+`,'Adoptions'],[`${stats.happy_owners_percent}%`,'Happy Owners']].map(([v, l], i) => (
              <div key={l} className="stat-card" data-aos="fade-up" data-aos-delay={i * 100}>
                <div className="stat-value">{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }} data-aos="fade-up">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, marginBottom: 12 }}>Everything You Need</h2>
            <p style={{ color: 'var(--gray-400)', maxWidth: 500, margin: '0 auto' }}>A complete ecosystem for pets, owners, and shelters — in one seamless platform.</p>
          </div>
          <div className="grid-3">
            {FEATURES.map(({ icon, title, desc, link, cta }, idx) => {
              const content = (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(249,115,22,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange-400)', marginBottom: 16 }}>{icon}</div>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--gray-100)' }}>{title}</h3>
                  <p style={{ color: 'var(--gray-400)', fontSize: '.88rem', lineHeight: 1.6, marginBottom: cta ? 20 : 0 }}>{desc}</p>
                  {cta && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--orange-400)', fontWeight: 600, fontSize: '.9rem' }}>
                      {cta} <ArrowRight size={14} />
                    </div>
                  )}
                </>
              )

              if (link) {
                return (
                  <Link key={title} to={link} className="card-link" style={{ textDecoration: 'none' }} data-aos="fade-up" data-aos-delay={idx * 100}>
                    <div className="card" style={{ padding: 28, height: '100%', transition: 'var(--transition)', border: '1px solid rgba(128,128,128,0.1)' }}>
                      {content}
                    </div>
                  </Link>
                )
              }

              return (
                <div key={title} className="card" style={{ padding: 28 }} data-aos="fade-up" data-aos-delay={idx * 100}>
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section style={{ padding: '80px 0', background: 'var(--gray-900)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }} data-aos="fade-up">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, marginBottom: 12 }}>How It Works</h2>
            <p style={{ color: 'var(--gray-400)', maxWidth: 480, margin: '0 auto' }}>Get started in minutes. No complicated steps.</p>
          </div>
          <div className="grid-4">
            {STEPS.map(({ num, title, desc }, idx) => (
              <div key={num} style={{ textAlign: 'center', padding: '24px 16px' }} data-aos="fade-up" data-aos-delay={idx * 150}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#fff', margin: '0 auto 16px', boxShadow: 'var(--shadow-glow)' }}>{num}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--gray-100)' }}>{title}</h3>
                <p style={{ color: 'var(--gray-400)', fontSize: '.85rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA ── */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(135deg, rgba(249,115,22,.12) 0%, rgba(249,115,22,.04) 100%)' }} data-aos="zoom-in">
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>🐾</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Find Your Perfect Pet?
          </h2>
          <p style={{ color: 'var(--gray-400)', marginBottom: 36, maxWidth: 460, margin: '0 auto 36px' }}>
            Join thousands of families who found their best friend on Paw<span className="brand-hub">Hub</span>.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link to="/pets" className="btn btn-ghost btn-lg">
              <PawPrint size={18} /> Browse Pets
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
