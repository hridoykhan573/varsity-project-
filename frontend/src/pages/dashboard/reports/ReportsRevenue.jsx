import { useState, useEffect } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, TrendingUp, DollarSign } from 'lucide-react'
import { fetchRevenueReport } from '../../../api/shelterApi'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'

const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

export default function ReportsRevenue({ startDate, endDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchRevenueReport({ start_date: startDate, end_date: endDate })
        setData(res.data)
      } catch {
        toast.error('Failed to load revenue report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  const exportPDF = () => {
    if (!data) return
    const pdf = new jsPDF()
    pdf.setFontSize(18)
    pdf.text('Revenue Report', 14, 22)
    pdf.setFontSize(11)
    pdf.text(`Period: ${startDate} to ${endDate}`, 14, 32)
    pdf.text(`Total Revenue: ৳${data.total_revenue.toFixed(2)}`, 14, 42)
    pdf.save('revenue_report.pdf')
    toast.success('PDF exported!')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
  if (!data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#10b98122', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><TrendingUp size={22} /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color: '#10b981' }}>৳{Number(data.total_revenue).toLocaleString()}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Total Revenue</div>
          </div>
        </div>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f9731622', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}><DollarSign size={22} /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{data.chart_data.length}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Revenue Days</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Line Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Revenue Over Time</h3>
            <button className="btn btn-ghost btn-sm" onClick={exportPDF}><Download size={14} /> PDF</button>
          </div>
          {data.chart_data.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="date" tick={{ fill: '#9494b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9494b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
                  formatter={(val) => [`৳${val.toFixed(0)}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Revenue by Service</h3>
          {data.breakdown.length === 0 ? <EmptyState /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {data.breakdown.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
                    formatter={(val) => [`৳${val.toFixed(0)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {data.breakdown.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--gray-400)', flex: 1 }}>{item.name}</span>
                    <span style={{ fontWeight: 700 }}>৳{Number(item.value).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state" style={{ padding: '30px 20px' }}>
      <div className="empty-icon">💰</div>
      <p>No revenue data in this period</p>
    </div>
  )
}
