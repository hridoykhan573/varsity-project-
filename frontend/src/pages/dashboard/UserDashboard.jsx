import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle, Plus, PawPrint, Calendar, Heart, Bell, CheckCircle, XCircle, Clock, MapPin, Mail, Phone, ShieldAlert, CreditCard, ShoppingBag, ChevronDown, Package, FileText, MessageCircle, MessageSquare, Download, Trash2, Stethoscope } from 'lucide-react'
import { getMyPets, deletePet, updatePet } from '../../api/petApi'
import { getMyAdoptions, updateAdoption, getIncomingAdoptions, deleteAdoption } from '../../api/adoptionApi'
import { getMyBookings, cancelBooking, deleteBooking } from '../../api/bookingApi'
import { createBKashPayment, createPayment } from '../../api/paymentApi'
import { getMyOrders } from '../../api/productApi'
import useAuthStore from '../../store/authStore'
import useNotificationStore from '../../store/notificationStore'
import { capitalize, formatDate, formatPrice, ageLabel, errorMessage, getNotificationCardStyle, isSystemNotification } from '../../utils/helpers'
import { PET_EMOJI, STATUS_BADGE } from '../../utils/constants'
import toast from 'react-hot-toast'
import api from '../../api/axiosInstance'
import useChatStore from '../../store/chatStore'
import ConfirmModal from '../../components/ui/ConfirmModal'
import ReceiptModal from '../../components/ui/ReceiptModal'
import OrderReceiptModal from '../../components/ui/OrderReceiptModal'
import SortDropdown from '../../components/ui/SortDropdown'
import ReviewModal from '../../components/ui/ReviewModal'
import TrackOrderPanel from '../../components/ui/TrackOrderPanel'
import { Star } from 'lucide-react'

const NAV_ITEMS = [
  { key: 'pets',      label: '🐾 My Pets',           icon: <PawPrint size={16} /> },
  { key: 'history',   label: '📜 Pet History',       icon: <FileText size={16} /> },
  { key: 'requests',  label: '❤️ Requests Sent',  icon: <Heart size={16} /> },
  { key: 'incoming',  label: '📥 Adopting or Buying request', icon: <Heart size={16} /> },
  { key: 'bookings',  label: '📅 Shelter Bookings',        icon: <Calendar size={16} /> },
  { key: 'orders',    label: '🛒 My Orders',           icon: <ShoppingBag size={16} /> },
  { key: 'track',     label: '🔍 Track Order',         icon: <Package size={16} /> },
  { key: 'notif',     label: '🔔 Notifications',      icon: <Bell size={16} /> },
]

import GlobalSearchBar from '../../components/ui/GlobalSearchBar'

