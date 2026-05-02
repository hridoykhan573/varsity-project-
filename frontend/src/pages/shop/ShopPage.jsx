import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, Search, Filter, ChevronDown, Info, User, Star, Eye } from 'lucide-react'
import { fetchProducts } from '../../api/productApi'
import { getReviews } from '../../api/reviewApi'
import useCartStore from '../../store/cartStore'
import useWishlistStore from '../../store/wishlistStore'
import toast from 'react-hot-toast'
import AOS from 'aos'
import 'aos/dist/aos.css'
import ProductModal from '../../components/ui/ProductModal'
import useNotificationStore from '../../store/notificationStore'
import useAuthStore from '../../store/authStore'

// ── Seller star rating display (same amber style as shelter header) ──
function StarRating({ value, count }) {
  const avg = parseFloat(value) || 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={11}
            style={{
              color: i <= Math.round(avg) ? '#f59e0b' : '#cbd5e1',
              fill:  i <= Math.round(avg) ? '#f59e0b' : 'none',
              flexShrink: 0
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
        {avg > 0 ? avg.toFixed(1) : 'No reviews'}{count > 0 ? ` (${count})` : ''}
      </span>
    </div>
  )
}

export default function ShopPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [maxLimit, setMaxLimit] = useState(10000)
  const [search, setSearch] = useState('')

  // { [sellerId]: { avg: 4.3, count: 12 } }
  const [sellerStats, setSellerStats] = useState({})

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false)

  const { addItem } = useCartStore()
  const { toggleWishlist, isInWishlist } = useWishlistStore()
  const { addSystemListener, removeSystemListener, initWebSocket } = useNotificationStore()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  // Real-time stock updates via WebSocket
  useEffect(() => {
    initWebSocket()
    const handleSystemEvent = (type, data) => {
      if (type === 'STOCK_UPDATE') {
        const { product_id, new_stock } = data
        setProducts(cur => cur.map(p => p.id === product_id ? { ...p, stock: new_stock } : p))
        setSelectedProduct(cur => cur && cur.id === product_id ? { ...cur, stock: new_stock } : cur)
      }
    }
    addSystemListener(handleSystemEvent)
    return () => removeSystemListener(handleSystemEvent)
  }, [])

  // After products load, fetch reviews for each unique seller (batched)
  const fetchSellerStats = useCallback(async (productList) => {
    const uniqueIds = [...new Set(productList.map(p => p.seller_details?.id).filter(Boolean))]
    if (!uniqueIds.length) return

    const results = await Promise.allSettled(uniqueIds.map(id => getReviews({ target_user: id })))
    const stats = {}
    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        const reviews = res.value.data?.results || res.value.data || []
        const count = reviews.length
        const avg = count > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0
        stats[uniqueIds[idx]] = { avg, count }
      }
    })
    setSellerStats(stats)
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const params = {}
      if (category) params.category = category
      if (search) params.search = search

      const { data: allData } = await fetchProducts(params)
      const allResults = allData.results || allData || []

      if (allResults.length > 0) {
        const highest = Math.ceil(Math.max(...allResults.map(p => Number(p.final_price))))
        setMaxLimit(highest)
        setPriceRange([0, highest])
        params.min_price = 0
        params.max_price = highest
      } else {
        setMaxLimit(10000)
        setPriceRange([0, 10000])
      }

      const { data } = await fetchProducts(params)
      const list = data.results || data || []
      setProducts(list)
      fetchSellerStats(list)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    AOS.init({ duration: 800, once: true })
    loadProducts()
  }, [category, search])

  // Debounced price filter
  useEffect(() => {
    if (loading) return
    const timer = setTimeout(async () => {
      try {
        const params = { min_price: priceRange[0], max_price: priceRange[1] }
        if (category) params.category = category
        if (search) params.search = search
        const { data } = await fetchProducts(params)
        setProducts(data.results || data || [])
      } catch (err) { console.error(err) }
    }, 500)
    return () => clearTimeout(timer)
  }, [priceRange])

  const handleAddToCart = (e, product) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to your cart!')
      navigate('/login')
      return
    }
    addItem(product)
    toast.success(`${product.name} added to cart! 🛒`)
  }

  const handleToggleWishlist = (e, product) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Please sign in to add items to your wishlist! 🧡')
      navigate('/login')
      return
    }
    const wasIn = isInWishlist(product.id)
    toggleWishlist(product)
    toast.success(wasIn ? 'Removed from wishlist' : 'Added to wishlist! 🧡')
  }

  const openProductInfo = (e, product) => {
    e.stopPropagation()
    setSelectedProduct(product)
    setModalOpen(true)
  }

  return (
    <div className="page-wrapper container" style={{ color: 'var(--gray-100)' }}>
      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={selectedProduct} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }} data-aos="fade-up">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: 12 }}>
          Shop Pet Supplies
        </h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '1rem' }}>
          Quality food and accessories for your beloved pets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>

        {/* ── Sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 40 }} data-aos="fade-right">
          {/* Categories */}
          <div>
            <h3 style={{ 
              fontSize: '1.2rem', 
              fontWeight: 900, 
              marginBottom: 24, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              color: 'var(--gray-100)',
              paddingLeft: '6px' // Align with text below
            }}>
              <Filter size={18} style={{ color: 'var(--orange-400)' }} /> Categories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['', 'food', 'accessories'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '14px 20px', borderRadius: '16px', border: '1px solid',
                    borderColor: category === cat ? 'var(--orange-500)' : 'var(--border-color)',
                    background: category === cat ? 'rgba(249,115,22,0.1)' : 'var(--card-bg-light)',
                    color: category === cat ? 'var(--orange-400)' : 'var(--gray-400)',
                    fontSize: '0.95rem', fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.3s ease', textTransform: 'capitalize'
                  }}
                  onMouseOver={e => { if(category !== cat) e.currentTarget.style.borderColor = 'var(--orange-300)' }}
                  onMouseOut={e => { if(category !== cat) e.currentTarget.style.borderColor = 'var(--border-color)' }}
                >
                  {cat || 'All Categories'}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div
              onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 20, 
                cursor: 'pointer',
                paddingLeft: '6px'
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: 'var(--gray-100)' }}>Price Range</h3>
              <ChevronDown size={18} color="var(--gray-500)" style={{ transform: isPriceFilterOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: '0.3s' }} />
            </div>
            {isPriceFilterOpen && (
              <div style={{ 
                background: 'var(--card-bg-light)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '24px', 
                padding: '24px' 
              }}>
                <input
                  type="range" min="0" max={maxLimit} step="1" value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  style={{ width: '100%', accentColor: 'var(--orange-500)', cursor: 'pointer', marginBottom: 24, height: '4px' }}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ val: priceRange[0], fn: v => setPriceRange([parseInt(v)||0, priceRange[1]]) },
                    { val: priceRange[1], fn: v => setPriceRange([priceRange[0], parseInt(v)||0]) }].map(({ val, fn }, i) => (
                    <div key={i} style={{ flex: 1, background: 'var(--gray-900)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--gray-500)', fontSize: '1rem', marginRight: 6 }}>৳</span>
                      <input type="number" value={val} onChange={e => fn(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--gray-100)', width: '100%', fontSize: '0.9rem', fontWeight: 800, outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Product Grid ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={20} style={{ 
              position: 'absolute', 
              left: 20, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--gray-500)',
              zIndex: 1
            }} />
            <input
              type="text"
              placeholder="Search food, toys, beds..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                width: '100%', 
                background: 'var(--card-bg-light)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '20px', 
                padding: '18px 24px 18px 56px', 
                color: 'var(--gray-100)', 
                fontSize: '1rem', 
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--orange-400)'; e.target.style.background = 'var(--card-bg-light)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.background = 'var(--card-bg-light)' }}
            />
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🦴</div>
              <h3>No products found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
              {products.map((p, i) => {
                const stats = sellerStats[p.seller_details?.id] || { avg: 0, count: 0 }
                return (
                  <div
                    key={p.id}
                    data-aos="fade-up"
                    data-aos-delay={i * 40}
                    className="shop-product-card card"
                    style={{ position: 'relative' }}
                  >
                    {/* Product image container with actions overlay */}
                    <div 
                      className="shop-image-container"
                      style={p.dominant_color ? { background: `radial-gradient(circle, ${p.dominant_color}33 0%, var(--gray-800) 80%)` } : {}}
                    >
                      <div className="product-actions-overlay">
                        <button 
                          className="action-btn-premium"
                          onClick={e => openProductInfo(e, p)}
                          title="Product Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className={`action-btn-premium ${isInWishlist(p.id) ? 'active' : ''}`}
                          onClick={e => handleToggleWishlist(e, p)}
                          title={isInWishlist(p.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          <Heart size={18} fill={isInWishlist(p.id) ? 'var(--orange-500)' : 'transparent'} />
                        </button>
                      </div>

                      {p.image
                        ? <img src={p.image} alt={p.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }} />
                        : <span style={{ fontSize: '3.5rem' }}>📦</span>}
                    </div>

                    {/* Product info */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ color: 'var(--gray-100)', fontSize: '1rem', fontWeight: 800, marginBottom: 4, lineHeight: 1.4, minHeight: 44, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {p.name}
                      </h3>

                      {/* Seller + ⭐ Rating */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                          <User size={12} />
                          <span>Sold by: <span style={{ color: '#ea580c' }}>{p.seller_details?.username}</span></span>
                        </div>
                        <StarRating value={stats.avg} count={stats.count} />
                      </div>

                      {/* Stock */}
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: p.stock > 0 ? '#64748b' : 'var(--red-500)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.stock > 0 ? 'var(--green-500)' : 'var(--red-500)' }} />
                        {p.stock > 0 ? `${p.stock} units in stock` : 'Out of stock'}
                      </div>

                      {/* Price */}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <span style={{ color: 'var(--gray-100)', fontSize: '1.25rem', fontWeight: 900 }}>৳{Number(p.final_price).toFixed(0)}</span>
                        {p.discount_percent > 0 && <span style={{ color: '#94a3b8', fontSize: '0.9rem', textDecoration: 'line-through', fontWeight: 600 }}>৳{Number(p.price).toFixed(0)}</span>}
                        {p.discount_percent > 0 && <span style={{ background: '#f97316', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', marginLeft: 'auto' }}>-{p.discount_percent}%</span>}
                      </div>

                      {/* Add to cart */}
                      <button
                        onClick={e => handleAddToCart(e, p)}
                        style={{ width: '100%', background: 'transparent', border: '2px solid var(--orange-500)', color: 'var(--orange-500)', borderRadius: '12px', padding: '12px', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--orange-500)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(249,115,22,0.25)' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--orange-500)'; e.currentTarget.style.boxShadow = 'none' }}
                      >
                        <ShoppingCart size={18} /> Add to Cart
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
