import { useState, useEffect } from 'react'
import { X, Search, User, Mail, Calendar, CheckCircle, Clock, ExternalLink, ChevronDown, ChevronUp, FileText, Zap } from 'lucide-react'
import api from '../../api/axiosInstance'
import toast from 'react-hot-toast'

export default function TotalPatientsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/vet/patients/')
      setPatients(data.patients || [])
    } catch (err) {
      toast.error('Failed to load patient records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchPatients()
    }
  }, [isOpen])

  if (!isOpen) return null

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'rgba(2, 6, 23, 0.7)',
      backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'var(--gray-800)', width: '100%', maxWidth: '1000px',
        maxHeight: '90vh', borderRadius: '28px', border: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to right, rgba(255,255,255,0.02), transparent)'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-100)',
              letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12
            }}>
              <User size={28} color="#3b82f6" />
              Patient Management
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Viewing {filteredPatients.length} unique patients in your medical network.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px',
            padding: '10px', color: '#94a3b8', cursor: 'pointer', transition: '0.2s'
          }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
             onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '20px 32px', background: 'var(--gray-900)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', background: 'var(--gray-800)', border: '1px solid var(--border-color)',
                borderRadius: '14px', padding: '12px 12px 12px 42px', color: 'var(--gray-100)', fontSize: '0.9rem',
                outline: 'none', transition: '0.2s'
              }}
            />
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 32px 32px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 60, color: '#64748b' }}>
              <div className="loader" style={{ marginBottom: 16 }} />
              <p>Fetching clinical records...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
               <User size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
               <p>No patients found matching your search.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredPatients.map(patient => (
                <div key={patient.id} style={{
                  background: 'var(--gray-900)', border: '1px solid var(--border-color)',
                  borderRadius: '18px', overflow: 'hidden', transition: '0.3s'
                }}>
                  {/* Patient Row */}
                  <div 
                    onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
                    style={{
                      padding: '20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                      transition: '0.2s', borderBottom: expandedId === patient.id ? '1px solid var(--border-color)' : 'none'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ 
                      width: 48, height: 48, borderRadius: '14px', background: '#1e293b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {patient.avatar ? <img src={patient.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="#3b82f6" />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: 'var(--gray-100)', fontSize: '1rem', fontWeight: 700 }}>{patient.full_name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                         <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                           <Mail size={14} /> {patient.email}
                         </span>
                         <span style={{ 
                           fontSize: '0.75rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                           padding: '2px 8px', borderRadius: '6px', fontWeight: 600
                         }}>
                           {patient.service_count} Services
                         </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginRight: 16 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Activity</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-100)', fontWeight: 600 }}>{patient.latest_service}</div>
                    </div>

                    <div style={{ color: '#475569' }}>
                      {expandedId === patient.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {expandedId === patient.id && (
                    <div style={{ 
                      background: 'rgba(0,0,0,0.2)', padding: '0 20px 20px',
                      borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ marginTop: 20 }}>
                        <h5 style={{ margin: '0 0 16px', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Service History</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {patient.services.map((svc, idx) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.03)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ 
                                  width: 32, height: 32, borderRadius: '8px', 
                                  background: svc.type.includes('Emergency') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                  {svc.type.includes('Emergency') ? <Zap size={16} color="#ef4444" /> : <FileText size={16} color="#10b981" />}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-100)', fontWeight: 600 }}>{svc.type}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                    Pet: <span style={{ color: 'var(--gray-400)' }}>{svc.pet_name}</span> • {new Date(svc.time).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ 
                                    fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                                    background: svc.payment === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: svc.payment === 'paid' ? '#34d399' : '#fbbf24',
                                    textTransform: 'uppercase'
                                  }}>
                                    {svc.payment === 'paid' ? 'Paid' : 'Pending'}
                                  </span>
                                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>{svc.amount > 0 ? `${svc.amount} BDT` : 'Consultation'}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
