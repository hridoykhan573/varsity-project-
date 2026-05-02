import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight,
  Calendar as CalIcon, MapPin, Clock, CalendarCheck, CalendarRange, XCircle
} from 'lucide-react'
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameMonth, isSameDay,
  setMonth as dfSetMonth, setYear as dfSetYear
} from 'date-fns'
import { getBootcamps, toggleCalendarMark } from '../../api/bootcampApi'
import { capitalize, formatPrice, errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import useNotificationStore from '../../store/notificationStore'

/* ── Constants ── */
const HOURS  = Array.from({ length: 24 }, (_, i) => i)
const GRID_H = 1440
const HR_H   = GRID_H / 24
const WD_LABELS = ['S','M','T','W','T','F','S']
const WD_FULL   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTHS_LIST = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const YEARS_LIST = Array.from({ length: 21 }, (_, i) => 2015 + i)
const PILL_CSS = {
  training:    'cal-mini-pill-training',
  breeding:    'cal-mini-pill-breeding',
  vaccination: 'cal-mini-pill-vaccination',
}
const PILL_HEX = {
  training:    '#38bdf8',
  breeding:    '#fbbf24',
  vaccination: '#4ade80',
  marked:      '#c084fc',
  default:     '#38bdf8',
}

/* ── Safe date parser ── */
const safeDate = (v) => {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export default function CalendarPage() {
  const { isAuthenticated } = useAuthStore()
  const [currentDate, setCurrent] = useState(new Date())
  const [viewMode,    setViewMode] = useState('month')
  const [bootcamps,   setBootcamps] = useState([])
  const [selectedDayBcs,  setSelDayBcs] = useState([])
  const [currentIndex,    setCurrIdx]   = useState(0)
  const currentBc = selectedDayBcs[currentIndex] || null

  const openModal = (targetBc, allBcsOnDay) => {
    setSelDayBcs(allBcsOnDay)
    const idx = allBcsOnDay.findIndex(b => b.id === targetBc.id)
    setCurrIdx(idx >= 0 ? idx : 0)
    setViewedIds(prev => [...new Set([...prev, ...allBcsOnDay.map(b => b.id)])])
  }
  const [viewedIds,   setViewedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('viewedBootcamps') || '[]') } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem('viewedBootcamps', JSON.stringify(viewedIds)) } catch {}
  }, [viewedIds])

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await getBootcamps()
        if (!cancelled) setBootcamps(Array.isArray(data) ? data : (data?.results ?? []))
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err))
      }
    })()

    // Real-time listener
    const listener = (type, data) => {
      if (type === 'BOOTCAMP_UPDATE') {
        const updateList = (prev) => prev.map(bc => bc.id === data.id ? { ...bc, ...data } : bc);
        setBootcamps(updateList);
        setSelectedDayBcs(updateList);
      }
    };
    useNotificationStore.getState().addSystemListener(listener);

    return () => { 
      cancelled = true;
      useNotificationStore.getState().removeSystemListener(listener);
    }
  }, [])   // fetch once; remove currentDate dep to avoid spam

  /* ── Navigation ── */
  const goNext = () => {
    if (viewMode === 'month')     setCurrent(d => addMonths(d, 1))
    else if (viewMode === 'week') setCurrent(d => addWeeks(d, 1))
    else                          setCurrent(d => addDays(d, 1))
  }
  const goPrev = () => {
    if (viewMode === 'month')     setCurrent(d => subMonths(d, 1))
    else if (viewMode === 'week') setCurrent(d => subWeeks(d, 1))
    else                          setCurrent(d => subDays(d, 1))
  }
  const goToday = () => setCurrent(new Date())

  /* ── Mark / unmark ── */
  const handleMark = async (id) => {
    if (!isAuthenticated) { toast.error('Please login to mark events!'); return }
    try {
      const { data } = await toggleCalendarMark(id)
      setBootcamps(prev => prev.map(bc => bc.id === id ? { ...bc, is_marked: data.is_marked } : bc))
      setSelDayBcs(prev => prev.map(bc => bc.id === id ? { ...bc, is_marked: data.is_marked } : bc))
      toast.success(data.is_marked ? 'Added to your calendar' : 'Removed from your calendar')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  /* ── Bootcamps on a given day ── */
  const bcsOnDay = (day) =>
    bootcamps.filter(bc => {
      const sd = safeDate(bc.start_date)
      return sd && isSameDay(sd, day)
    })

  /* ═══════════════════════════════════════════
     MONTH VIEW
     ═══════════════════════════════════════════ */
  const renderMonth = () => {
    const ms  = startOfMonth(currentDate)
    const ws  = startOfWeek(ms)
    const end = endOfWeek(endOfMonth(ms))
    const rows = []
    let cells  = []
    let d      = new Date(ws)

    while (d <= end) {
      for (let i = 0; i < 7; i++) {
        const dd       = new Date(d)
        const isThis   = isSameMonth(dd, ms)
        const isToday  = isSameDay(dd, new Date())
        const dayBcs   = bcsOnDay(dd)
        const hasUnrd  = dayBcs.some(bc => !viewedIds.includes(bc.id))

        cells.push(
          <div
            key={dd.toISOString()}
            className={`cal-minimal-cell ${hasUnrd ? 'active-blink' : ''}`}
            onClick={() => {
              if (dayBcs.length > 0) openModal(dayBcs[0], dayBcs)
            }}
          >
            <div className={`cal-minimal-date ${!isThis ? 'inactive' : ''} ${isToday ? 'today' : ''}`}>
              {format(dd, 'd')}
            </div>
            <div className="cal-pill-container">
              {dayBcs.map(bc => (
                <div
                  key={bc.id}
                  className={`cal-mini-pill ${bc.is_marked ? 'cal-mini-pill-marked' : (PILL_CSS[bc.bootcamp_type] || '')}`}
                  title={bc.title}
                  onClick={ev => { ev.stopPropagation(); openModal(bc, dayBcs) }}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        )
        d = addDays(d, 1)
      }
      rows.push(
        <div key={d.toISOString()} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells}
        </div>
      )
      cells = []
    }

    return (
      <div className="cal-minimal">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {WD_LABELS.map((l, i) => <div key={i} className="cal-minimal-weekday">{l}</div>)}
        </div>
        <div>{rows}</div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     TIME GRID (Week & Day)
     ═══════════════════════════════════════════ */
  const renderTimeGrid = (dayList) => (
    <div style={{
      display: 'flex', flex: 1,
      overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', minHeight: 420,
      background: 'var(--gray-900)', borderRadius: 16,
      border: '1px solid rgba(128,128,128,0.15)',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {/* Hour labels column */}
      <div style={{ width: 54, flexShrink: 0, borderRight: '1px solid rgba(128,128,128,0.15)' }}>
        <div style={{ height: 50 }} />
        {HOURS.map(h => (
          <div key={h} style={{
            height: HR_H, display: 'flex', alignItems: 'flex-start',
            paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end',
            fontSize: '.68rem', color: 'var(--gray-500)', fontWeight: 600,
            borderTop: h > 0 ? '1px solid rgba(128,128,128,0.1)' : 'none',
            boxSizing: 'border-box',
          }}>
            {h === 0 ? '' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
          </div>
        ))}
      </div>

      {/* Day columns */}
      {dayList.map(day => {
        const isToday = isSameDay(day, new Date())
        const dayBcs  = bcsOnDay(day)
        const hex = (bc) =>
          bc.is_marked ? PILL_HEX.marked : (PILL_HEX[bc.bootcamp_type] || PILL_HEX.default)

        return (
          <div key={day.toISOString()} style={{ flex: 1, minWidth: 0, borderRight: '1px solid rgba(128,128,128,0.1)' }}>
            {/* Column header */}
            <div style={{
              height: 50, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid rgba(128,128,128,0.15)',
              background: isToday ? 'rgba(239,68,68,0.08)' : 'transparent',
              position: 'sticky', top: 0, zIndex: 3,
            }}>
              <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '.04em' }}>
                {WD_FULL[day.getDay()]}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: isToday ? 800 : 700, color: isToday ? '#ef4444' : 'var(--gray-200)' }}>
                {day.getDate()}
              </span>
            </div>

            {/* Hour rows + events */}
            <div style={{ position: 'relative', height: GRID_H }}>
              {HOURS.map(h => (
                <div key={h} style={{
                  position: 'absolute', top: h * HR_H, left: 0, right: 0,
                  height: HR_H, borderTop: h > 0 ? '1px solid rgba(128,128,128,0.08)' : 'none',
                  boxSizing: 'border-box',
                }} />
              ))}

              {/* Now line */}
              {isToday && <NowLine gridH={GRID_H} />}

              {/* Event blocks */}
              {dayBcs.map((bc, idx) => {
                const sd = safeDate(bc.start_date)
                const ed = safeDate(bc.end_date)
                if (!sd || !ed) return null
                const startMin = sd.getHours() * 60 + sd.getMinutes()
                const endMin   = ed.getHours() * 60 + ed.getMinutes()
                const top    = (startMin / 1440) * GRID_H
                const height = Math.max(((endMin - startMin) / 1440) * GRID_H, 32)
                const count  = dayBcs.length
                const left   = count > 1 ? `${(idx / count) * 100}%` : '2px'
                const width  = count > 1 ? `calc(${100 / count}% - 3px)` : 'calc(100% - 4px)'
                const color  = hex(bc)

                return (
                  <div
                    key={bc.id}
                    onClick={ev => { ev.stopPropagation(); openModal(bc, dayBcs) }}
                    style={{
                      position: 'absolute', top, height, left, width,
                      background: `${color}18`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 6, padding: '3px 7px',
                      overflow: 'hidden', cursor: 'pointer', zIndex: 1,
                      transition: 'filter .15s', boxSizing: 'border-box',
                    }}
                    onMouseEnter={ev => ev.currentTarget.style.filter = 'brightness(1.25)'}
                    onMouseLeave={ev => ev.currentTarget.style.filter = 'none'}
                  >
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bc.title}
                    </div>
                    {height > 36 && (
                      <div style={{ fontSize: '.63rem', color, opacity: .75 }}>
                        {format(sd, 'h:mm a')} – {format(ed, 'h:mm a')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderWeek = () => {
    const ws = startOfWeek(currentDate)
    return renderTimeGrid(Array.from({ length: 7 }, (_, i) => addDays(ws, i)))
  }

  const renderDay = () => renderTimeGrid([currentDate])

  /* ── Header label for Day / Week ── */
  const headerLabel = () => {
    if (viewMode === 'day')  return format(currentDate, 'EEEE, MMMM d, yyyy')
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate), we = addDays(ws, 6)
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'MMM d')}–${format(we, 'd, yyyy')}`
        : `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
    }
    return null
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ background: 'var(--gray-950)', minHeight: '100vh', paddingBottom: 60 }}>

      {/* ── Page Header ── */}
      <div className="container" style={{ paddingTop: 60, paddingBottom: 32 }}>

        {/* Big month dropdown */}
        {viewMode === 'month' && (
          <div style={{ display: 'inline-block' }}>
            <select
              className="cal-header-select cal-minimal-header"
              value={currentDate.getMonth()}
              onChange={ev => setCurrent(d => dfSetMonth(d, parseInt(ev.target.value)))}
              style={{ padding: '0 20px 0 0', height: 'auto' }}
            >
              {MONTHS_LIST.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
        )}

        {/* Day / Week text header */}
        {viewMode !== 'month' && (
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gray-50)', letterSpacing: '-.03em', marginBottom: 4 }}>
            {headerLabel()}
          </h2>
        )}

        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>

          {/* Left: year + event count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {viewMode === 'month' && (
              <select
                className="cal-header-select cal-year-select"
                value={currentDate.getFullYear()}
                onChange={ev => setCurrent(d => dfSetYear(d, parseInt(ev.target.value)))}
              >
                {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            <p style={{ fontSize: '1.1rem', color: 'var(--gray-400)', fontWeight: 500, margin: 0 }}>
              {viewMode === 'month' && '• '}{bootcamps.length} Community Events
            </p>
          </div>

          {/* Right: mode switcher + nav */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

            {/* Day / Week / Month switcher */}
            <div style={{ display: 'flex', background: 'var(--gray-850)', borderRadius: 12, padding: 4, gap: 2 }}>
              {['Day', 'Week', 'Month'].map(m => {
                const active = viewMode === m.toLowerCase()
                return (
                  <button
                    key={m}
                    onClick={() => setViewMode(m.toLowerCase())}
                    style={{
                      padding: '8px 16px', borderRadius: 9, border: 'none',
                      fontWeight: 600, fontSize: '.85rem', cursor: 'pointer',
                      background: active ? 'var(--gray-800)' : 'transparent',
                      color:      active ? 'var(--orange-400)' : 'var(--gray-400)',
                      boxShadow:  active ? 'var(--shadow-sm)' : 'none',
                      transition: 'all .2s',
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>

            {/* Prev / Today / Next */}
            <div style={{ display: 'flex', background: 'var(--gray-850)', borderRadius: 12, padding: 4 }}>
              <button className="btn btn-secondary" onClick={goPrev} style={{ padding: '8px 12px', background: 'transparent' }}>
                <ChevronLeft size={20} />
              </button>
              <button className="btn btn-secondary" onClick={goToday} style={{ padding: '8px 16px', background: 'transparent', fontWeight: 700 }}>
                Today
              </button>
              <button className="btn btn-secondary" onClick={goNext} style={{ padding: '8px 12px', background: 'transparent' }}>
                <ChevronRight size={20} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Calendar body ── */}
      <div className="container">
        {viewMode === 'month' && renderMonth()}
        {viewMode === 'week'  && renderWeek()}
        {viewMode === 'day'   && renderDay()}

        {/* Legend */}
        {viewMode === 'month' && (
          <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            {['Training','Breeding','Vaccination'].map(label => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', color: '#94a3b8' }}>
                <div className={`cal-mini-pill cal-mini-pill-${label.toLowerCase()}`} /> {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {currentBc && (
        <div className="modal-overlay" onClick={() => setSelDayBcs([])}>
          <div className="modal-box" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <span className="badge badge-orange">{capitalize(currentBc.bootcamp_type)}</span>
              <button className="modal-close" onClick={() => setSelDayBcs([])}>✕</button>
            </div>
            <div style={{ marginTop: -10 }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>{currentBc.title}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-300)' }}>
                  <MapPin size={18} style={{ color: 'var(--orange-500)' }} />
                  <span style={{ fontSize: '.95rem' }}>{currentBc.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-300)' }}>
                  <Clock size={18} style={{ color: 'var(--orange-500)' }} />
                  <span style={{ fontSize: '.95rem' }}>
                    {safeDate(currentBc.start_date) ? format(safeDate(currentBc.start_date), 'MMM d, h:mm a') : '—'}
                    {' — '}
                    {safeDate(currentBc.end_date)   ? format(safeDate(currentBc.end_date),   'h:mm a')        : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-300)' }}>
                  <CalIcon size={18} style={{ color: 'var(--orange-500)' }} />
                  <span style={{ fontSize: '.95rem' }}>Organized by <strong>{currentBc.shelter_detail?.name}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-300)' }}>
                  <div style={{ width: 18, textAlign: 'center', fontWeight: 900, color: 'var(--orange-500)', fontSize: '1rem' }}>৳</div>
                  <span style={{ fontSize: '.95rem' }}>
                    Cost: <strong style={{ color: currentBc.is_paid ? 'var(--blue-400)' : 'var(--green-400)' }}>
                      {currentBc.is_paid ? formatPrice(currentBc.price) : 'Free'}
                    </strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-300)' }}>
                  <div style={{ width: 18, textAlign: 'center', fontWeight: 900, color: 'var(--orange-500)', fontSize: '.8rem' }}>👥</div>
                  <span style={{ fontSize: '.95rem' }}>
                    Registration: <strong style={{ color: currentBc.available_seats > 0 ? 'var(--green-400)' : 'var(--red-400)' }}>
                      {currentBc.capacity - currentBc.available_seats} / {currentBc.capacity} seats filled
                    </strong>
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                <p style={{ fontSize: '.9rem', color: 'var(--gray-200)', lineHeight: 1.6 }}>{currentBc.description}</p>
              </div>

              {/* Navigation Bar */}
              {selectedDayBcs.length > 1 && (
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: 20
                }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    disabled={currentIndex === 0}
                    onClick={() => setCurrIdx(i => Math.max(0, i - 1))}
                    style={{ padding: '4px', opacity: currentIndex === 0 ? .3 : 1 }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <span style={{ fontSize: '.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                    Event {currentIndex + 1} of {selectedDayBcs.length}
                  </span>

                  <button 
                    className="btn btn-ghost btn-sm" 
                    disabled={currentIndex === selectedDayBcs.length - 1}
                    onClick={() => setCurrIdx(i => Math.min(selectedDayBcs.length - 1, i + 1))}
                    style={{ padding: '4px', opacity: currentIndex === selectedDayBcs.length - 1 ? .3 : 1 }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}

              <button
                className={`btn ${currentBc.is_marked ? 'btn-secondary' : (currentBc.available_seats > 0 ? 'btn-primary' : 'btn-danger')}`}
                style={{ width: '100%', justifyContent: 'center', gap: 10, opacity: (!currentBc.is_marked && (currentBc.available_seats <= 0 || currentBc.booking_status === 'pending')) ? 0.7 : 1 }}
                onClick={() => {
                  if (currentBc.is_marked) { handleMark(currentBc.id); return; }
                  if (currentBc.available_seats <= 0 || currentBc.booking_status === 'pending') return;
                  handleMark(currentBc.id);
                }}
                disabled={!currentBc.is_marked && (currentBc.available_seats <= 0 || currentBc.booking_status === 'pending')}
              >
                {currentBc.is_marked
                  ? <><CalendarCheck size={18} /> Marked on your Calendar</>
                  : currentBc.booking_status === 'pending'
                    ? <><Clock size={18} /> Requested (Pending Approval)</>
                    : currentBc.available_seats > 0 
                      ? <><CalendarRange size={18}  /> Request Booking</>
                      : <><XCircle size={18} /> FULLY BOOKED 🔴</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-component: current time bar ── */
function NowLine({ gridH }) {
  const now = new Date()
  const top = ((now.getHours() * 60 + now.getMinutes()) / 1440) * gridH
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, height: 2, background: '#ef4444', zIndex: 2 }}>
      <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
    </div>
  )
}
