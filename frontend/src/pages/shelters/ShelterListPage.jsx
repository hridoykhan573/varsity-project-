import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Star, CheckCircle, Building2 } from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { getShelters } from '../../api/shelterApi'
import { capitalize } from '../../utils/helpers'

function ShelterCard({ shelter, delay = 0 }) {
  return (
    <Link to={`/shelters/${shelter.id}`} style={{ textDecoration: 'none' }} data-aos="fade-up" data-aos-delay={delay}>
      <div className="card" style={{ padding: 24, height: '100%' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {shelter.logo || shelter.owner_avatar
            ? <img src={shelter.logo || shelter.owner_avatar} alt={shelter.name} style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
            : <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--orange-600), var(--orange-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>🏠</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shelter.name}</h3>
              {shelter.is_verified && <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />}
            </div>
            <p style={{ color: 'var(--gray-400)', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> {shelter.location}
            </p>
          </div>
        </div>

        {shelter.description && (
          <p style={{ color: 'var(--gray-400)', fontSize: '.83rem', lineHeight: 1.6, marginBottom: 14,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {shelter.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Star size={14} style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }} />
            <span style={{ fontWeight: 700, fontSize: '.88rem' }}>
              {parseFloat(shelter.rating_avg || 0).toFixed(1)}
            </span>
            <span style={{ color: 'var(--gray-500)', fontSize: '.78rem' }}>({shelter.total_reviews} reviews)</span>
          </div>
          <span style={{ background: 'rgba(249,115,22,.12)', color: 'var(--orange-400)', fontSize: '.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
            Capacity: {shelter.capacity}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function ShelterListPage() {
  const [shelters, setShelters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  const fetchShelters = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      const { data } = await getShelters(params)
      setShelters(data.results || data)
      setTotal(data.count || (data.results || data).length)
    } catch { setShelters([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(fetchShelters, 400)
    return () => clearTimeout(timeout)
  }, [fetchShelters])

  return (
    <div>
      <div className="page-header" data-aos="fade-down">
        <div className="container">
          <h1>Find a Shelter</h1>
          <p>{total} verified shelters offering boarding, grooming, and more</p>
        </div>
      </div>

      <div className="container page-wrapper" style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: 500, marginBottom: 28 }} data-aos="fade-up">
          <div className="search-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="form-input"
              placeholder="Search by name or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 42 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : shelters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Building2 size={56} style={{ opacity: .3 }} /></div>
            <h3>No shelters found</h3>
            <p>Try a different search or check back soon.</p>
          </div>
        ) : (
          <div className="grid-3">
            {shelters.map((s, idx) => <ShelterCard key={s.id} shelter={s} delay={(idx % 12) * 50} />)}
          </div>
        )}
      </div>
    </div>
  )
}
