import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, LayoutDashboard, PawPrint, ChevronDown, Home, Building2, Sun, Moon, Calendar, AlertCircle, Stethoscope, ShoppingBag, MessageCircle, Heart } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useNotificationStore from '../../store/notificationStore'
import useCartStore from '../../store/cartStore'
import useWishlistStore from '../../store/wishlistStore'
import useChatStore from '../../store/chatStore'
import useThemeStore from '../../store/themeStore'
import { logout as logoutApi } from '../../api/authApi'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import ComplaintModal from '../modals/ComplaintModal'
import { getNavbarNotificationRowStyle } from '../../utils/helpers'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { notifications, unreadCount, fetchNotifications, markOne, markAll } = useNotificationStore()
  const { getTotalItems: getCartCount, setModalOpen } = useCartStore()
  const { unreadTotal, fetchConversations: fetchChats } = useChatStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const { items: wishlistItems } = useWishlistStore()
  const [userOpen, setUserOpen] = useState(false)
  const { isLightMode, toggleTheme } = useThemeStore()
  const [complainOpen, setComplainOpen] = useState(false)
  const notifRef = useRef(null)
  const userRef = useRef(null)

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')


  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      fetchChats()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const close = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) await logoutApi({ refresh })
    } catch { /* ignore */ }
    logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U'

  return (
    <>
      <nav className="navbar">
      <div className="container nav-inner">
        {/* Brand */}
        <Link to="/" className="nav-brand">
          <span style={{ fontSize: '1.5rem' }}>🐾</span>Paw<span className="brand-hub">Hub</span>
        </Link>

        {/* Nav Links */}
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <Home size={14} /> Home
          </Link>
          <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>
            <Building2 size={14} /> About
          </Link>
          <Link to="/pets" className={`nav-link ${isActive('/pets') ? 'active' : ''}`}>
            <PawPrint size={14} /> Pets
          </Link>
          <Link to="/shelters" className={`nav-link ${isActive('/shelters') ? 'active' : ''}`}>
            <Building2 size={14} /> Shelters
          </Link>
          <Link to="/calendar" className={`nav-link ${isActive('/calendar') ? 'active' : ''}`}>
            <Calendar size={14} /> Calendar
          </Link>
          <Link to="/shop" className={`nav-link ${isActive('/shop') ? 'active' : ''}`}>
             <ShoppingBag size={14} /> Shop
          </Link>
        </div>

        {/* Right actions */}
        <div className="nav-actions">


          {/* Shop-specific actions (Cart/Wishlist) */}
          {location.pathname === '/shop' && (
            <>
              {/* Wishlist Icon */}
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error('Please sign in to view your wishlist!')
                    navigate('/login')
                  } else {
                    useWishlistStore.getState().setModalOpen(true)
                  }
                }}
                title="View Wishlist"
                style={{
                  background: 'transparent', 
                  border: '1.5px solid rgba(249,115,22,0.2)',
                  borderRadius: '50%', width: 38, height: 38,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', color: 'var(--orange-500)',
                  transition: 'var(--transition)', marginRight: '4px'
                }}
              >
                <Heart size={18} />
                {wishlistItems.length > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: -2, right: -2, 
                    background: 'var(--orange-500)', 
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    width: 16, height: 16, 
                    borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--gray-900)'
                  }}>
                    {wishlistItems.length}
                  </span>
                )}
              </button>

              {/* Cart Icon */}
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  background: 'transparent', 
                  border: '1.5px solid rgba(249,115,22,0.2)',
                  borderRadius: '50%', width: 38, height: 38,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', color: 'var(--orange-500)',
                  transition: 'var(--transition)', marginRight: '4px'
                }}
                title="View Cart"
              >
                <ShoppingBag size={18} />
                {getCartCount() > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: -2, right: -2, 
                    background: 'var(--orange-500)', 
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    width: 16, height: 16, 
                    borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--gray-900)'
                  }}>
                    {getCartCount()}
                  </span>
                )}
              </button>
            </>
          )}

          {isAuthenticated ? (
            <>
              {/* Chat Inbox */}
              <Link
                to="/chat"
                style={{
                  background: 'rgba(128,128,128,.1)', border: '1px solid rgba(128,128,128,.15)',
                  borderRadius: '50%', width: 38, height: 38,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', color: 'var(--gray-300)',
                  transition: 'var(--transition)', marginRight: '4px'
                }}
                title="Message Inbox"
              >
                <MessageCircle size={18} />
                {unreadTotal > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: -2, right: -2, 
                    background: 'var(--orange-500)', 
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    width: 16, height: 16, 
                    borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--gray-900)'
                  }}>
                    {unreadTotal}
                  </span>
                )}
              </Link>

              {/* Notification Bell */}
              <div className="dropdown" ref={notifRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => { setNotifOpen(o => !o); setUserOpen(false) }}
                  style={{
                    background: 'rgba(128,128,128,.1)', border: '1px solid rgba(128,128,128,.15)',
                    borderRadius: '50%', width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative', color: 'var(--gray-300)',
                    transition: 'var(--transition)',
                  }}
                >
                  <Bell size={17} className={unreadCount > 0 ? 'ringing' : ''} />
                  {unreadCount > 0 && (
                    <span className="notif-dot" style={{ position: 'absolute', top: -3, right: -3, background: 'var(--orange-500)', width: 9, height: 9, borderRadius: '50%', border: '2px solid var(--gray-900)' }} />
                  )}
                </button>
                {notifOpen && (
                  <div className="dropdown-menu" style={{ minWidth: 320, maxHeight: 380, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 12px', borderBottom: '1px solid rgba(128,128,128,.1)' }}>
                      <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAll} style={{ fontSize: '.75rem', color: 'var(--orange-400)', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '.85rem' }}>No notifications yet</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                           key={n.id}
                           onClick={() => markOne(n.id)}
                           style={getNavbarNotificationRowStyle(n)}
                        >
                          <p style={{ fontSize: '.83rem', color: 'var(--gray-200)', marginBottom: 3 }}>
                            {n.notification_type === 'admin_message' && <span className="admin-badge">admin</span>}
                            {n.notification_type === 'co_admin_message' && <span className="admin-badge">co-admin</span>}
                            {n.message}
                          </p>
                          <p style={{ fontSize: '.72rem', color: 'var(--gray-500)' }}>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* User dropdown */}
              <div className="dropdown" ref={userRef} style={{ position: 'relative' }}>
                 <button
                   onClick={() => { setUserOpen(o => !o); setNotifOpen(false) }}
                   style={{
                     display: 'flex', alignItems: 'center', gap: 8,
                     background: 'rgba(128,128,128,.1)', border: '1px solid rgba(128,128,128,.15)',
                     borderRadius: 'var(--radius-full)', padding: '5px 12px 5px 6px',
                     cursor: 'pointer', transition: 'var(--transition)',
                   }}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: '.75rem' }}>{initials}</div>
                  )}
                  <span style={{ fontSize: '.85rem', color: 'var(--gray-200)', fontWeight: 500 }}>{user?.username}</span>
                  <ChevronDown size={13} style={{ color: 'var(--gray-400)' }} />
                </button>
                 {userOpen && (
                   <div className="dropdown-menu">
                     <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid rgba(128,128,128,.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {user?.avatar ? (
                        <img src={user.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: '1rem' }}>{initials}</div>
                      )}
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '.9rem' }}>{user?.username}</p>
                      </div>
                    </div>
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setUserOpen(false)}>
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    <Link to="/profile" className="dropdown-item" onClick={() => setUserOpen(false)}>
                      <User size={15} /> My Profile
                    </Link>
                    <button className="dropdown-item" onClick={() => { setComplainOpen(true); setUserOpen(false) }}>
                      <MessageCircle size={15} color="var(--orange-500)" /> Message to Admin
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Join Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
    <ComplaintModal isOpen={complainOpen} onClose={() => setComplainOpen(false)} />
    </>
  )
}
