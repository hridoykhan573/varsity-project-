import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, ShoppingBag, Bell, XCircle, Package, Truck, MapPin, Phone, Mail, CheckCircle } from 'lucide-react'
import SellerOrders from './SellerOrders'
import { fetchProducts, deleteProduct } from '../../api/productApi'
import useAuthStore from '../../store/authStore'
import useNotificationStore from '../../store/notificationStore'
import { Clock } from 'lucide-react'
import { formatPrice, errorMessage, formatDate, getNotificationCardStyle, isSystemNotification } from '../../utils/helpers'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/ui/ConfirmModal'

const NAV_ITEMS = [
  { key: 'products', label: '🛒 My Products', icon: <ShoppingBag size={16} /> },
  { key: 'orders', label: '📦 Order Inbox', icon: <ShoppingBag size={16} /> },
  { key: 'history', label: '📜 Order History', icon: <CheckCircle size={16} /> },
  { key: 'notif', label: '🔔 Notifications', icon: <Bell size={16} /> },
]

export default function SellerDashboard() {
  const { user } = useAuthStore()
  const { notifications } = useNotificationStore()
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState({ isOpen: false })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchProducts({ seller: user?.id })
        setProducts(res.data?.results || res.data || [])
      } catch (e) {
        toast.error(errorMessage(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const requestDeleteProduct = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deleteProduct(id)
          setProducts(p => p.filter(prod => prod.id !== id))
          toast.success('Product deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  return (
    <div className="container page-wrapper">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--gray-100)' }}>
          Seller Dashboard 🛒
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 6 }}>Manage your pet food and accessories catalog.</p>
      </div>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <p style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, padding: '0 4px' }}>Dashboard</p>
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button 
              key={key} 
              className={`sidebar-link ${tab === key ? 'active' : ''}`} 
              onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ color: tab === key ? 'inherit' : 'var(--gray-500)' }}>{icon}</span>
              {label.replace(/^[^\s]+\s+/, '')} {/* Remove emoji from label if icon is shown */}
            </button>
          ))}
          <div className="divider" />
          <Link to="/seller/products/add" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <PlusCircle size={14} /> Add Product
          </Link>
        </aside>

        <main>
          {tab === 'products' && (
            loading ? (
              <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
            ) : (
              <div>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">My Products</h2>
                    <p className="section-subtitle">{products.length} products listed</p>
                  </div>
                  <Link to="/seller/products/add" className="btn btn-primary btn-sm"><PlusCircle size={14} /> Add Product</Link>
                </div>
                {products.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🛒</div>
                    <h3>No products listed</h3>
                    <p>Start selling pet food and accessories!</p>
                    <Link to="/seller/products/add" className="btn btn-primary" style={{ marginTop: 16 }}>Add Product</Link>
                  </div>
                ) : (
                  <div className="grid-3">
                    {products.map(p => (
                      <div key={p.id} className="card" style={{ overflow: 'hidden' }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: 200, background: 'var(--gray-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📦</div>
                        }
                        <div style={{ padding: 16 }}>
                          <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--orange-400)' }}>{p.name}</h3>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                              {p.discount_percent > 0 ? (
                                  <>
                                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-100)' }}>{formatPrice(p.final_price)}</span>
                                      <span style={{ textDecoration: 'line-through', color: 'var(--gray-500)', fontSize: '.9rem' }}>{formatPrice(p.price)}</span>
                                      <span className="badge badge-orange">{p.discount_percent}% OFF</span>
                                  </>
                              ) : (
                                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-100)' }}>{formatPrice(p.price)}</span>
                              )}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Link to={`/seller/products/${p.id}/edit`} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>Edit</Link>
                            <button onClick={() => requestDeleteProduct(p.id)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {tab === 'notif' && (
            <div>
              <h2 className="section-title" style={{ marginBottom: 24 }}>Notifications</h2>
              {notifications.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🔔</div><h3>No notifications</h3></div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => useNotificationStore.getState().markOne(n.id)}
                    style={{ ...getNotificationCardStyle(n), cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ fontWeight: n.is_read ? 400 : 600, color: 'var(--gray-200)', fontSize: '.9rem', flex: 1, margin: 0 }}>
                        {n.notification_type === 'admin_message' && <span className="admin-badge">admin</span>}
                        {n.notification_type === 'co_admin_message' && <span className="admin-badge">co-admin</span>}
                        {n.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {!n.is_read && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isSystemNotification(n) ? '#2dd4bf' : 'var(--orange-500)',
                              flexShrink: 0,
                              marginTop: 6,
                            }}
                          />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); useNotificationStore.getState().deleteOne(n.id); }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px', color: 'var(--gray-500)' }}
                          title="Delete notification"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                    <p style={{ color: 'var(--gray-500)', fontSize: '.75rem', marginTop: 6, marginBottom: 0 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{formatDate(n.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'orders' && <SellerOrders mode="inbox" />}
          {tab === 'history' && <SellerOrders mode="history" />}
        </main>
      </div>
      <ConfirmModal {...confirmState} onCancel={() => setConfirmState({ isOpen: false })} />
    </div>
  )
}
