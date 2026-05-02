import { useState, useEffect, useRef } from 'react'
import { Search, Package, MapPin, Calendar, CreditCard, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'
import { trackOrder } from '../../api/bookingApi'
import useNotificationStore from '../../store/notificationStore'
import { capitalize, formatDate, formatFullDateTime, formatPrice, errorMessage } from '../../utils/helpers'
import { STATUS_BADGE } from '../../utils/constants'
import toast from 'react-hot-toast'

/* ── Progress bar step definitions ── */
const STEPS = [
  { key: 'pending',    label: 'Pending',     icon: Clock,        color: 'var(--orange-400)' },
  { key: 'confirmed',  label: 'Confirmed',   icon: CheckCircle,  color: '#60a5fa' },
  { key: 'in_progress',label: 'In Progress', icon: RefreshCw,    color: '#c084fc' },
  { key: 'completed',  label: 'Completed',   icon: CheckCircle,  color: '#34d399' },
]
const CANCELLED_STATUSES = ['cancelled', 'rejected']

function getStepIndex(status) {
  if (CANCELLED_STATUSES.includes(status)) return -1
  return STEPS.findIndex(s => s.key === status)
}

/* ── Status icon helper ── */
function StatusIcon({ status, size = 16 }) {
  if (status === 'completed') return <CheckCircle size={size} color="#34d399" />
  if (CANCELLED_STATUSES.includes(status)) return <XCircle size={size} color="#f87171" />
  if (status === 'in_progress') return <RefreshCw size={size} color="#c084fc" />
  if (status === 'confirmed') return <CheckCircle size={size} color="#60a5fa" />
  return <Clock size={size} color="var(--orange-400)" />
}

/* ── Progress bar component ── */
function OrderProgressBar({ status }) {
  const stepIndex = getStepIndex(status)
  const isCancelled = CANCELLED_STATUSES.includes(status)

  if (isCancelled) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          background: 'rgba(239,68,68,.08)',
          border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 12,
        }}>
          <XCircle size={18} color="#f87171" />
          <span style={{ color: '#f87171', fontWeight: 700, fontSize: '.9rem' }}>
            Order {capitalize(status)}
          </span>
          <span style={{ color: 'var(--gray-500)', fontSize: '.8rem', marginLeft: 4 }}>
            — This order is no longer active.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
        Order Progress
      </p>

      {/* Track line + nodes */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Background line */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 3,
          background: 'rgba(128,128,128,.15)', borderRadius: 4, transform: 'translateY(-50%)',
        }} />
        {/* Progress fill */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, height: 3,
          width: `${(stepIndex / (STEPS.length - 1)) * 100}%`,
          background: 'linear-gradient(90deg, var(--orange-500), #c084fc)',
          borderRadius: 4, transform: 'translateY(-50%)',
          transition: 'width .6s cubic-bezier(.4,0,.2,1)',
        }} />

        {/* Step nodes */}
        {STEPS.map((step, i) => {
          const done   = i < stepIndex
          const active = i === stepIndex
          const Icon   = step.icon
          return (
            <div key={step.key}
              style={{
                position: 'relative', zIndex: 1,
                flex: i < STEPS.length - 1 ? 1 : 0,
                display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === STEPS.length - 1 ? 'flex-end' : 'center',
              }}
            >
              {/* Circle node */}
              <div style={{
                width: active ? 36 : 28,
                height: active ? 36 : 28,
                borderRadius: '50%',
                background: done
                  ? 'linear-gradient(135deg, var(--orange-500), #f97316)'
                  : active
                    ? 'linear-gradient(135deg, var(--orange-400), #c084fc)'
                    : 'var(--gray-800)',
                border: active
                  ? '3px solid rgba(249,115,22,.5)'
                  : done
                    ? '2px solid var(--orange-500)'
                    : '2px solid rgba(128,128,128,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 0 16px rgba(249,115,22,.4)' : 'none',
                transition: 'all .4s ease',
              }}>
                <Icon size={active ? 16 : 12} color={done || active ? '#fff' : 'var(--gray-600)'} />
              </div>

              {/* Label */}
              <span style={{
                marginTop: 8,
                fontSize: '.75rem',
                fontWeight: active ? 700 : done ? 600 : 400,
                color: active ? 'var(--orange-400)' : done ? 'var(--gray-300)' : 'var(--gray-600)',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Timeline event ── */
function TimelineItem({ icon: Icon, label, time, color, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
      {!isLast && (
        <div style={{
          position: 'absolute', left: 14, top: 28, width: 1,
          height: 'calc(100% + 4px)',
          background: 'rgba(128,128,128,.15)',
        }} />
      )}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: `rgba(${color},0.12)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1,
      }}>
        <Icon size={13} style={{ color: `rgb(${color})` }} />
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 20 }}>
        <p style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--gray-200)', marginBottom: 2 }}>{label}</p>
        {time && <p style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{time}</p>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════ */
export default function TrackOrderPanel() {
  const [inputId, setInputId]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [booking, setBooking]     = useState(null)
  const [error, setError]         = useState('')
  const inputRef                  = useRef(null)

  /* Auto-focus input on mount */
  useEffect(() => { inputRef.current?.focus() }, [])

  /* Real-time WebSocket listener */
  useEffect(() => {
    if (!booking) return
    const listener = (type, data) => {
      if (type === 'BOOKING_UPDATE' && data.tracking_id === booking.tracking_id) {
        setBooking(data)
        toast.success(`Order #${data.tracking_id} updated → ${capitalize(data.status)}`, { icon: '📦' })
      }
    }
    useNotificationStore.getState().addSystemListener(listener)
    return () => useNotificationStore.getState().removeSystemListener(listener)
  }, [booking?.tracking_id])

  const handleTrack = async (e) => {
    e?.preventDefault()
    const trimmed = inputId.trim()
    if (!trimmed) {
      setError('Please enter an Order ID.')
      return
    }
    setLoading(true)
    setError('')
    setBooking(null)
    try {
      const { data } = await trackOrder(trimmed)
      setBooking(data)
    } catch (err) {
      const msg = err?.response?.data?.detail || errorMessage(err) || 'Something went wrong.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  /* ─ Derived booking data ─ */
  const bk = booking
  const isBootcamp = bk?.bootcamp != null
  const itemName   = isBootcamp
    ? bk?.bootcamp_detail?.title
    : bk?.service_detail?.name || 'N/A'
  const petName    = isBootcamp ? null : bk?.pet_detail?.name

  /* Build timeline events */
  const timeline = bk ? [
    { icon: Package,      label: 'Order Placed',       time: formatFullDateTime(bk.created_at), color: '249,115,22' },
    bk.status !== 'pending' && {
      icon: CheckCircle, label: 'Order Confirmed',     time: formatFullDateTime(bk.updated_at), color: '96,165,250'
    },
    ['in_progress','completed'].includes(bk.status) && {
      icon: RefreshCw,   label: 'Service In Progress', time: formatDate(bk.start_date),         color: '192,132,252'
    },
    bk.status === 'completed' && {
      icon: CheckCircle, label: 'Service Completed',   time: formatDate(bk.end_date),           color: '52,211,153'
    },
    CANCELLED_STATUSES.includes(bk.status) && {
      icon: XCircle,     label: `Order ${capitalize(bk.status)}`, time: formatFullDateTime(bk.updated_at), color: '248,113,113'
    },
  ].filter(Boolean) : []

  return (
    <div>
      {/* Section header */}
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="section-title">Track Order</h2>
          <p className="section-subtitle">
            To track your order, enter your Order ID below and press "Track."
          </p>
        </div>
      </div>

      {/* ── Search form ── */}
      <form onSubmit={handleTrack}
        style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32,
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(249,115,22,.06), rgba(192,132,252,.04))',
          border: '1px solid rgba(249,115,22,.15)',
          borderRadius: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--gray-500)', pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            id="track-order-input"
            type="text"
            value={inputId}
            onChange={e => { setInputId(e.target.value); setError('') }}
            placeholder="Enter Order ID (e.g. 42)"
            style={{
              width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              background: 'var(--gray-800)', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 10, color: 'var(--gray-100)', fontSize: '.9rem',
              outline: 'none', transition: 'border-color .2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--orange-500)')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,.08)')}
          />
        </div>
        <button
          id="track-order-btn"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ minWidth: 120, justifyContent: 'center' }}
        >
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="spinner" style={{ width: 16, height: 16 }} /> Tracking…</span>
            : <><Search size={14} /> Track</>
          }
        </button>
      </form>

      {/* ── Error state ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '16px 20px',
          background: 'rgba(239,68,68,.07)',
          border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 14, marginBottom: 24,
        }}>
          <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 700, color: '#f87171', fontSize: '.9rem', marginBottom: 2 }}>Order Not Found</p>
            <p style={{ color: 'var(--gray-400)', fontSize: '.85rem' }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !booking && (
        <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
          <p style={{ color: 'var(--gray-500)', fontSize: '.9rem' }}>Fetching order details…</p>
        </div>
      )}

      {/* ══ Order detail card ══ */}
      {bk && !loading && (
        <div style={{ animation: 'slideUp .35s ease' }}>

          {/* Header card */}
          <div style={{
            padding: '24px 28px',
            background: 'var(--gray-800)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 18, marginBottom: 20,
            borderTop: `4px solid ${
              CANCELLED_STATUSES.includes(bk.status) ? '#f87171'
              : bk.status === 'completed' ? '#34d399'
              : 'var(--orange-500)'
            }`,
          }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Package size={20} color="var(--orange-400)" />
                  <h3 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-100)' }}>
                    Order #{bk.tracking_id || bk.id}
                  </h3>
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>
                  Placed on {formatDate(bk.created_at, true)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge ${STATUS_BADGE[bk.status]}`} style={{ padding: '6px 14px', fontSize: '.8rem' }}>
                  <StatusIcon status={bk.status} size={12} />
                  <span style={{ marginLeft: 5 }}>{capitalize(bk.status)}</span>
                </span>
                <span className={`badge ${bk.payment_status === 'paid' ? 'badge-green' : 'badge-yellow'}`} style={{ padding: '6px 14px', fontSize: '.8rem' }}>
                  {bk.payment_status === 'paid' ? '✓ Paid' : capitalize(bk.payment_status)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <OrderProgressBar status={bk.status} />

            {/* Two-column details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { icon: Package,    label: isBootcamp ? 'Bootcamp' : 'Service', value: itemName },
                petName && { icon: '🐾', label: 'Pet',     value: petName },
                { icon: MapPin,     label: 'Shelter',       value: bk.shelter_detail?.name || `#${bk.shelter}` },
                { icon: MapPin,     label: 'Location',      value: bk.shelter_detail?.location || '—' },
                { icon: Calendar,   label: 'Start Date',    value: formatDate(bk.start_date) },
                { icon: Calendar,   label: 'End Date',      value: formatDate(bk.end_date) },
                { icon: Clock,      label: 'Duration',      value: `${bk.duration_days} day${bk.duration_days !== 1 ? 's' : ''}` },
                { icon: CreditCard, label: 'Total Amount',  value: formatPrice(bk.total_price) },
              ].filter(Boolean).map((item, i) => {
                const IconComp = typeof item.icon === 'string' ? null : item.icon
                return (
                  <div key={i} style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,.03)',
                    border: '1px solid rgba(255,255,255,.05)',
                    borderRadius: 12,
                  }}>
                    <p style={{ fontSize: '.73rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {IconComp ? <IconComp size={12} /> : item.icon} {item.label}
                    </p>
                    <p style={{ fontWeight: 700, color: 'var(--gray-100)', fontSize: '.95rem' }}>{item.value || '—'}</p>
                  </div>
                )
              })}
            </div>

            {/* Special instructions */}
            {bk.special_instructions && (
              <div style={{
                marginTop: 20, padding: '12px 16px',
                background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.1)',
                borderRadius: 10,
              }}>
                <p style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--amber-400)', marginBottom: 4 }}>📝 Special Instructions</p>
                <p style={{ fontSize: '.85rem', color: 'var(--gray-300)', lineHeight: 1.6 }}>{bk.special_instructions}</p>
              </div>
            )}

            {/* Shelter notes */}
            {bk.shelter_notes && (
              <div style={{
                marginTop: 12, padding: '12px 16px',
                background: 'rgba(96,165,250,.05)', border: '1px solid rgba(96,165,250,.1)',
                borderRadius: 10,
              }}>
                <p style={{ fontSize: '.8rem', fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>🏠 Shelter Notes</p>
                <p style={{ fontSize: '.85rem', color: 'var(--gray-300)', lineHeight: 1.6 }}>{bk.shelter_notes}</p>
              </div>
            )}
          </div>

          {/* ── Payment info card ── */}
          {bk.latest_payment && (
            <div style={{
              padding: '20px 24px',
              background: 'var(--gray-800)',
              border: '1px solid rgba(52,211,153,.15)',
              borderRadius: 16, marginBottom: 20,
            }}>
              <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
                Payment Details
              </p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginBottom: 3 }}>Method</p>
                  <p style={{ fontWeight: 700, color: 'var(--gray-100)' }}>{capitalize(bk.latest_payment.method)}</p>
                </div>
                {bk.latest_payment.transaction_id && (
                  <div>
                    <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginBottom: 3 }}>Transaction ID</p>
                    <p style={{ fontWeight: 600, color: '#34d399', fontSize: '.85rem', fontFamily: 'monospace' }}>
                      {bk.latest_payment.transaction_id}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '.75rem', color: 'var(--gray-500)', marginBottom: 3 }}>Paid On</p>
                  <p style={{ fontWeight: 600, color: 'var(--gray-200)', fontSize: '.85rem' }}>
                    {formatFullDateTime(bk.latest_payment.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Order timeline card ── */}
          <div style={{
            padding: '20px 24px',
            background: 'var(--gray-800)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 16,
          }}>
            <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 20 }}>
              Order Timeline
            </p>
            <div>
              {timeline.map((item, i) => (
                <TimelineItem
                  key={i}
                  icon={item.icon}
                  label={item.label}
                  time={item.time}
                  color={item.color}
                  isLast={i === timeline.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Track another */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setBooking(null); setInputId(''); setError(''); inputRef.current?.focus() }}
              style={{ color: 'var(--gray-400)' }}
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
              Track a different order
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