export default function UserDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { notifications, markOne } = useNotificationStore()
  const [tab, setTab] = useState('pets')
  const [myPets, setMyPets] = useState([])
  const [historyPets, setHistoryPets] = useState([])
  const [adoptions, setAdoptions] = useState([])
  const [bookings, setBookings] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState({ isOpen: false })
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  
  const [showReceipt, setShowReceipt] = useState(false)
  const [activeBookingForReceipt, setActiveBookingForReceipt] = useState(null)
  
  const [showOrderReceipt, setShowOrderReceipt] = useState(false)
  const [activeOrderForReceipt, setActiveOrderForReceipt] = useState(null)
  
  const [paymentStates, setPaymentStates] = useState({}) // { bookingId: { mode: 'online', method: 'bkash' } }
  const [bkashPayLoadingId, setBkashPayLoadingId] = useState(null) // prevents duplicate toasts / double-submit
  
  // Review State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewPetName, setReviewPetName] = useState('')

  // Sorting State
  const [petSort, setPetSort] = useState('time')
  const [reqSort, setReqSort] = useState('time')
  const [incSort, setIncSort] = useState('time')
  const [bookSort, setBookSort] = useState('time')

  const sortItems = (items, type) => {
    return [...items].sort((a, b) => {
      if (type === 'name') {
        const nameA = (a.name || a.pet_detail?.name || a.shelter_detail?.name || '').toLowerCase()
        const nameB = (b.name || b.pet_detail?.name || b.shelter_detail?.name || '').toLowerCase()
        return nameA.localeCompare(nameB)
      }
      if (type === 'max_money') {
        const valA = parseFloat(a.price || a.total_price || 0)
        const valB = parseFloat(b.price || b.total_price || 0)
        return valB - valA
      }
      if (type === 'min_money') {
        const valA = parseFloat(a.price || a.total_price || 0)
        const valB = parseFloat(b.price || b.total_price || 0)
        return valA - valB
      }
      // default: time (newest first)
      return new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date)
    })
  }

  useEffect(() => {
    const load = async () => {
      // Fetch each resource independently to avoid blocking the whole UI
      const endpoints = [
        { key: 'myPets', fn: getMyPets },
        { key: 'history', fn: () => api.get('/api/pets/mine/history/') },
        { key: 'adoptions', fn: getMyAdoptions },
        { key: 'bookings', fn: getMyBookings },
        { key: 'incoming', fn: getIncomingAdoptions },
        { key: 'orders', fn: getMyOrders }
      ]

      endpoints.forEach(async ({ key, fn }) => {
        try {
          const res = await fn()
          let data = res.data?.results || res.data || []
          if (!Array.isArray(data)) data = [] // Safety check: ensure we always have an array
          
          if (key === 'myPets') setMyPets(data)
          if (key === 'history') setHistoryPets(data)
          if (key === 'adoptions') setAdoptions(data)
          if (key === 'bookings') setBookings(data)
          if (key === 'incoming') setIncomingRequests(data)
          if (key === 'orders') setMyOrders(data)
        } catch (err) {
          console.error(`Failed to load ${key}:`, err)
        }
      })
      
      // Stop initial global loading once first major set is tried (approx)
      setTimeout(() => setLoading(false), 800)
    }
    load()

    // Real-time listener
    const listener = (type, data) => {
      if (type === 'BOOKING_UPDATE') {
        const isMyBooking = data.user === user?.id;
        if (isMyBooking) {
          setBookings(prev => {
            const exists = prev.some(b => b.id === data.id);
            if (exists) return prev.map(b => b.id === data.id ? data : b);
            return [data, ...prev];
          });
          if (data.status === 'confirmed') toast.success(`Booking for ${data.bootcamp_detail?.title || data.pet_detail?.name} Confirmed! 🎊`);
        }
      } else if (type === 'COMPLAINT_UPDATE') {
        toast.info(`Your complaint #${data.id} has been updated: ${capitalize(data.status)}`);
      } else if (type === 'ADOPTION_UPDATE') {
        setAdoptions(prev => prev.map(a => a.id === data.id ? data : a));
        if (data.status === 'accepted') toast.success(`Your adoption request for ${data.pet_detail?.name} was Accepted! 🐾`);
      } else if (type === 'PAYMENT_UPDATE') {
        // If it's a booking payment, update the booking status in the list
        if (data.booking) {
          setBookings(prev => prev.map(b => b.id === data.booking ? { ...b, payment_status: data.status === 'completed' ? 'paid' : b.payment_status } : b));
        }
        if (data.status === 'completed') toast.success(`Payment of ${formatPrice(data.amount)} Successful! ✅`);
        else if (data.status === 'failed') toast.error(`Payment Failed: ${data.gateway_response?.statusMessage || 'Try again.'}`);
      }
    };
    useNotificationStore.getState().addSystemListener(listener);
    return () => useNotificationStore.getState().removeSystemListener(listener);
  }, [user?.id])

  const handleAdoptionResponse = async (id, status) => {
    try {
      await updateAdoption(id, { status })
      setAdoptions(a => a.map(r => r.id === id ? { ...r, status } : r))
      toast.success(`Request ${status} ✓`)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const handleIncomingResponse = async (id, status) => {
    try {
      await updateAdoption(id, { status })
      setIncomingRequests(a => a.map(r => r.id === id ? { ...r, status } : r))
      toast.success(`Request ${status} ✓`)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const handleToggleStatus = async (pet) => {
    const newStatus = pet.status === 'available' ? 'unavailable' : 'available'
    const formData = new FormData()
    formData.append('status', newStatus)

    try {
      await updatePet(pet.id, formData)
      setMyPets(prev => prev.map(p => p.id === pet.id ? { ...p, status: newStatus } : p))
      toast.success(`Pet is now ${newStatus}!`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }


  const requestDeletePet = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Pet Listing',
      message: 'Are you absolutely sure you want to delete this pet listing? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deletePet(id)
          setMyPets(p => p.filter(pet => pet.id !== id))
          toast.success('Pet deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const requestCancelBooking = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking?',
      confirmText: 'Yes, Cancel it',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await cancelBooking(id)
          setBookings(b => b.map(bk => bk.id === id ? { ...bk, status: 'cancelled' } : bk))
          toast.success('Booking cancelled.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const requestDeleteAdoption = (id, type) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this adoption request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deleteAdoption(id)
          if (type === 'sent') {
            setAdoptions(a => a.filter(r => r.id !== id))
          } else {
            setIncomingRequests(a => a.filter(r => r.id !== id))
          }
          toast.success('Request deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const requestDeleteBooking = (id) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Booking',
      message: 'Are you sure you want to delete this booking? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deleteBooking(id)
          setBookings(b => b.filter(bk => bk.id !== id))
          toast.success('Booking deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const handleStartChat = async (targetUserId) => {
    if (!targetUserId) {
      toast.error('Shelter contact info not available. Please try again later.')
      return
    }
    try {
      const { data } = await api.get(`/api/chat/conversations/find_or_create/?user_id=${targetUserId}`)
      useChatStore.getState().setActiveConversation(data)
      navigate('/chat')
    } catch (err) {
      toast.error('Could not start chat.')
    }
  }

  const handlePayment = async (booking) => {
    const state = paymentStates[booking.id] || { mode: 'online', method: 'bkash' }

    if (state.mode === 'cash') {
      setConfirmState({
        isOpen: true,
        title: 'Confirm Cash Payment',
        message: 'Selecting cash means you will pay directly at the shelter. The booking will be marked as paid immediately. Confirm?',
        confirmText: 'Confirm Cash',
        variant: 'success',
        onConfirm: async () => {
          setConfirmState({ isOpen: false })
          try {
            await createPayment({ booking: booking.id, method: 'cash', amount: booking.total_price })
            setBookings(prev => prev.map(bk => bk.id === booking.id ? { ...bk, payment_status: 'paid' } : bk))
            toast.success('Payment confirmed! Your receipt is ready.')
          } catch (e) { toast.error(errorMessage(e)) }
        }
      })
      return
    }

    if (state.method === 'bkash') {
      if (bkashPayLoadingId) return
      setBkashPayLoadingId(booking.id)
      try {
        const { data } = await createBKashPayment({
          booking_id: booking.id,
          callback_url: `${window.location.origin}/payment/bkash/callback`
        })
        if (data.bkash_url) {
          window.location.href = data.bkash_url
          return
        }
        toast.error(data.error || 'Could not get bKash payment URL')
      } catch (err) {
        toast.error(errorMessage(err) || 'Payment initiation failed')
      } finally {
        setBkashPayLoadingId(null)
      }
      return
    }

    toast('Coming soon! Please use bKash or Cash for now.', { icon: '⏳' })
  }


  const updatePaymentState = (bookingId, key, val) => {
    setPaymentStates(prev => ({
      ...prev,
      [bookingId]: { ...(prev[bookingId] || { mode: 'online', method: 'bkash' }), [key]: val }
    }))
  }

  // Split adoptions: received (for my pets) vs sent (by me)
  const received = adoptions.filter(a => a.pet_owner_id === user?.id || a.is_received)
  const sent = adoptions.filter(a => a.requester === user?.id || a.requester_id === user?.id)

  return (
    <div className="container page-wrapper">
      {/* Welcome header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--gray-100)' }}>
            Welcome back, {user?.username}! 🐾
          </h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 6 }}>Manage your pets, bookings, and adoption requests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/pets/add')}>
          <PlusCircle size={16} /> List a Pet
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid-5" style={{ marginBottom: 32 }}>
        {[
          ['My Pets', myPets.length, '🐾', 'pets'],
          ['Pet History', historyPets.length, '📜', 'history'],
          ['Requests Sent', sent.length, '❤️', 'requests'],
          ['Adopting/Buying Requests', incomingRequests.length, '📥', 'incoming'],
          ['Bookings', bookings.length, '📅', 'bookings'],
        ].map(([label, count, emoji, tabKey]) => (
          <div 
            key={label} 
            className="stat-card" 
            onClick={() => setTab(tabKey)}
            style={{ 
              cursor: 'pointer', 
              transition: 'var(--transition)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'rgba(249,115,22,.3)'
              e.currentTarget.style.boxShadow = 'var(--shadow-glow)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'rgba(128,128,128,.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{emoji}</div>
            {count !== null && <div className="stat-value" style={{ fontSize: '1.8rem' }}>{count}</div>}
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <p style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, padding: '0 4px' }}>Dashboard</p>
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button 
              key={key} 
              className={`sidebar-link ${tab === key ? 'active' : ''}`} 
              onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              {icon && <span style={{ display: 'flex', alignItems: 'center', opacity: tab === key ? 1 : 0.7 }}>{icon}</span>}
              <span>{label}</span>
            </button>
          ))}
          <div className="divider" />
          <Link to="/pets/add" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <PlusCircle size={14} /> List a Pet
          </Link>
        </aside>

        {/* Main content */}
        <main>
          {loading ? (
            <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : (
            <>
              {/* ── My Pets ── */}
              {tab === 'pets' && (
                <div>
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">My Pets</h2>
                      <p className="section-subtitle">{myPets.length} pets listed</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <SortDropdown currentSort={petSort} onSort={setPetSort} options={['time', 'name', 'max_money', 'min_money']} />
                      <Link to="/pets/add" className="btn btn-primary btn-sm"><PlusCircle size={14} /> Add Pet</Link>
                    </div>
                  </div>
                  {myPets.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🐾</div>
                      <h3>No pets listed</h3>
                      <p>Share your pets with the community!</p>
                      <Link to="/pets/add" className="btn btn-primary" style={{ marginTop: 16 }}>List a Pet</Link>
                    </div>
                  ) : (
                    <div className="grid-3">
                      {sortItems(myPets, petSort).map(pet => (
                        <div key={pet.id} className="card" style={{ overflow: 'hidden' }}>
                          {pet.photo
                            ? <img src={pet.photo} alt={pet.name} className="pet-img" loading="lazy" />
                            : <div className="pet-img-placeholder">{PET_EMOJI[pet.pet_type] || '🐾'}</div>
                          }
                          <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <h3 style={{ fontWeight: 700, color: 'var(--gray-100)' }}>{pet.name}</h3>
                              {['available', 'unavailable'].includes(pet.status) ? (
                                <button 
                                  onClick={() => handleToggleStatus(pet)}
                                  className={`badge ${STATUS_BADGE[pet.status]}`}
                                  style={{ border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}
                                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                  title={`Click to mark as ${pet.status === 'available' ? 'Unavailable' : 'Available'}`}
                                >
                                  {capitalize(pet.status)}
                                </button>
                              ) : (
                                <span className={`badge ${STATUS_BADGE[pet.status]}`}>{capitalize(pet.status)}</span>
                              )}
                            </div>
                            <p style={{ color: 'var(--gray-400)', fontSize: '.82rem', marginBottom: 14 }}>
                              {capitalize(pet.pet_type)} · {ageLabel(pet.age)}
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Link to={`/pets/${pet.id}`} className="btn btn-view btn-sm" style={{ flex: 1, justifyContent: 'center' }}>View</Link>
                              <Link to={`/pets/${pet.id}/edit`} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>Edit</Link>
                              <button onClick={() => requestDeletePet(pet.id)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Pet History ── */}
              {tab === 'history' && (
                <div>
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">Pet History</h2>
                      <p className="section-subtitle">{historyPets.length} successfully moved pets</p>
                    </div>
                    <SortDropdown currentSort={petSort} onSort={setPetSort} options={['time', 'name', 'max_money', 'min_money']} />
                  </div>
                  {historyPets.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📜</div>
                      <h3>No history yet</h3>
                      <p>When your pets are sold or adopted, they will appear here!</p>
                    </div>
                  ) : (
                    <div className="grid-3">
                      {sortItems(historyPets, petSort).map(pet => (
                        <div key={pet.id} className="card" style={{ overflow: 'hidden', opacity: 0.9 }}>
                          {pet.photo
                            ? <img src={pet.photo} alt={pet.name} className="pet-img" />
                            : <div className="pet-img-placeholder">{PET_EMOJI[pet.pet_type] || '🐾'}</div>
                          }
                          <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <h3 style={{ fontWeight: 700, color: 'var(--gray-100)' }}>{pet.name}</h3>
                              <span className={`badge ${STATUS_BADGE[pet.status]}`}>{capitalize(pet.status)}</span>
                            </div>
                            <p style={{ color: 'var(--gray-400)', fontSize: '.82rem', marginBottom: 14 }}>
                              {capitalize(pet.pet_type)} · {ageLabel(pet.age)}
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Link to={`/pets/${pet.id}`} className="btn btn-view btn-sm" style={{ flex: 1, justifyContent: 'center' }}>View Details</Link>
                              {user?.is_staff && (
                                <button onClick={() => requestDeletePet(pet.id)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: 0, justifyContent: 'center' }}>Admin Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Requests Sent ── */}
              {tab === 'requests' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Requests Sent</h2>
                    <SortDropdown currentSort={reqSort} onSort={setReqSort} options={['time', 'name']} />
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 24 }}>Requests you sent to adopt or buy</p>

                  {sent.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📤</div><h3>You haven't sent any requests yet.</h3></div>
                    : sortItems(sent, reqSort).map(r => (
                        <div key={r.id} className="card" style={{ padding: 20, marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>Pet: <Link to={`/pets/${r.pet}`} style={{ color: 'var(--orange-400)' }}>{r.pet_detail?.name || `#${r.pet}`}</Link></p>
                              <p style={{ color: 'var(--gray-500)', fontSize: '.8rem' }}>{formatDate(r.created_at)}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{capitalize(r.status)}</span>
                              <button onClick={(e) => { e.stopPropagation(); requestDeleteAdoption(r.id, 'sent'); }} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--gray-500)' }} title="Delete request">
                                <XCircle size={16} />
                              </button>
                            </div>
                          </div>
                          {r.message && <p style={{ color: 'var(--gray-400)', fontSize: '.83rem', marginTop: 8, fontStyle: 'italic' }}>"{r.message}"</p>}
                          
                          {r.status === 'accepted' && (
                            <div style={{ marginTop: 16 }}>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setReviewTarget(r.pet_detail?.owner)
                                  setReviewPetName(r.pet_detail?.name || 'this pet')
                                  setReviewModalOpen(true)
                                }}
                                style={{ gap: 8 }}
                              >
                                <Star size={14} fill="currentColor" /> Review Seller
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  }
                </div>
              )}

              {/* ── Incoming Requests ── */}
              {tab === 'incoming' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Adopting or Buying Request</h2>
                    <SortDropdown currentSort={incSort} onSort={setIncSort} options={['time', 'name']} />
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 24 }}>Requests for your pets</p>

                  {incomingRequests.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📥</div><h3>No incoming requests yet.</h3></div>
                    : sortItems(incomingRequests, incSort).map(r => (
                        <div key={r.id} className="card" style={{ padding: 20, marginBottom: 14 }}>
                          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>For: <Link to={`/pets/${r.pet}`} style={{ color: 'var(--orange-400)' }}>{r.pet_detail?.name || `Pet #${r.pet}`}</Link></p>
                              <p style={{ color: 'var(--gray-400)', fontSize: '.83rem', marginBottom: 2 }}>From: <Link to={`/users/${r.requester}`} style={{ color: 'var(--orange-400)' }}>{r.requester_detail?.username || r.requester}</Link></p>
                              {r.requester_detail?.phone && <p style={{ color: 'var(--gray-500)', fontSize: '.8rem', marginBottom: 2 }}>📞 {r.requester_detail.phone}</p>}
                              {r.requester_detail?.email && <p style={{ color: 'var(--gray-500)', fontSize: '.8rem', marginBottom: 6 }}>✉️ {r.requester_detail.email}</p>}
                              {r.message && <p style={{ color: 'var(--gray-300)', fontSize: '.85rem', fontStyle: 'italic' }}>"{r.message}"</p>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{capitalize(r.status)}</span>
                              <button onClick={(e) => { e.stopPropagation(); requestDeleteAdoption(r.id, 'incoming'); }} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--gray-500)' }} title="Delete request">
                                <XCircle size={16} />
                              </button>
                            </div>
                          </div>
                          {r.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleIncomingResponse(r.id, 'accepted')}>
                                <CheckCircle size={14} /> Accept
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleIncomingResponse(r.id, 'rejected')}>
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  }
                </div>
              )}

              {/* ── Bookings ── */}
              {tab === 'bookings' && (
                <div>
                   <div className="section-header">
                    <div>
                      <h2 className="section-title">My Bookings</h2>
                      <p className="section-subtitle">{bookings.length} shelter bookings</p>
                    </div>
                    <SortDropdown currentSort={bookSort} onSort={setBookSort} options={['time', 'name', 'max_money', 'min_money']} />
                  </div>
                  {bookings.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📅</div>
                      <h3>No bookings yet</h3>
                      <p>Book a shelter service for your pet.</p>
                      <Link to="/shelters" className="btn btn-primary" style={{ marginTop: 16 }}>Find Shelters</Link>
                    </div>
                  ) : (
                    sortItems(bookings, bookSort).map(bk => (
                      <div key={bk.id} className="card" style={{ padding: 24, marginBottom: 20, borderLeft: bk.payment_status === 'paid' ? '4px solid var(--green-500)' : '4px solid var(--orange-500)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
                          
                          {/* Shelter & Service Details */}
                          <div style={{ flex: '1 1 350px' }}>
                            {bk.bootcamp ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                  <div style={{ padding: 10, background: 'rgba(59,130,246,.1)', borderRadius: 12, color: 'var(--blue-400)' }}>
                                    <PlusCircle size={24} />
                                  </div>
                                  <div>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-100)' }}>{bk.bootcamp_detail?.title}</h3>
                                    <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', marginTop: 2 }}>{bk.shelter_detail?.name}</p>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                      <span className={`badge ${STATUS_BADGE[bk.status]}`}>{capitalize(bk.status)}</span>
                                      {bk.payment_status === 'paid' ? (
                                        <span className="badge badge-green">PAID ✓</span>
                                      ) : (
                                        <span className="badge badge-yellow">UNPAID</span>
                                      )}
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: '.75rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>
                                      Track ID: <span style={{ color: 'var(--gray-200)', userSelect: 'all' }}>{bk.tracking_id || bk.id}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid-2" style={{ gap: '10px 20px', marginBottom: 20 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '.85rem' }}>
                                    <MapPin size={14} className="text-orange" /> {bk.bootcamp_detail?.location}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '.85rem' }}>
                                    <Calendar size={14} className="text-orange" /> {capitalize(bk.bootcamp_detail?.bootcamp_type || '')}
                                  </div>
                                </div>
                                <div style={{ background: 'rgba(59,130,246,0.05)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(59,130,246,.1)' }}>
                                  <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                                    {bk.bootcamp_detail?.description || 'Bootcamp details...'}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                              <div style={{ padding: 10, background: 'rgba(249,115,22,.1)', borderRadius: 12, color: 'var(--orange-500)' }}>
                                <Calendar size={24} />
                              </div>
                              <div>
                                <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-100)' }}>{bk.shelter_detail?.name || `Shelter #${bk.shelter}`}</h3>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <span className={`badge ${STATUS_BADGE[bk.status]}`}>{capitalize(bk.status)}</span>
                                  {bk.payment_status === 'paid' ? (
                                    <span className="badge badge-green">PAID ✓</span>
                                  ) : (
                                    <span className="badge badge-yellow">UNPAID</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid-2" style={{ gap: '10px 20px', marginBottom: 20 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '.85rem' }}>
                                <MapPin size={14} className="text-orange" /> {bk.shelter_detail?.location || 'Location loading…'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '.85rem' }}>
                                <Stethoscope size={14} className="text-orange" /> {bk.service_detail?.name || 'Service name loading…'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-500)', fontSize: '.8rem' }}>
                                <Mail size={14} /> {bk.shelter_detail?.contact_email || 'No email provided'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-500)', fontSize: '.8rem' }}>
                                <Phone size={14} /> {bk.shelter_detail?.phone || 'No phone provided'}
                              </div>
                            </div>

                            <div style={{ background: 'rgba(128,128,128,0.05)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(128,128,128,.1)' }}>
                              <p style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 4, color: 'var(--gray-200)' }}>🐾 {bk.pet_detail?.name || `Pet #${bk.pet}`}</p>
                              <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                                {bk.service_detail?.description || 'Service details...'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                          {/* Time & Price */}
                          <div style={{ textAlign: 'right', minWidth: 180 }}>
                            <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', marginBottom: 8 }}>
                              {formatDate(bk.start_date)} — {formatDate(bk.end_date)}
                            </p>
                            <p style={{ fontWeight: 900, color: 'var(--gray-100)', fontSize: '1.6rem', marginBottom: 16 }}>
                              {formatPrice(bk.total_price)}
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                               <button 
                                 onClick={() => handleStartChat(bk.shelter_detail?.owner)}
                                 style={{
                                   background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                   borderRadius: '10px', padding: '10px 16px', color: 'var(--gray-100)', fontSize: '.8rem',
                                   fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                   cursor: 'pointer', transition: 'all 0.2s', width: '100%'
                                 }}
                               >
                                 <MessageSquare size={14} className="text-orange" /> Message Shelter
                               </button>
                               {bk.payment_status !== 'paid' && bk.status !== 'cancelled' && (
                                 <>
                                   {/* Mode Selector */}
                                   <div className="payment-selector" style={{ marginLeft: 'auto', width: 'fit-content' }}>
                                     {['online', 'cash'].map(m => (
                                       <button 
                                         key={m}
                                         className={`payment-selector-btn ${ (paymentStates[bk.id]?.mode || 'online') === m ? 'active' : '' }`}
                                         onClick={() => updatePaymentState(bk.id, 'mode', m)}
                                       >
                                         {m}
                                       </button>
                                     ))}
                                   </div>

                                   {/* Method Selector (Row) */}
                                   {(paymentStates[bk.id]?.mode || 'online') === 'online' && (
                                     <div className="method-grid">
                                       {[
                                         { id: 'bkash', label: 'bKash' },
                                         { id: 'nagad', label: 'Nagad' },
                                         { id: 'card',  label: 'Card', icon: <CreditCard size={14} /> }
                                       ].map(target => (
                                         <div 
                                           key={target.id}
                                           className={`method-item method-${target.id} ${ (paymentStates[bk.id]?.method || 'bkash') === target.id ? 'active' : '' }`}
                                           onClick={() => updatePaymentState(bk.id, 'method', target.id)}
                                           title={target.label}
                                         >
                                           {target.icon || <span style={{ fontSize: '.6rem', fontWeight: 900 }}>{target.label[0]}</span>}
                                         </div>
                                       ))}
                                     </div>
                                   )}

                                   <button 
                                     type="button"
                                     className="btn btn-primary" 
                                     disabled={bkashPayLoadingId === bk.id}
                                     onClick={() => handlePayment(bk)}
                                     style={{ 
                                       background: 'var(--orange-500)', 
                                       borderColor: 'var(--orange-500)' 
                                     }}
                                   >
                                     {bkashPayLoadingId === bk.id
                                       ? 'Opening bKash…'
                                       : (paymentStates[bk.id]?.mode || 'online') === 'cash'
                                         ? 'Confirm Cash Payment'
                                         : `Pay with ${(paymentStates[bk.id]?.method || 'bkash')}`}
                                   </button>
                                 </>
                               )}

                               <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: bk.payment_status !== 'paid' ? 8 : 0 }}>
                                 {bk.payment_status === 'paid' && (
                                   <>
                                     <button className="btn btn-secondary btn-sm" onClick={() => { setActiveBookingForReceipt(bk); setShowReceipt(true); }}>
                                        View Receipt
                                     </button>
                                     <button 
                                        className="btn btn-ghost btn-sm" 
                                        onClick={() => {
                                          if (window.confirm("Delete this booking record?")) {
                                            api.delete(`/api/bookings/${bk.id}/`).catch(() => {});
                                            setBookings(prev => prev.filter(b => b.id !== bk.id));
                                            toast.success("Booking record deleted");
                                          }
                                        }}
                                        style={{ padding: '8px', color: 'var(--red-500)' }}
                                        title="Delete Booking"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                   </>
                                 )}
                                 {['pending','confirmed'].includes(bk.status) && (
                                   <button className="btn btn-ghost btn-sm" onClick={() => requestCancelBooking(bk.id)}>Cancel</button>
                                 )}
                                 <button onClick={() => requestDeleteBooking(bk.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)' }} title="Delete booking">
                                   <XCircle size={16} />
                                 </button>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── My Orders ── */}
              {tab === 'orders' && (
                <div>
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">My Orders</h2>
                      <p className="section-subtitle">{myOrders.length} product orders placed</p>
                    </div>
                  </div>

                  {myOrders.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🛒</div>
                      <h3>No orders yet</h3>
                      <p>Browse the shop and place your first order!</p>
                      <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>Go to Shop</Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {myOrders.map(order => {
                        const isExpanded = expandedOrderId === order.id
                        // Collect unique sellers from this order
                        const sellers = [...new Map(
                          (order.items || []).filter(i => i.seller_id).map(i => [i.seller_id, { id: i.seller_id, username: i.seller_username }])
                        ).values()]

                        const STATUS_COLORS = {
                          pending: 'rgba(249,115,22,0.15)', processing: 'rgba(59,130,246,0.15)',
                          shipped: 'rgba(168,85,247,0.15)', delivered: 'rgba(34,197,94,0.15)', cancelled: 'rgba(239,68,68,0.15)'
                        }
                        const TEXT_COLORS = {
                          pending: '#f97316', processing: '#3b82f6',
                          shipped: '#a855f7', delivered: '#22c55e', cancelled: '#ef4444'
                        }

                        return (
                          <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isExpanded ? '1px solid var(--orange-500)' : '1px solid rgba(128,128,128,0.1)' }}>
                            {/* Accordion Header */}
                            <div
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              style={{ padding: '16px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isExpanded ? 'rgba(249,115,22,0.03)' : 'transparent', transition: 'all 0.3s' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'var(--gray-700)', color: 'var(--gray-900)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                  <Package size={18} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '1rem', color: isExpanded ? 'var(--orange-400)' : 'var(--gray-100)' }}>
                                    Order ID: <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{order.custom_id || `#${order.id}`}</span>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                                    {new Date(order.created_at).toLocaleDateString()} · {order.items?.length || 0} item(s)
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', background: STATUS_COLORS[order.status], color: TEXT_COLORS[order.status] }}>
                                  {order.status}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Remove this order from your history?")) {
                                      api.delete(`/api/products/orders/${order.id}/delete/`).catch(() => {});
                                      setMyOrders(prev => prev.filter(o => o.id !== order.id));
                                      toast.success("Order removed from your view");
                                    }
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '6px', color: 'var(--red-500)', background: 'var(--red-50)', borderRadius: '50%' }}
                                  title="Delete Order"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s', color: 'var(--gray-400)' }} />
                              </div>
                            </div>

                            {/* Accordion Body */}
                            <div style={{ maxHeight: isExpanded ? '800px' : '0', overflow: 'hidden', transition: 'max-height 0.45s cubic-bezier(0,1,0,1)' }}>
                              <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(128,128,128,0.1)' }}>
                                {/* Items list */}
                                <div style={{ marginTop: 20, marginBottom: 20 }}>
                                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: 14, letterSpacing: '0.06em' }}>ORDERED ITEMS</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {order.items?.map(item => (
                                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: '8px', background: '#fff', padding: 3, flexShrink: 0 }}>
                                          {item.image
                                            ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem' }}>📦</span>
                                          }
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.product_name}</div>
                                          <div style={{ fontSize: '0.76rem', color: 'var(--gray-500)' }}>৳{Number(item.price_at_purchase).toFixed(0)} × {item.quantity}</div>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--gray-100)' }}>৳{(Number(item.price_at_purchase) * item.quantity).toFixed(0)}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed rgba(128,128,128,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--gray-400)', fontWeight: 600, fontSize: '0.88rem' }}>Total Paid</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--orange-500)' }}>৳{Number(order.total_amount).toFixed(0)}</span>
                                  </div>
                                  
                                  {order.status === 'delivered' && sellers.length > 0 && (
                                    <div style={{ borderTop: '1px solid rgba(128,128,128,0.1)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                      <div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: 10 }}>Your order has been delivered! Share your experience:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                          {sellers.map(seller => (
                                            <button
                                              key={seller.id}
                                              className="btn btn-primary btn-sm"
                                              onClick={() => {
                                                setReviewTarget(seller.id)
                                                setReviewPetName('')
                                                setReviewModalOpen(true)
                                                setReviewPetName(`Shop: ${seller.username}`)
                                              }}
                                              style={{ gap: 8 }}
                                            >
                                              <Star size={14} fill="currentColor" /> Review {seller.username}'s Shop
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveOrderForReceipt(order);
                                          setShowOrderReceipt(true);
                                        }}
                                        style={{ gap: 8 }}
                                      >
                                        <FileText size={14} /> View Receipt
                                      </button>
                                    </div>
                                  )}

                                  {order.status !== 'delivered' && (
                                    <div style={{ borderTop: '1px solid rgba(128,128,128,0.1)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveOrderForReceipt(order);
                                          setShowOrderReceipt(true);
                                        }}
                                        style={{ gap: 8 }}
                                      >
                                        <FileText size={14} /> View Receipt
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Track Order ── */}
              {tab === 'track' && <TrackOrderPanel role="user" />}

              {tab === 'notif' && (
                <div>
                  <h2 className="section-title" style={{ marginBottom: 24 }}>Notifications</h2>
                  {notifications.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">🔔</div><h3>No notifications</h3></div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => useNotificationStore.getState().markOne(n.id)} style={getNotificationCardStyle(n)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{ fontWeight: n.is_read ? 400 : 600, color: 'var(--gray-200)', fontSize: '.9rem', flex: 1 }}>
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
                              style={{ padding: '4px', color: 'var(--gray-500)', hover: { color: 'var(--red-400)' } }}
                              title="Delete notification"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        </div>
                        <p style={{ color: 'var(--gray-500)', fontSize: '.75rem', marginTop: 6 }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{formatDate(n.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

          <ConfirmModal {...confirmState} onCancel={() => setConfirmState({ isOpen: false })} />
          {showReceipt && (
            <ReceiptModal 
              isOpen={showReceipt} 
              onClose={() => setShowReceipt(false)} 
              booking={activeBookingForReceipt}
            />
          )}
          {showOrderReceipt && (
            <OrderReceiptModal 
              isOpen={showOrderReceipt} 
              onClose={() => setShowOrderReceipt(false)} 
              order={activeOrderForReceipt}
            />
          )}
          <ReviewModal 
            isOpen={reviewModalOpen} 
            onClose={() => setReviewModalOpen(false)}
            targetUserId={reviewTarget}
            petName={reviewPetName.startsWith('Shop:') ? '' : reviewPetName}
            subTitle={reviewPetName.startsWith('Shop:') ? reviewPetName : undefined}
            onSuccess={() => {
              setReviewModalOpen(false)
            }}
          />
        </div>
      )
    }
