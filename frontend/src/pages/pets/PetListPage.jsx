import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, Heart, Tag } from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { getPets } from '../../api/petApi'
import { PET_EMOJI, STATUS_BADGE, LISTING_BADGE, PET_TYPES } from '../../utils/constants'
import { ageLabel, formatPrice, capitalize } from '../../utils/helpers'

function PetCard({ pet, delay = 0 }) {
  const emoji = PET_EMOJI[pet.pet_type] || '🐾'
  return (
    <Link to={`/pets/${pet.id}`} style={{ textDecoration: 'none' }} data-aos="fade-up" data-aos-delay={delay}>
      <div className="card" style={{ overflow: 'hidden' }}>
        {pet.photo
          ? <img src={pet.photo} alt={pet.name} className="pet-img" loading="lazy" />
          : <div className="pet-img-placeholder">{emoji}</div>
        }
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-100)' }}>{pet.name}</h3>
            <span className={`badge ${LISTING_BADGE[pet.listing_type]}`}>{capitalize(pet.listing_type)}</span>
          </div>
          <p style={{ color: 'var(--gray-400)', fontSize: '.83rem', marginBottom: 10 }}>
            {capitalize(pet.pet_type)} {pet.breed ? `· ${pet.breed}` : ''} · {ageLabel(pet.age)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={`badge ${STATUS_BADGE[pet.status]}`}>{capitalize(pet.status)}</span>
            {pet.listing_type === 'sale' && pet.price
              ? <span style={{ fontWeight: 700, color: 'var(--orange-400)', fontSize: '.95rem' }}>{formatPrice(pet.price, pet.currency)}</span>
              : <span style={{ color: 'var(--success)', fontSize: '.85rem', fontWeight: 600 }}>Free Adoption</span>
            }
          </div>
          {pet.location && <p style={{ color: 'var(--gray-500)', fontSize: '.78rem', marginTop: 8 }}>📍 {pet.location}</p>}
        </div>
      </div>
    </Link>
  )
}

export default function PetListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    pet_type: searchParams.get('pet_type') || '',
    listing_type: searchParams.get('listing_type') || '',
    status: 'available',
    ordering: '-created_at',
  })

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    AOS.init({ duration: 800, once: true })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 500)
    return () => clearTimeout(timer)
  }, [filters.search])

  const fetchPets = useCallback(async () => {
    setLoading(true)
    try {
      const activeFilters = { ...filters, search: debouncedSearch }
      const params = Object.fromEntries(Object.entries(activeFilters).filter(([, v]) => v))
      const { data } = await getPets(params)
      setPets(data.results || data)
      setTotal(data.count || (data.results || data).length)
    } catch { setPets([]) }
    finally { setLoading(false) }
  }, [filters.pet_type, filters.listing_type, filters.status, filters.ordering, debouncedSearch])

  useEffect(() => { fetchPets() }, [fetchPets])

  const update = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const clearFilters = () => setFilters({ search: '', pet_type: '', listing_type: '', status: 'available', ordering: '-created_at' })

  return (
    <div>
      {/* Page header */}
      <div className="page-header" data-aos="fade-down">
        <div className="container">
          <h1>Find Your Perfect Pet</h1>
          <p>{total} pets available · Filter by type, breed, and listing</p>
        </div>
      </div>

      <div className="container page-wrapper" style={{ paddingTop: 0 }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }} data-aos="fade-up">
          <div className="search-wrap" style={{ flex: 1, minWidth: 240 }}>
            <Search size={16} className="search-icon" />
            <input
              className="form-input"
              placeholder="Search by name, breed, location…"
              value={filters.search}
              onChange={e => update('search', e.target.value)}
              style={{ paddingLeft: 42 }}
            />
          </div>
          <select className="form-select" style={{ width: 150 }} value={filters.pet_type} onChange={e => update('pet_type', e.target.value)}>
            <option value="">All Types</option>
            {PET_TYPES.map(t => <option key={t} value={t}>{PET_EMOJI[t]} {capitalize(t)}</option>)}
          </select>
          <select className="form-select" style={{ width: 150 }} value={filters.listing_type} onChange={e => update('listing_type', e.target.value)}>
            <option value="">All Listings</option>
            <option value="adoption">Adoption</option>
            <option value="sale">For Sale</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filters.ordering} onChange={e => update('ordering', e.target.value)}>
            <option value="-created_at">Newest First</option>
            <option value="created_at">Oldest First</option>
            <option value="price">Price: Low→High</option>
            <option value="-price">Price: High→Low</option>
          </select>
          {(filters.search || filters.pet_type || filters.listing_type) && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={15} /> Clear</button>
          )}
        </div>

        {/* Pet grid */}
        {loading ? (
          <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : pets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <h3>No pets found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid-4">
            {pets.map((p, idx) => <PetCard key={p.id} pet={p} delay={(idx % 12) * 50} />)}
          </div>
        )}
      </div>
    </div>
  )
}
