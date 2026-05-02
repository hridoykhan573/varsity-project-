export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatFullDateTime(d) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

export function formatPrice(price, currency = '৳') {
  if (price === null || price === undefined || price === '') return 'Free'
  if (Number(price) === 0) return 'Free'
  try {
    const formatted = Number(price).toLocaleString('en-IN', { maximumFractionDigits: 0 })
    return `${currency}${formatted}`
  } catch (e) {
    return `${currency}${price}`
  }
}

export function ageLabel(months) {
  if (!months && months !== 0) return '—'
  if (months < 12) return `${months} mo`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y}y ${m}mo` : `${y} yr${y > 1 ? 's' : ''}`
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

export function errorMessage(err) {
  const data = err?.response?.data
  if (!data) return 'Something went wrong. Please try again.'
  if (typeof data === 'string') return data
  
  const messages = []
  for (const [key, value] of Object.entries(data)) {
    const v = Array.isArray(value) ? value.join(', ') : value
    // Skip technical keys as prefixes
    if (key === 'non_field_errors' || key === 'detail' || key === 'error') {
      messages.push(v)
    } else {
      messages.push(`${capitalize(key)}: ${v}`)
    }
  }
  return messages.length > 0 ? messages.join(' | ') : 'An unexpected error occurred.'
}

/** Platform / system alerts (vaccination, payments, shop orders) — distinct UI color from adoption & booking. */
const SYSTEM_NOTIFICATION_TYPES = new Set([
  'system',
  'vaccine_reminder',
  'payment_received',
  'order_deleted',
  'admin_message',
  'co_admin_message',
])

export function isSystemNotification(n) {
  return Boolean(n?.notification_type && SYSTEM_NOTIFICATION_TYPES.has(n.notification_type))
}

/** Full-width notification cards (dashboard). */
export function getNotificationCardStyle(n) {
  const sys = isSystemNotification(n)
  const read = n.is_read
  if (sys) {
    return {
      padding: '16px 20px',
      marginBottom: 10,
      borderRadius: 'var(--radius-lg)',
      cursor: 'pointer',
      transition: 'var(--transition)',
      display: 'flex',
      flexDirection: 'column',
      background: read ? 'rgba(15, 118, 110, 0.1)' : 'rgba(16, 185, 129, 0.14)',
      border: read ? '1px solid rgba(45, 212, 191, 0.22)' : '1px solid rgba(45, 212, 191, 0.38)',
    }
  }
  return {
    padding: '16px 20px',
    marginBottom: 10,
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'var(--transition)',
    display: 'flex',
    flexDirection: 'column',
    background: read ? 'var(--gray-800)' : 'rgba(249,115,22,.07)',
    border: read ? '1px solid rgba(128,128,128,.1)' : '1px solid rgba(249,115,22,.2)',
  }
}

/** Compact rows (navbar dropdown). */
export function getNavbarNotificationRowStyle(n) {
  const sys = isSystemNotification(n)
  const read = n.is_read
  if (sys) {
    return {
      padding: '10px 12px',
      cursor: 'pointer',
      background: read ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.12)',
      borderBottom: '1px solid rgba(128,128,128,.08)',
      borderLeft: '3px solid rgba(16, 185, 129, 0.55)',
    }
  }
  return {
    padding: '10px 12px',
    cursor: 'pointer',
    background: read ? 'transparent' : 'rgba(249,115,22,.06)',
    borderBottom: '1px solid rgba(128,128,128,.08)',
    borderLeft: '3px solid rgba(249, 115, 22, 0.45)',
  }
}
