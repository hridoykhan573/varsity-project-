import { useState, useEffect } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, CalendarRange, CheckSquare } from 'lucide-react'
import { fetchBookingReport } from '../../../api/shelterApi'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  'Pending': '#f59e0b',
  'Confirmed': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Completed': '#10b981',
  'Cancelled': '#ef4444',
  'Rejected': '#f87171',
}

export default function ReportsBookings({ startDate, endDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchBookingReport({ start_date: startDate, end_date: endDate })
        setData(res.data)
      } catch {
        toast.error('Failed to load bookings report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  const exportCSV = () => {
    if (!data?.bookings?.length) return
    const headers = ['Customer', 'Service', 'Start Date', 'Status', 'Total Price']
    const rows = data.bookings.map(b => [b.customer, b.service_name, b.start_date, b.status, b.total_price])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
  if (!data) return null

  const filteredBookings = statusFilter
    ? data.bookings.filter(b => b.status === statusFilter)
    : data.bookings

  const uniqueStatuses = [...new Set(data.bookings.map(b => b.status))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f9731622', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}><CalendarRange size={22} /></div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{data.total_bookings}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Total Bookings</div>
          </div>
        </div>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#10b98122', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><CheckSquare size={22} /></div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{data.bookings.filter(b => b.status === 'Completed').length}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Line Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Booking Volume</h3>
          {data.chart_data.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="date" tick={{ fill: '#9494b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9494b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                <Line type="monotone" dataKey="bookings" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Status Breakdown</h3>
          {data.breakdown.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.breakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#8b5cf6'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Services */}
      {data.top_services.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Top Services</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.top_services.map((svc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, width: 200, flexShrink: 0 }}>{svc.name}</div>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${(svc.value / data.top_services[0].value) * 100}%`, height: '100%', background: 'var(--orange-500)', borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--orange-400)', width: 30, textAlign: 'right' }}>{svc.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking List */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>All Bookings</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              <option value="">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Download size={14} /> CSV</button>
          </div>
        </div>

        {filteredBookings.length === 0 ? <EmptyState /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Customer', 'Service', 'Start Date', 'Status', 'Amount'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--gray-400)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.customer}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{b.service_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{b.start_date}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: `${STATUS_COLORS[b.status] || '#8b5cf6'}22`, color: STATUS_COLORS[b.status] || '#a78bfa' }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--orange-400)' }}>৳{b.total_price.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state" style={{ padding: '30px 20px' }}>
      <div className="empty-icon">📊</div>
      <p>No data available for this period</p>
    </div>
  )
}
