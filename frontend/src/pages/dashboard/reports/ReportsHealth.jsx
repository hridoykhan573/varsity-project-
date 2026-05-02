import { useState, useEffect } from 'react'
import { AlertTriangle, Heart, CheckCircle } from 'lucide-react'
import { fetchHealthReport } from '../../../api/shelterApi'
import toast from 'react-hot-toast'

export default function ReportsHealth() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchHealthReport()
        setData(res.data)
      } catch {
        toast.error('Failed to load health report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
  if (!data) return null

  const urgent = data.pets.filter(p => p.needs_urgent_care)
  const healthy = data.pets.filter(p => !p.needs_urgent_care)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#3b82f622', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}><Heart size={22} /></div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{data.total_pets}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Total Pets</div>
          </div>
        </div>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ef444422', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><AlertTriangle size={22} /></div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, color: data.urgent_care_count > 0 ? '#ef4444' : 'inherit' }}>{data.urgent_care_count}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Urgent Care Needed</div>
          </div>
        </div>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#10b98122', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><CheckCircle size={22} /></div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{healthy.length}</div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>Pets Healthy</div>
          </div>
        </div>
      </div>

      {/* Urgent Care Alert */}
      {urgent.length > 0 && (
        <div className="alert alert-error" style={{ borderRadius: 12, padding: 16 }}>
          <AlertTriangle size={18} />
          <span><strong>{urgent.length} pet(s)</strong> have overdue health check-up dates and require urgent attention!</span>
        </div>
      )}

      {/* Pet Health Table */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Pet Health Status</h3>
        {data.pets.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🐾</div><p>No pets found</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Pet Name', 'Type', 'Vaccinated', 'Last Record', 'Last Visit', 'Next Due Date', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--gray-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.pets.map((pet, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: pet.needs_urgent_care ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{pet.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{pet.type}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: pet.is_vaccinated ? '#10b981' : '#f87171', fontWeight: 700 }}>
                        {pet.is_vaccinated ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{pet.latest_record}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gray-400)' }}>{pet.last_visit || '—'}</td>
                    <td style={{ padding: '10px 12px', color: pet.needs_urgent_care ? '#f87171' : 'var(--orange-400)', fontWeight: 600 }}>
                      {pet.next_due_date || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {pet.needs_urgent_care
                        ? <span className="badge badge-red">⚠ Urgent</span>
                        : <span className="badge badge-green">Healthy</span>
                      }
                    </td>
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
