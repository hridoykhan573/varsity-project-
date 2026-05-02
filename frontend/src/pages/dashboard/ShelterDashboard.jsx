import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusCircle, Plus, Calendar, CheckCircle, XCircle, Home, Settings, ShieldAlert, Star, GraduationCap, Trash2, MapPin, PawPrint, Heart, MessageSquare, MessageCircle, Send, Package, BarChart2, Bell, HeartPulse, CreditCard, Stethoscope, Clock } from 'lucide-react'
import ShelterReports from './ShelterReports'
import { getMyShelters, createShelter, getShelterServices, addShelterService, deleteShelter, getShelterReviews } from '../../api/shelterApi'
import { createBootcamp, getBootcamps, deleteBootcamp, getMyBootcamps } from '../../api/bootcampApi'
import { updateBooking } from '../../api/bookingApi'
import { createBKashPayment, createPayment } from '../../api/paymentApi'
import { getMyPets, deletePet, updatePet } from '../../api/petApi'
import { getMyAdoptions, updateAdoption, getIncomingAdoptions, deleteAdoption } from '../../api/adoptionApi'
import api from '../../api/axiosInstance'
import useAuthStore from '../../store/authStore'
import useChatStore from '../../store/chatStore'
import useNotificationStore from '../../store/notificationStore'
import { capitalize, formatDate, formatPrice, ageLabel, errorMessage, getNotificationCardStyle, isSystemNotification } from '../../utils/helpers'
import { STATUS_BADGE, SERVICE_TYPES, PET_EMOJI } from '../../utils/constants'
import toast from 'react-hot-toast'
import ConfirmModal from '../../components/ui/ConfirmModal'
import ReceiptModal from '../../components/ui/ReceiptModal'
import SortDropdown from '../../components/ui/SortDropdown'
import ReviewModal from '../../components/ui/ReviewModal'
import BroadcastModal from '../../components/modals/BroadcastModal'
import TrackOrderPanel from '../../components/ui/TrackOrderPanel'

const NAV_ITEMS = [
  { key: 'shelters',   label: '🏠 My Shelters',        icon: <Home size={16} /> },
  { key: 'bookings',   label: '📅 Bookings Incoming',  icon: <Calendar size={16} /> },
  { key: 'history',    label: '✅ Successful Service', icon: <CheckCircle size={16} /> },
  { key: 'bootcamps',  label: '🎓 Bootcamps',           icon: <GraduationCap size={16} /> },
  { key: 'pets',       label: '🐾 My Pets',            icon: <PawPrint size={16} /> },
  { key: 'requests',   label: '❤️ Requests Sent',       icon: <Heart size={16} /> },
  { key: 'incoming',   label: '📥 Adopting or Buying',  icon: <Heart size={16} /> },
  { key: 'track',      label: '🔍 Track Order',          icon: <Package size={16} /> },
  { key: 'reports',    label: '📊 Reports',             icon: <BarChart2 size={16} /> },
  { key: 'notif',      label: '🔔 Notifications',       icon: <Bell size={16} /> },
]

const calculateTimeLeft = (date) => {
  const difference = new Date(date) - new Date()
  if (difference <= 0) return null

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60)
  }
}

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!timeLeft) {
    const isNow = new Date() < new Date(targetDate) + (24 * 60 * 60 * 1000)
    return (
      <div className="countdown-box" style={{ background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.2)' }}>
        <span style={{ color: 'var(--green-500)', fontWeight: 800, fontSize: '.85rem' }}>
          {isNow ? '🔥 HAPPENING NOW!' : '✅ EVENT ENDED'}
        </span>
      </div>
    )
  }

  return (
    <div className="countdown-box">
      <div className="countdown-item"><span className="countdown-value">{timeLeft.days}</span><span className="countdown-label">Days</span></div>
      <span className="countdown-sep">:</span>
      <div className="countdown-item"><span className="countdown-value">{timeLeft.hours}</span><span className="countdown-label">Hrs</span></div>
      <span className="countdown-sep">:</span>
      <div className="countdown-item"><span className="countdown-value">{timeLeft.minutes}</span><span className="countdown-label">Min</span></div>
      <span className="countdown-sep">:</span>
      <div className="countdown-item"><span className="countdown-value">{timeLeft.seconds}</span><span className="countdown-label">Sec</span></div>
    </div>
  )
}


