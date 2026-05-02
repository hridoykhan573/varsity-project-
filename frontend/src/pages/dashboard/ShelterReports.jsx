import { useState } from 'react'
import { BarChart2, HeartPulse, CalendarRange, TrendingUp, Download } from 'lucide-react'
import ReportsAdoptions from './reports/ReportsAdoptions'
import ReportsHealth from './reports/ReportsHealth'
import ReportsBookings from './reports/ReportsBookings'
import ReportsRevenue from './reports/ReportsRevenue'

const TABS = [
  { id: 'adoptions', label: 'Adoptions',     icon: <BarChart2 size={16} /> },
  { id: 'health',    label: 'Pet Health',     icon: <HeartPulse size={16} /> },
  { id: 'bookings',  label: 'Bookings',       icon: <CalendarRange size={16} /> },
  { id: 'revenue',   label: 'Revenue',        icon: <TrendingUp size={16} /> },
]

// Default: last 30 days
const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export default function ShelterReports() {
  const [activeTab, setActiveTab] = useState('adoptions')
  const [startDate, setStartDate] = useState(daysAgo(30))
  const [endDate, setEndDate] = useState(today())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, marginBottom: 6 }}>
            Reports & Analytics
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>
            Comprehensive insights into adoptions, health, bookings, and revenue.
          </p>
        </div>

        {/* Date Range Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gray-800)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 16px' }}>
          <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Date Range:</span>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--gray-100)', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--gray-600)' }}>→</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today()}
            onChange={e => setEndDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--gray-100)', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--gray-800)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 6 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === tab.id ? 'var(--orange-500)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--gray-400)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'adoptions' && <ReportsAdoptions startDate={startDate} endDate={endDate} />}
        {activeTab === 'health'    && <ReportsHealth />}
        {activeTab === 'bookings'  && <ReportsBookings startDate={startDate} endDate={endDate} />}
        {activeTab === 'revenue'   && <ReportsRevenue startDate={startDate} endDate={endDate} />}
      </div>
    </div>
  )
}
