import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Users, CalendarCheck } from 'lucide-react'
import { fetchAdoptionReport } from '../../../api/shelterApi'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import { toJpeg } from 'html-to-image'

export default function ReportsAdoptions({ startDate, endDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const reportRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchAdoptionReport({ start_date: startDate, end_date: endDate })
        setData(res.data)
      } catch {
        toast.error('Failed to load adoption report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  const exportPDF = async () => {
    if (!reportRef.current) return
    toast.loading('Generating PDF...')
    try {
      const imgData = await toJpeg(reportRef.current, { quality: 0.95, backgroundColor: '#1a1a2e' })
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [reportRef.current.offsetWidth, reportRef.current.offsetHeight + 40] })
      pdf.addImage(imgData, 'JPEG', 0, 40, reportRef.current.offsetWidth, reportRef.current.offsetHeight)
      pdf.save('adoption_report.pdf')
      toast.dismiss()
      toast.success('PDF exported!')
    } catch {
      toast.dismiss()
      toast.error('Export failed')
    }
  }

  const exportCSV = () => {
    if (!data?.adoptions?.length) return
    const headers = ['Pet Name', 'Breed', 'Age (months)', 'Adopter Name', 'Adopter Email', 'Adoption Date']
    const rows = data.adoptions.map(a => [a.pet_name, a.pet_breed, a.pet_age, a.adopter_name, a.adopter_email, a.date])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'adoptions.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported!')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  if (!data) return null

  return (
    <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <StatCard icon={<CalendarCheck size={22} />} label="Total Adoptions" value={data.total_adoptions} color="#f97316" />
        <StatCard icon={<Users size={22} />} label="Unique Adopters" value={new Set(data.adoptions.map(a => a.adopter_email)).size} color="#3b82f6" />
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Adoptions Over Time</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={exportPDF}><Download size={14} /> PDF</button>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}><Download size={14} /> CSV</button>
          </div>
        </div>
        {data.chart_data.length === 0 ? (
          <EmptyState message="No adoption data in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.chart_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="date" tick={{ fill: '#9494b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9494b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
              <Bar dataKey="adoptions" fill="#f97316" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Adopted Pets</h3>
        {data.adoptions.length === 0 ? <EmptyState message="No adoptions in this date range" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Pet Name', 'Breed', 'Age', 'Adopter', 'Email', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--gray-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.adoptions.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{a.pet_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{a.pet_breed || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{a.pet_age}mo</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.adopter_name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{a.adopter_email}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--orange-400)', fontWeight: 600 }}>{a.date}</td>
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

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
        <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="empty-state" style={{ padding: '40px 20px' }}>
      <div className="empty-icon">🐾</div>
      <p>{message}</p>
    </div>
  )
}