export default function ShelterDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { notifications } = useNotificationStore()
  const [tab, setTab] = useState('shelters')
  const [shelters, setShelters] = useState([])
  const [bookings, setBookings] = useState([])
  const [bootcamps, setBootcamps] = useState([])
  const [myPets, setMyPets] = useState([])
  const [adoptions, setAdoptions] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState({ isOpen: false })

  // Modals / forms
  const [showAddShelter, setShowAddShelter] = useState(false)
  const [editingShelter, setEditingShelter] = useState(null)
  const [shelterForm, setShelterForm] = useState({ name: '', location: '', contact_email: '', phone: '', capacity: 20, bkash_number: '' })

  const [manageShelterId, setManageShelterId] = useState(null)
  const [services, setServices] = useState([])
  const [showAddService, setShowAddService] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [serviceForm, setServiceForm] = useState({ name: '', service_type: 'boarding', price: '', description: '', discount_percentage: 0, capacity: 10 })
  
  const [showAddBootcamp, setShowAddBootcamp] = useState(false)
  const [bootcampForm, setBootcampForm] = useState({ 
    shelter: '', title: '', description: '', bootcamp_type: 'training', 
    location: '', start_date: '', end_date: '', is_paid: false, price: '',
    capacity: 20
  })

  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [activeShelterForReviews, setActiveShelterForReviews] = useState(null)
  const [shelterReviews, setShelterReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Loading states
  const [actionLoading, setActionLoading] = useState(false)

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false)
  const [activeBookingForReceipt, setActiveBookingForReceipt] = useState(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewPetName, setReviewPetName] = useState('')
  const [bkashPayLoadingId, setBkashPayLoadingId] = useState(null)

  // Sorting State
  const [shelterSort, setShelterSort] = useState('time')
  const [serviceSort, setServiceSort] = useState('time')
  const [bookSort, setBookSort] = useState('time')
  const [historySort, setHistorySort] = useState('time')
  const [bootSort, setBootSort] = useState('time')
  const [petSort, setPetSort] = useState('time')
  const [reqSort, setReqSort] = useState('time')
  const [incSort, setIncSort] = useState('time')

  const [broadcastModal, setBroadcastModal] = useState({
    isOpen: false,
    type: 'bootcamp',
    relatedId: null
  })


  const sortItems = (items, type) => {
    return [...items].sort((a, b) => {
      if (type === 'name') {
        const nameA = (a.name || a.title || a.pet_detail?.name || '').toLowerCase()
        const nameB = (b.name || b.title || b.pet_detail?.name || '').toLowerCase()
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
      setLoading(true)
      try {
        const [sRes, bRes, bcRes, pRes, aRes, iRes] = await Promise.allSettled([
          getMyShelters(), 
          api.get('/api/bookings/shelter/'),
          getMyBootcamps(),
          getMyPets(),
          getMyAdoptions(),
          getIncomingAdoptions()
        ])
        if (sRes.status === 'fulfilled') setShelters(sRes.value.data?.results || sRes.value.data || [])
        if (bRes.status === 'fulfilled') setBookings(bRes.value.data?.results || bRes.value.data || [])
        if (bcRes.status === 'fulfilled') setBootcamps(bcRes.value.data?.results || bcRes.value.data || [])
        if (pRes.status === 'fulfilled') setMyPets(pRes.value.data?.results || pRes.value.data || [])
        if (aRes.status === 'fulfilled') setAdoptions(aRes.value.data?.results || aRes.value.data || [])
        if (iRes.status === 'fulfilled') setIncomingRequests(iRes.value.data?.results || iRes.value.data || [])
      } finally { setLoading(false) }
    }
    load()

    // Real-time listener
    const listener = (type, data) => {
      if (type === 'BOOKING_UPDATE') {
        const isMyShelter = data.shelter_detail?.owner === user?.id;
        if (isMyShelter) {
          setBookings(prev => {
            const exists = prev.some(b => b.id === data.id);
            if (exists) return prev.map(b => b.id === data.id ? data : b);
            return [data, ...prev];
          });
        }
      } else if (type === 'ADOPTION_REQUEST') {
        const isMyPet = data.pet_detail?.owner === user?.id;
        if (isMyPet) {
          setAdoptions(prev => {
            const exists = prev.some(a => a.id === data.id);
            if (exists) return prev;
            return [data, ...prev];
          });
          toast.success(`New Adoption Request received for ${data.pet_detail?.name}! 🐾`);
        }
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

  const [broadcastLoading, setBroadcastLoading] = useState(false)

  const handleStartChat = async (targetUserId) => {
    try {
      const { data } = await api.get(`/api/chat/conversations/find_or_create/?user_id=${targetUserId}`)
      useChatStore.getState().setActiveConversation(data)
      navigate('/chat')
    } catch (err) {
      toast.error('Could not start chat.')
    }
  }

  const handleBroadcast = (type, relatedId = null) => {
    setBroadcastModal({ isOpen: true, type, relatedId })
  }

  const confirmBroadcast = async (message) => {
    setBroadcastLoading(true)
    try {
      await api.post('/api/chat/broadcast/broadcast/', {
        message,
        type: broadcastModal.type,
        related_id: broadcastModal.relatedId
      })
      toast.success('Broadcast sent successfully!')
      setBroadcastModal(prev => ({ ...prev, isOpen: false }))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBroadcastLoading(false)
    }
  }

  const handleToggleStatus = async (pet) => {
    const newStatus = pet.status === 'available' ? 'unavailable' : 'available'
    const formData = new FormData()
    formData.append('status', newStatus)
    try {
      await updatePet(pet.id, formData)
      setMyPets(prev => prev.map(p => p.id === pet.id ? { ...p, status: newStatus } : p))
      toast.success(`Pet is now ${newStatus}!`)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const requestDeletePet = (id) => {
    setConfirmState({
      isOpen: true, title: 'Delete Pet Listing', message: 'Are you absolutely sure you want to delete this pet listing? This action cannot be undone.',
      confirmText: 'Delete', variant: 'danger',
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

  const requestDeleteAdoption = (id, type) => {
    setConfirmState({
      isOpen: true, title: 'Delete Request', message: 'Are you sure you want to delete this adoption request? This action cannot be undone.',
      confirmText: 'Delete', variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deleteAdoption(id)
          if (type === 'sent') setAdoptions(a => a.filter(r => r.id !== id))
          else setIncomingRequests(a => a.filter(r => r.id !== id))
          toast.success('Request deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const handleCreateShelter = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const fd = new FormData()
      Object.entries(shelterForm).forEach(([k,v]) => fd.append(k,v))
      
      if (editingShelter) {
        const { data } = await api.patch(`/api/shelters/${editingShelter.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        setShelters(s => s.map(sh => sh.id === data.id ? data : sh))
        toast.success('Shelter updated!')
      } else {
        const { data } = await createShelter(fd)
        setShelters([data, ...shelters])
        toast.success('Shelter added! Wait for admin verification.')
      }
      setShowAddShelter(false)
      setEditingShelter(null)
    } catch(e) { toast.error(errorMessage(e)) }
    finally { setActionLoading(false) }
  }

  const openEditShelter = (s) => {
    setEditingShelter(s)
    setShelterForm({
      name: s.name,
      location: s.location,
      contact_email: s.contact_email,
      phone: s.phone,
      capacity: s.capacity,
      bkash_number: s.bkash_number || ''
    })
    setShowAddShelter(true)
  }

  const loadServices = async (id) => {
    try {
      const { data } = await getShelterServices(id)
      setServices(data.results || data || [])
      setManageShelterId(id)
      setTab('services')
    } catch(e) { toast.error(errorMessage(e)) }
  }

  const handleAddService = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      if (editingService) {
        const { data } = await api.patch(`/api/shelters/${manageShelterId}/services/${editingService.id}/`, serviceForm)
        setServices(services.map(s => s.id === data.id ? data : s))
        toast.success('Service updated!')
      } else {
        const { data } = await addShelterService(manageShelterId, serviceForm)
        setServices([data, ...services])
        toast.success('Service added!')
      }
      setShowAddService(false)
      setEditingService(null)
    } catch(e) { toast.error(errorMessage(e)) }
    finally { setActionLoading(false) }
  }

  const openEditService = (srv) => {
    setEditingService(srv)
    setServiceForm({
      name: srv.name,
      service_type: srv.service_type,
      price: srv.price,
      description: srv.description,
      discount_percentage: srv.discount_percentage || 0,
      capacity: srv.capacity || 10
    })
    setShowAddService(true)
  }

  const handleToggleServiceAvailability = async (srv) => {
    try {
      const { data } = await api.patch(`/api/shelters/${manageShelterId}/services/${srv.id}/`, {
        is_available: !srv.is_available
      })
      setServices(services.map(s => s.id === srv.id ? data : s))
      toast.success(data.is_available ? 'Service is now active!' : 'Service is now hidden.')
    } catch(e) { toast.error(errorMessage(e)) }
  }

  const handleBookingResponse = async (id, status) => {
    try {
      await updateBooking(id, { status })
      setBookings(b => b.map(bk => bk.id === id ? { ...bk, status } : bk))
      toast.success(`Booking ${status} ✓`)
    } catch(e) { toast.error(errorMessage(e)) }
  }

  const handleCreateBootcamp = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const { data } = await createBootcamp(bootcampForm)
      setBootcamps([data, ...bootcamps])
      setShowAddBootcamp(false)
      setBootcampForm({ 
        shelter: '', title: '', description: '', bootcamp_type: 'training', 
        location: '', start_date: '', end_date: '', is_paid: false, price: '',
        capacity: 20
      })
      toast.success('Bootcamp launched! User can now see it in the calendar.')
    } catch(e) { toast.error(errorMessage(e)) }
    finally { setActionLoading(false) }
  }

  const handleOpenReviews = async (shelter) => {
    setActiveShelterForReviews(shelter)
    setShowReviewsModal(true)
    setReviewsLoading(true)
    try {
      const { data } = await getShelterReviews(shelter.id)
      setShelterReviews(data.results || data || [])
    } catch (e) { 
      toast.error(errorMessage(e)) 
    } finally { 
      setReviewsLoading(false) 
    }
  }

  const requestDeleteShelter = (id, name) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Shelter',
      message: `Are you sure you want to delete "${name}"? This will also remove all associated services and bootcamps.`,
      confirmText: 'Delete Everything',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deleteShelter(id)
          setShelters(s => s.filter(shelter => shelter.id !== id))
          toast.success('Shelter deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  const requestDeleteBootcamp = (id, title) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Bootcamp',
      message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await deleteBootcamp(id)
          setBootcamps(b => b.filter(bc => bc.id !== id))
          toast.success('Bootcamp deleted.')
        } catch (e) { toast.error(errorMessage(e)) }
      }
    })
  }

  return (
    <div className="container page-wrapper">
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
            Shelter Management 🏠
          </h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 6 }}>Manage your shelters, services, and incoming bookings.</p>
        </div>
      </div>

      <div className="grid-5" style={{ marginBottom: 32 }}>
        {[
          ['My Shelters', shelters.length, '🏠', 'shelters'],
          ['Pending Bookings', bookings.filter(b => b.status === 'pending').length, '📅', 'bookings'],
          ['Successful Service', bookings.filter(b => b.status === 'completed').length, '✅', 'history'],
          ['Active Bootcamps', bootcamps.length, '🎓', 'bootcamps'],
          ['Track Order', null, '🔍', 'track'],
        ].map(([label, count, emoji, tabKey]) => (
          <div 
            key={label} 
            className="stat-card" 
            onClick={() => { setTab(tabKey); setManageShelterId(null); }}
            style={{ 
              cursor: 'pointer', 
              transition: 'var(--transition)',
              border: tab === tabKey ? '1px solid var(--orange-500)' : '1px solid rgba(255,255,255,.06)',
              background: tab === tabKey ? 'rgba(249,115,22,.05)' : 'var(--gray-800)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'rgba(249,115,22,.3)'
              e.currentTarget.style.boxShadow = 'var(--shadow-glow)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = tab === tabKey ? 'var(--orange-500)' : 'rgba(255,255,255,.06)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{emoji}</div>
            <div className="stat-value">{count}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <p style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 10, padding: '0 4px' }}>Shelter Space</p>
          {NAV_ITEMS.map(({ key, label }) => (
            <button key={key} className={`sidebar-link ${tab === key || (key === 'shelters' && tab === 'services') ? 'active' : ''}`} onClick={() => { setTab(key); setManageShelterId(null); }}>
              {label}
            </button>
          ))}
          <div className="divider" />
          <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowAddShelter(true)}>
            <PlusCircle size={14} /> Register Shelter
          </button>
        </aside>

        <main>
          {loading ? (
            <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : (
            <>

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
                            <span style={{ fontSize: '.7rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                              {formatDate(n.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'reports' && <ShelterReports />}
              {tab === 'shelters' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>My Shelters</h2>
                    <SortDropdown currentSort={shelterSort} onSort={setShelterSort} options={['time', 'name']} />
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 24 }}>Your registered shelters on Paw<span className="brand-hub">Hub</span>.</p>
                  {shelters.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🏠</div>
                      <h3>No shelters registered</h3>
                      <button onClick={() => setShowAddShelter(true)} className="btn btn-primary" style={{ marginTop: 16 }}>Register your first shelter</button>
                    </div>
                  ) : (
                    sortItems(shelters, shelterSort).map(s => (
                      <div key={s.id} className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <h3 
                              onClick={() => handleOpenReviews(s)}
                              style={{ 
                                fontWeight: 800, 
                                fontSize: '1.2rem', 
                                cursor: 'pointer', 
                                color: 'var(--orange-400)',
                                transition: 'var(--transition)',
                              }}
                            >
                              {s.name}
                            </h3>
                            {s.is_verified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-yellow">Pending Verification</span>}
                          </div>
                          <p style={{ color: 'var(--gray-400)', fontSize: '.85rem' }}>📍 {s.location} · 👥 Cap: {s.capacity}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => requestDeleteShelter(s.id, s.name)} className="btn btn-danger btn-sm" title="Delete Shelter">
                            <Trash2 size={14} /> Delete
                          </button>
                          <button onClick={() => openEditShelter(s)} className="btn btn-secondary btn-sm" title="Edit Shelter">
                            <PlusCircle size={14} style={{ transform: 'rotate(45deg)' }} /> Edit
                          </button>
                          <button onClick={() => loadServices(s.id)} className="btn btn-secondary btn-sm"><Settings size={14} /> Manage Services</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Manage Services ── */}
              {tab === 'services' && manageShelterId && (
                <div>
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">Manage Services</h2>
                      <p className="section-subtitle">Add or edit services for this shelter.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <SortDropdown currentSort={serviceSort} onSort={setServiceSort} options={['time', 'name', 'max_money', 'min_money']} />
                      <button className="btn btn-primary btn-sm" onClick={() => setShowAddService(true)}>
                        <PlusCircle size={14} /> Add Service
                      </button>
                    </div>
                  </div>
                  {services.length === 0 ? (
                    <div className="empty-state">
                      <h3>No services offered yet!</h3>
                      <button onClick={() => setShowAddService(true)} className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Add your first service</button>
                    </div>
                  ) : (
                    <div className="grid-2">
                       {sortItems(services, serviceSort).map(srv => (
                        <div key={srv.id} className="card" style={{ padding: 16 }}>
                          <h4 style={{ fontWeight: 800 }}>{srv.name}</h4>
                          <div style={{ display: 'flex', gap: 6, margin: '8px 0', alignItems: 'center' }}>
                            <button 
                               onClick={() => handleToggleServiceAvailability(srv)}
                               className={`badge-toggle ${srv.is_available ? 'active' : 'inactive'}`}
                               style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                             >
                               {srv.is_available ? 'ACTIVE' : 'INACTIVE'}
                             </button>
                            {srv.discount_percentage > 0 && <span className="badge badge-orange">🏷️ {srv.discount_percentage}% OFF</span>}
                            <span className={`badge ${srv.remaining_capacity > 0 ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 'auto' }}>
                              Slots: {srv.remaining_capacity ?? 0} / {srv.capacity ?? 10}
                            </span>
                          </div>
                          <p style={{ color: 'var(--gray-400)', fontSize: '.8rem', marginBottom: 10 }}>{srv.description}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontWeight: 600, color: 'var(--orange-400)' }}>
                              {srv.discount_percentage > 0 ? (
                                <><span style={{ textDecoration: 'line-through', color: 'var(--gray-500)', fontSize: '.85rem', marginRight: 6 }}>{formatPrice(srv.price)}</span>{formatPrice(srv.discounted_price)}</>
                              ) : formatPrice(srv.price)}
                              <span style={{ fontSize: '.75rem', fontWeight: 400, color: 'var(--gray-500)' }}> / {srv.price_unit}</span>
                            </p>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditService(srv)}>Edit</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Bookings Incoming ── */}
              {tab === 'bookings' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Incoming Bookings</h2>
                    <SortDropdown currentSort={bookSort} onSort={setBookSort} options={['time', 'name', 'max_money', 'min_money']} />
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 24 }}>Bookings users have made at your shelters.</p>

                  {bookings.filter(b => b.status !== 'completed').length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📅</div>
                       <h3>No bookings yet</h3>
                    </div>
                  ) : (
                    sortItems(bookings.filter(b => b.status !== 'completed'), bookSort).map(bk => (
                      <div key={bk.id} className="card" style={{ padding: 24, marginBottom: 20, borderLeft: bk.status === 'pending' ? '4px solid var(--orange-500)' : '4px solid transparent' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                          
                          {/* Item Info */}
                          <div style={{ flex: '1 1 300px' }}>
                            {bk.bootcamp ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--blue-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎓</div>
                                  <div>
                                    <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bootcamp Request</p>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{bk.bootcamp_detail?.title}</h3>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                   <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>Requested by: <span style={{ color: 'var(--blue-400)', fontWeight: 600 }}>@{bk.user_detail?.username}</span></p>
                                   <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>Type: <span style={{ color: 'var(--gray-200)', fontWeight: 500 }}>{capitalize(bk.bootcamp_detail?.bootcamp_type || '')}</span></p>
                                </div>
                              </>
                            ) : (
                               <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--gray-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🐾</div>
                                  <div>
                                    <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pet Information</p>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                                      {bk.pet_detail?.name} <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: '.9rem' }}>({capitalize(bk.pet_detail?.pet_type || '')})</span>
                                    </h3>
                                  </div>
                                </div>
                                <div className="grid-2" style={{ gap: '8px 20px', marginBottom: 16 }}>
                                  <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>Breed: <span style={{ color: 'var(--gray-200)', fontWeight: 500 }}>{bk.pet_detail?.breed || 'Unknown'}</span></p>
                                  <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>Age: <span style={{ color: 'var(--gray-200)', fontWeight: 500 }}>{bk.pet_detail?.age_display}</span></p>
                                  <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>Gender: <span style={{ color: 'var(--gray-200)', fontWeight: 500 }}>{capitalize(bk.pet_detail?.gender || 'unknown')}</span></p>
                                  <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>Service: <span style={{ color: 'var(--orange-400)', fontWeight: 600 }}>{bk.service_detail?.name}</span></p>
                                </div>
                              </>
                            )}
 
                            <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              📅 <span style={{ fontWeight: 600, color: 'var(--gray-200)' }}>{formatDate(bk.start_date)} → {formatDate(bk.end_date)}</span>
                            </p>
                          </div>
 
                          {/* Owner Info */}
                          <div style={{ flex: '1 1 250px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Owner Information</p>
                            <p style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 6 }}>{bk.user_detail?.username}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>📧 {bk.user_detail?.email}</p>
                              <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>📞 {bk.user_detail?.phone || 'No phone provided'}</p>
                              <p style={{ fontSize: '.85rem', color: 'var(--gray-400)' }}>📍 {bk.user_detail?.location || 'No location'}</p>
                            </div>
                          </div>
 
                          {/* Status & Price */}
                          <div style={{ textAlign: 'right', minWidth: 100 }}>
                            <span className={`badge ${STATUS_BADGE[bk.status]}`} style={{ padding: '6px 12px', fontSize: '.75rem' }}>{capitalize(bk.status)}</span>
                            <p style={{ fontWeight: 900, marginTop: 12, fontSize: '1.4rem', color: 'var(--gray-100)' }}>{formatPrice(bk.total_price)}</p>
                            <div style={{ marginTop: 6, fontSize: '.75rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>
                              Track ID: <span style={{ color: 'var(--gray-200)', userSelect: 'all' }}>{bk.tracking_id || bk.id}</span>
                            </div>
                          </div>
                        </div>
 
                        {bk.special_instructions && (
                          <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: '10px' }}>
                            <p style={{ fontSize: '.85rem', color: 'var(--amber-400)', fontWeight: 600, marginBottom: 4 }}>📝 Special Instructions:</p>
                            <p style={{ fontSize: '.85rem', color: 'var(--gray-300)', lineHeight: 1.5 }}>{bk.special_instructions}</p>
                          </div>
                        )}
 
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ gap: 8 }}
                            onClick={() => handleStartChat(bk.user)}
                          >
                            <MessageSquare size={14} /> Chat with User
                          </button>
                          {bk.status === 'pending' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleBookingResponse(bk.id, 'confirmed')}><CheckCircle size={14} /> Confirm Booking</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleBookingResponse(bk.id, 'rejected')}><XCircle size={14} /> Reject</button>
                            </>
                          )}
                          {bk.status === 'confirmed' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleBookingResponse(bk.id, 'completed')}><CheckCircle size={14} /> Mark as Completed</button>
                          )}
                          {bk.status === 'in_progress' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleBookingResponse(bk.id, 'completed')}><CheckCircle size={14} /> Mark as Completed</button>
                          )}
                          {bk.payment_status === 'paid' && (
                            <button className="btn btn-ghost btn-sm" style={{ border: '1px solid rgba(255,255,255,.1)' }} onClick={() => { setActiveBookingForReceipt(bk); setShowReceipt(true); }}>
                               View Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
 
              {/* ── Successful Service History ── */}
              {tab === 'history' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Successful Services History</h2>
                    <SortDropdown currentSort={historySort} onSort={setHistorySort} options={['time', 'name', 'max_money', 'min_money']} />
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 24 }}>History of all previously delivered services to customers.</p>
 
                  {bookings.filter(b => b.status === 'completed').length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">✅</div>
                      <h3>No completed services yet</h3>
                      <p style={{ color: 'var(--gray-500)', marginTop: 8 }}>When you mark a booking as 'Completed', it will appear here.</p>
                    </div>
                  ) : (
                    sortItems(bookings.filter(b => b.status === 'completed'), historySort).map(bk => (
                      <div key={bk.id} className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '4px solid var(--green-500)', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                          
                          {/* Pet & Service Info */}
                          <div style={{ flex: '1 1 300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(52,211,153,.1)', color: 'var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✓</div>
                              <div>
                                <p style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Successfully Delivered</p>
                                <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                  {bk.pet_detail?.name} · <span style={{ color: 'var(--orange-400)' }}>{bk.service_detail?.name}</span>
                                </h3>
                              </div>
                            </div>
                            
                            <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', marginBottom: 8 }}>
                              Customer: <span style={{ color: 'var(--gray-200)', fontWeight: 600 }}>{bk.user_detail?.username}</span>
                            </p>
                            <p style={{ fontSize: '.85rem', color: 'var(--gray-500)' }}>
                              Served on: <span style={{ fontWeight: 500 }}>{formatDate(bk.start_date)} — {formatDate(bk.end_date)}</span>
                            </p>
                          </div>
 
                          {/* Billing & Receipt */}
                          <div style={{ textAlign: 'right', minWidth: 150 }}>
                            <p style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--gray-100)', marginBottom: 12 }}>{formatPrice(bk.total_price)}</p>
                            <div style={{ marginBottom: 12, fontSize: '.75rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>
                              Track ID: <span style={{ color: 'var(--gray-200)', userSelect: 'all' }}>{bk.tracking_id || bk.id}</span>
                            </div>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ width: '100%', justifyContent: 'center' }}
                              onClick={() => { setActiveBookingForReceipt(bk); setShowReceipt(true); }}
                            >
                               View Official Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}


              {/* ── Bootcamps ── */}
              {tab === 'bootcamps' && (
                <div>
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">Shelter Bootcamps</h2>
                      <p className="section-subtitle">Flash training, breeding, and vaccination events.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <SortDropdown currentSort={bootSort} onSort={setBootSort} options={['time', 'name']} />
                    <button className="btn btn-success btn-sm" onClick={() => setShowAddBootcamp(true)}>
                      <PlusCircle size={14} /> Launch Bootcamp
                    </button>
                    </div>
                  </div>
 
                  {bootcamps.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">🎓</div>
                      <h3>No bootcamps launched yet</h3>
                      <button onClick={() => setShowAddBootcamp(true)} className="btn btn-primary" style={{ marginTop: 16 }}>Launch your first event</button>
                    </div>
                  ) : (
                    <div className="grid-2">
                       {sortItems(bootcamps, bootSort).map(bc => (
                        <div key={bc.id} className="card" style={{ padding: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span className="badge badge-orange">{capitalize(bc.bootcamp_type)}</span>
                              <span className={`badge ${bc.is_paid ? 'badge-blue' : 'badge-green'}`}>
                                {bc.is_paid ? formatPrice(bc.price) : 'Free'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{formatDate(bc.start_date)}</span>
                              <button onClick={() => requestDeleteBootcamp(bc.id, bc.title)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--gray-500)' }} title="Delete Bootcamp">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>{bc.title}</h3>
                          <p style={{ color: 'var(--gray-400)', fontSize: '.85rem', marginBottom: 14 }}>📍 {bc.location}</p>
                          <p style={{ color: 'var(--gray-300)', fontSize: '.85rem', lineHeight: 1.6, marginBottom: 16 }}>{bc.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
                            <span>🏠 {bc.shelter_detail?.name}</span>
                            <span>• 👥 {bc.capacity - bc.available_seats} / {bc.capacity} Registered</span>
                          </div>
                          
                          {/* Live Countdown */}
                          <CountdownTimer targetDate={bc.start_date} />

                          <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                             <button 
                               onClick={() => handleBroadcast('bootcamp', bc.id)}
                               className="btn btn-secondary btn-sm"
                               style={{ flex: 1, gap: 8, justifyContent: 'center', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)', color: 'var(--blue-400)' }}
                               disabled={broadcastLoading}
                             >
                               <MessageSquare size={14} /> Message Participants
                             </button>
                             <button 
                               onClick={() => requestDeleteBootcamp(bc.id, bc.title)}
                               className="btn btn-danger btn-sm"
                               style={{ padding: '0 12px' }}
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                            ? <img src={pet.photo} alt={pet.name} className="pet-img" />
                            : <div className="pet-img-placeholder">{PET_EMOJI[pet.pet_type] || '🐾'}</div>
                          }
                          <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <h3 style={{ fontWeight: 700 }}>{pet.name}</h3>
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

              {/* ── Requests Sent ── */}
              {tab === 'requests' && (
                <div>
                  <div className="section-header">
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Requests Sent</h2>
                    <SortDropdown currentSort={reqSort} onSort={setReqSort} options={['time', 'name']} />
                  </div>
                  <p className="section-subtitle" style={{ marginBottom: 24 }}>Requests you sent to adopt or buy</p>

                  {adoptions.filter(a => a.requester === user?.id || a.requester_id === user?.id).length === 0
                    ? <div className="empty-state"><div className="empty-icon">📤</div><h3>You haven't sent any requests yet.</h3></div>
                    : sortItems(adoptions.filter(a => a.requester === user?.id || a.requester_id === user?.id), reqSort).map(r => (
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

              {/* ── Track Order ── */}
              {tab === 'track' && <TrackOrderPanel role="shelter_staff" />}

              {/* ── Doctor Appointments ── */}
              {tab === 'appointments' && (
                <div>
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">My Doctor Appointments</h2>
                      <p className="section-subtitle">{appointments.length} scheduled visits</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Link 
                        to="/veterinarians" 
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '0.85rem' }}
                        title="Book New Appointment"
                      >
                        <Plus size={16} /> Book Appointment
                      </Link>
                    </div>
                  </div>
                  {(!Array.isArray(appointments) || appointments.length === 0) ? (
                    <div className="empty-state">
                      <div className="empty-icon">📅</div>
                      <h3>No appointments yet</h3>
                      <p>Book a consultation with our verified doctors to see them here.</p>
                      <Link to="/veterinarians" className="btn btn-primary" style={{ marginTop: 20 }}>
                        Find a Doctor
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {Array.isArray(appointments) && appointments.map(appt => (
                        <div key={appt.id} className="card" style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                              <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', color: '#3b82f6' }}>
                                <Stethoscope size={24} />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Dr. {appt.doctor_name}</h4>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                                  <span className={`badge ${
                                    appt.status === 'confirmed' ? 'badge-green' : 
                                    appt.status === 'pending' ? 'badge-orange' : 
                                    appt.status === 'rejected' ? 'badge-red' : 
                                    'badge-gray'
                                  }`}>
                                    {appt.status_display}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={12} /> {formatDate(appt.appointment_date)}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={12} /> {appt.time_slot}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 4 }}>Pet: <strong style={{ color: 'var(--gray-200)' }}>{appt.pet_name}</strong></div>
                              {appt.status === 'completed' && (
                                <span className="badge badge-blue">Stay Healthy!</span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-400)', maxWidth: '70%', fontStyle: 'italic' }}>
                               "{appt.symptoms}"
                             </p>
                             <div style={{ display: 'flex', gap: 8 }}>
                               {appt.doctor_details && <button className="btn btn-ghost btn-sm" onClick={() => handleStartChat(appt.doctor)}><MessageCircle size={14} /> Chat</button>}
                               {appt.status === 'pending' && <button className="btn btn-red btn-sm" onClick={() => {
                                 setConfirmState({
                                   isOpen: true,
                                   title: 'Cancel Appointment',
                                   message: 'Are you sure you want to cancel this appointment request?',
                                   onConfirm: async () => {
                                     try {
                                        await api.delete(`/api/appointments/bookings/${appt.id}/`);
                                        setAppointments(prev => prev.filter(a => a.id !== appt.id));
                                        toast.success("Appointment cancelled");
                                        setConfirmState({ isOpen: false });
                                     } catch (err) { toast.error("Failed to cancel appointment"); }
                                   }
                                 });
                               }}><Trash2 size={14} /> Cancel</button>}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Add Shelter Modal ── */}
      {showAddShelter && (
        <div className="modal-overlay" onClick={() => setShowAddShelter(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingShelter ? 'Edit Shelter' : 'Register Shelter'}</h2>
              <button className="modal-close" onClick={() => { setShowAddShelter(false); setEditingShelter(null); }}>✕</button>
            </div>
            <form onSubmit={handleCreateShelter}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Shelter Name</label>
                  <input className="form-input" required value={shelterForm.name} onChange={e => setShelterForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location (City, Area)</label>
                  <input className="form-input" required value={shelterForm.location} onChange={e => setShelterForm(f => ({...f, location: e.target.value}))} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input className="form-input" required type="email" value={shelterForm.contact_email} onChange={e => setShelterForm(f => ({...f, contact_email: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" required value={shelterForm.phone} onChange={e => setShelterForm(f => ({...f, phone: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">bKash Number (Account for receiving payments)</label>
                  <input 
                    className="form-input" 
                    placeholder="e.g. 017XXXXXXXX"
                    value={shelterForm.bkash_number} 
                    onChange={e => setShelterForm(f => ({...f, bkash_number: e.target.value}))} 
                  />
                  <p style={{ fontSize: '.7rem', color: 'var(--gray-500)', marginTop: 4 }}>This number will be used for payment verification and displayed on receipts.</p>
                </div>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ marginTop: 10, justifyContent: 'center' }}>
                  {actionLoading ? <span className="spinner spinner-sm" /> : (editingShelter ? 'Update Shelter' : 'Register Shelter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Service Modal ── */}
      {showAddService && (
        <div className="modal-overlay" onClick={() => setShowAddService(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingService ? 'Edit Service' : 'Add Service'}</h2>
              <button className="modal-close" onClick={() => { setShowAddService(false); setEditingService(null); }}>✕</button>
            </div>
            <form onSubmit={handleAddService}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input className="form-input" required value={serviceForm.name} onChange={e => setServiceForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={serviceForm.service_type} onChange={e => setServiceForm(f => ({...f, service_type: e.target.value}))}>
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price</label>
                  <input className="form-input" type="number" step="0.01" required value={serviceForm.price} onChange={e => setServiceForm(f => ({...f, price: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Percentage (1-100%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input className="form-input" type="number" min="0" max="100" value={serviceForm.discount_percentage} onChange={e => setServiceForm(f => ({...f, discount_percentage: e.target.value}))} style={{ flex: 1 }} />
                    <span style={{ fontWeight: 700, color: 'var(--gray-400)' }}>%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Maximum Capacity (Per day/slot)</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    min="1" 
                    required 
                    value={serviceForm.capacity} 
                    onChange={e => setServiceForm(f => ({...f, capacity: e.target.value}))} 
                  />
                  <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginTop: 4 }}>How many pets can take this service at once?</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" required value={serviceForm.description} onChange={e => setServiceForm(f => ({...f, description: e.target.value}))} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ marginTop: 10, justifyContent: 'center' }}>
                  {actionLoading ? <span className="spinner spinner-sm" /> : (editingService ? 'Update Service' : 'Add Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Bootcamp Modal ── */}
      {showAddBootcamp && (
        <div className="modal-overlay" onClick={() => setShowAddBootcamp(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Launch Bootcamp</h2>
              <button className="modal-close" onClick={() => setShowAddBootcamp(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBootcamp}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" required placeholder="e.g. Master Dog Training" value={bootcampForm.title} onChange={e => setBootcampForm(f => ({...f, title: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Select Shelter</label>
                  <select className="form-select" required value={bootcampForm.shelter} onChange={e => setBootcampForm(f => ({...f, shelter: e.target.value}))}>
                    <option value="">-- Choose Shelter --</option>
                    {shelters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bootcamp Type</label>
                  <select className="form-select" value={bootcampForm.bootcamp_type} onChange={e => setBootcampForm(f => ({...f, bootcamp_type: e.target.value}))}>
                    <option value="training">Pet Training</option>
                    <option value="breeding">Breeding Program</option>
                    <option value="vaccination">Vaccination Drive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location (Bootcamp Site)</label>
                  <input className="form-input" required placeholder="e.g. Central Park West" value={bootcampForm.location} onChange={e => setBootcampForm(f => ({...f, location: e.target.value}))} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                    <label className="form-label">Start Date & Time</label>
                    <input className="form-input" type="datetime-local" required value={bootcampForm.start_date} onChange={e => setBootcampForm(f => ({...f, start_date: e.target.value}))} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                    <label className="form-label">End Date & Time</label>
                    <input className="form-input" type="datetime-local" required value={bootcampForm.end_date} onChange={e => setBootcampForm(f => ({...f, end_date: e.target.value}))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Event Type</label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9rem' }}>
                        <input type="radio" checked={!bootcampForm.is_paid} onChange={() => setBootcampForm(f => ({...f, is_paid: false, price: ''}))} />
                        Free
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9rem' }}>
                        <input type="radio" checked={bootcampForm.is_paid} onChange={() => setBootcampForm(f => ({...f, is_paid: true}))} />
                        Paid
                      </label>
                    </div>
                  </div>
                  {bootcampForm.is_paid && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Price (৳)</label>
                      <input 
                        className="form-input" 
                        type="number" 
                        step="0.01" 
                        required 
                        placeholder="0.00" 
                        value={bootcampForm.price} 
                        onChange={e => setBootcampForm(f => ({...f, price: e.target.value}))} 
                      />
                    </div>
                  )}
                  {!bootcampForm.is_paid && <div style={{ flex: 1 }} />}
                </div>

                <div className="form-group">
                  <label className="form-label">Max Participant Capacity</label>
                  <input 
                    className="form-input" 
                    type="number" 
                    min="1" 
                    required 
                    placeholder="e.g. 200" 
                    value={bootcampForm.capacity} 
                    onChange={e => setBootcampForm(f => ({...f, capacity: e.target.value}))} 
                  />
                  <p style={{ fontSize: '.7rem', color: 'var(--gray-500)', marginTop: 4 }}>Total number of seats available for this bootcamp.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" required placeholder="Details about this bootcamp…" value={bootcampForm.description} onChange={e => setBootcampForm(f => ({...f, description: e.target.value}))} />
                </div>
                <button type="submit" className="btn btn-success" disabled={actionLoading} style={{ marginTop: 10, justifyContent: 'center' }}>
                  {actionLoading ? <span className="spinner spinner-sm" /> : 'Launch Bootcamp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reviews Modal ── */}
      {showReviewsModal && (
        <div className="modal-overlay" onClick={() => setShowReviewsModal(false)}>
          <div className="modal-box" style={{ maxWidth: 650, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--gray-900)', zIndex: 10, paddingBottom: 16 }}>
              <div>
                <h2 className="modal-title">Public Reviews: {activeShelterForReviews?.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Star size={16} style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }} />
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{parseFloat(activeShelterForReviews?.rating_avg || 0).toFixed(1)}</span>
                  <span style={{ color: 'var(--gray-500)', fontSize: '.85rem' }}>({activeShelterForReviews?.total_reviews || 0} reviews)</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowReviewsModal(false)}>✕</button>
            </div>

            <div style={{ padding: '0 4px' }}>
              {reviewsLoading ? (
                <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
              ) : (
                <>
                  {shelterReviews.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <div className="empty-icon">⭐</div>
                      <h3>No reviews yet</h3>
                      <p>Your public profile doesn't have any reviews from users yet.</p>
                    </div>
                  ) : (
                    shelterReviews.map(r => {
                      const reviewer = r.user_detail || {}
                      const fullName = (reviewer.first_name || reviewer.last_name) 
                        ? `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() 
                        : reviewer.username || 'Anonymous User'
                      
                      return (
                        <div key={r.id} className="card" style={{ padding: 16, marginBottom: 12, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Link 
                              to={`/users/${reviewer.id}`} 
                              style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
                              className="reviewer-hover"
                            >
                              {reviewer.avatar ? (
                                <img 
                                  src={reviewer.avatar} 
                                  alt={fullName} 
                                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                                />
                              ) : (
                                <div className="avatar" style={{ width: 40, height: 40, fontSize: '.85rem', background: 'var(--gray-800)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  {reviewer.username?.slice(0, 2).toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--orange-400)' }}>{fullName}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <p style={{ color: 'var(--gray-500)', fontSize: '.75rem' }}>{formatDate(r.created_at)}</p>
                                  {reviewer.location && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--gray-500)', fontSize: '.75rem' }}>
                                      • <MapPin size={10} /> {reviewer.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                            <div style={{ display: 'flex', gap: 2 }}>
                               {[1,2,3,4,5].map(i => (
                                 <Star 
                                   key={i} 
                                   size={12} 
                                   style={{ 
                                     color: i <= r.rating ? 'var(--amber-400)' : 'var(--gray-700)',
                                     fill: i <= r.rating ? 'var(--amber-400)' : 'transparent'
                                   }} 
                                 />
                               ))}
                            </div>
                          </div>
                          {r.comment && <p style={{ color: 'var(--gray-300)', fontSize: '.9rem', lineHeight: 1.6, paddingLeft: 52 }}>{r.comment}</p>}
                        </div>
                      )
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}




      <ConfirmModal {...confirmState} onCancel={() => setConfirmState({ isOpen: false })} />
      {showReceipt && (
        <ReceiptModal 
          isOpen={showReceipt} 
          onClose={() => setShowReceipt(false)} 
          booking={activeBookingForReceipt}
        />
      )}
      <ReviewModal 
        isOpen={reviewModalOpen && reviewTarget?.role !== 'doctor'} 
        onClose={() => setReviewModalOpen(false)}
        targetUserId={reviewTarget}
        petName={reviewPetName}
      />

      <BroadcastModal 
        isOpen={broadcastModal.isOpen}
        onClose={() => setBroadcastModal(prev => ({ ...prev, isOpen: false }))}
        onSend={confirmBroadcast}
        type={broadcastModal.type}
        loading={broadcastLoading}
      />
    </div>
  )
}
