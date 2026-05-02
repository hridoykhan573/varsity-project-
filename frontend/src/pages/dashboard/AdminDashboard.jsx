import { useState, useEffect, useCallback } from 'react'
import { 
  Users, Home, ShieldCheck, ShieldAlert, 
  BarChart3, Search, CheckCircle, 
  Clock, MoreVertical, LayoutDashboard,
  FileText, ExternalLink, AlertTriangle,
  Bell, Settings, Moon, Sun, Globe,
  ArrowUpRight, ArrowDownRight, UserPlus,
  Mail, Languages, ShoppingBag, Package, Heart,
  Stethoscope, Activity, DollarSign, Siren,
  Trash2, XCircle, RefreshCw, Eye, ChevronDown
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAdminUsers, getAdminShelters, verifyShelter } from '../../api/adminApi'
import { getComplaints, resolveComplaint } from '../../api/complaintApi'
import { getMyPets } from '../../api/petApi'
import { formatDate } from '../../utils/helpers'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import toast from 'react-hot-toast'
import '../../styles/admin-dashboard.css'
import AdminCharts from './AdminCharts'
import GlobalSearchBar from '../../components/ui/GlobalSearchBar'

export default function AdminDashboard() {
  const { user: currentUser } = useAuthStore()
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [shelters, setShelters] = useState([])
  const [pets, setPets] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [overviewStats, setOverviewStats] = useState(null)
  const { isLightMode, toggleTheme } = useThemeStore()
  const [showCharts, setShowCharts] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [uRes, sRes, pRes, cRes] = await Promise.all([
          getAdminUsers(),
          getAdminShelters(),
          getMyPets(),
          getComplaints()
        ])
        setUsers(uRes.data?.results || [])
        setShelters(sRes.data?.results || [])
        setPets(pRes.data?.results || [])
        setComplaints(cRes.data || [])
      } catch (e) {
        toast.error('Failed to load administrative data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleVerify = async (id, is_verified) => {
    try {
      await verifyShelter(id, { is_verified })
      setShelters(prev => prev.map(s => s.id === id ? { ...s, is_verified } : s))
      toast.success(is_verified ? 'Shelter Verified' : 'Status Updated')
    } catch (e) {
      toast.error('Failed to update shelter status')
    }
  }

  const handleResolveComplaint = async (id) => {
    try {
      await resolveComplaint(id)
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'RESOLVED' } : c))
      toast.success('Complaint marked as resolved')
    } catch (e) {
      toast.error('Failed to update complaint status')
    }
  }

  const stats = overviewStats ? [
    { label: 'Total Users', val: overviewStats.total_users, icon: <Users size={24} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', change: `+${overviewStats.new_users_30d}`, up: true, sub: 'New users last 30d' },
    { label: 'Total Shelters', val: overviewStats.total_shelters, icon: <ShieldCheck size={24} />, color: '#bf5af2', bg: 'rgba(191, 90, 242, 0.1)', change: '', up: true, sub: 'Verified & Unverified' },
    { label: 'Total Adoptions', val: overviewStats.total_adoptions, icon: <Heart size={24} />, color: '#ffb547', bg: 'rgba(255, 181, 71, 0.1)', change: '', up: true, sub: 'Successfully matched' },
    { label: 'Total Revenue', val: `$${parseFloat(overviewStats.total_revenue).toFixed(2)}`, icon: <BarChart3 size={24} />, color: '#05cd99', bg: 'rgba(5, 205, 153, 0.1)', change: '', up: true, sub: 'All-time paid bookings' },
  ] : [
    { label: 'Total Users', val: '...', icon: <Users size={24} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', change: '...', up: true, sub: 'Loading...' },
    { label: 'Total Shelters', val: '...', icon: <ShieldCheck size={24} />, color: '#bf5af2', bg: 'rgba(191, 90, 242, 0.1)', change: '...', up: true, sub: 'Loading...' },
    { label: 'Total Adoptions', val: '...', icon: <Heart size={24} />, color: '#ffb547', bg: 'rgba(255, 181, 71, 0.1)', change: '...', up: true, sub: 'Loading...' },
    { label: 'Total Revenue', val: '...', icon: <BarChart3 size={24} />, color: '#05cd99', bg: 'rgba(5, 205, 153, 0.1)', change: '...', up: true, sub: 'Loading...' },
  ]

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4f7fe' }}>
      <div className="spinner" style={{ borderColor: 'rgba(70, 128, 255, 0.2)', borderTopColor: '#4680ff' }}></div>
    </div>
  )

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span style={{ fontSize: '1.8rem' }}>🐾</span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#1b2559', fontWeight: 800 }}>Paw</span>
            <span style={{ color: '#10b981', fontWeight: 800 }}>Hub</span>
          </span>
        </div>
        
        <nav className="admin-sidebar-nav">
          <button 
            className={`admin-sidebar-item ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          
          <div className="admin-sidebar-section">User Management</div>
          <button className={`admin-sidebar-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            <div className="admin-sidebar-dot dot-blue"></div> <span>Users List</span>
          </button>
          <button className="admin-sidebar-item">
            <div className="admin-sidebar-dot dot-orange"></div> <span>Users Grid</span>
          </button>
          <button className="admin-sidebar-item">
            <div className="admin-sidebar-dot dot-blue"></div> <span>Add User</span>
          </button>
          <button className="admin-sidebar-item">
            <div className="admin-sidebar-dot dot-red"></div> <span>View Profile</span>
          </button>
          
          <div className="admin-sidebar-section">Admin Area</div>
          <button className={`admin-sidebar-item ${tab === 'shelters' ? 'active' : ''}`} onClick={() => setTab('shelters')}>
            <ShieldCheck size={20} /> <span>Verify Shelters</span>
          </button>
          <button className={`admin-sidebar-item ${tab === 'complaints' ? 'active' : ''}`} onClick={() => setTab('complaints')}>
            <AlertTriangle size={20} /> <span>Complaints</span>
          </button>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <GlobalSearchBar role="admin" />
          </div>
          
          <div className="admin-header-actions">
            <button className="admin-icon-btn"><Languages size={20} /></button>
            <button className="admin-icon-btn"><Mail size={20} /></button>
            <button className="admin-header-actions-notif" style={{ position: 'relative' }}>
              <button className="admin-icon-btn"><Bell size={20} /></button>
              <span style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, background: '#ee5d50', borderRadius: '50%', border: '2px solid #fff' }}></span>
            </button>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.05)', margin: '0 8px' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img 
                src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.username || 'Admin'}&background=10b981&color=fff`} 
                alt="admin" 
                className="admin-user-avatar"
              />
            </div>
          </div>
        </header>

        {/* Content Tabs */}
        {tab === 'overview' && (
          <>
            <div className="admin-grid-4">
              {stats.map((s, i) => (
                <div key={i} className="admin-card admin-stat-card">
                  <div className="admin-stat-info">
                    <span className="admin-stat-label">{s.label}</span>
                    <span className="admin-stat-val">{s.val}</span>
                    <div className="admin-stat-trend">
                      <span style={{ color: s.up ? '#05cd99' : '#ee5d50', display: 'flex', alignItems: 'center' }}>
                        {s.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {s.change}
                      </span>
                      <span style={{ color: '#a3aed0', marginLeft: 4 }}>{s.sub}</span>
                    </div>
                  </div>
                  <div className="admin-stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <div className="admin-card-title" style={{ justifyContent: 'space-between', gap: 12 }}>
                <span>Marketplace Quick Links</span>
              </div>
              <div className="admin-quick-links">
                <Link to="/shop?category=food" className="admin-quick-link">
                  <ShoppingBag size={18} />
                  <div>
                    <strong>Food</strong>
                    <span>View seller food listings</span>
                  </div>
                </Link>
                <Link to="/shop?category=accessories" className="admin-quick-link">
                  <Package size={18} />
                  <div>
                    <strong>Accessories</strong>
                    <span>View seller accessories listings</span>
                  </div>
                </Link>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button 
                onClick={() => setShowCharts(!showCharts)}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'var(--orange-500)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)',
                  transition: 'all 0.3s ease',
                  marginBottom: showCharts ? '16px' : '0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BarChart3 size={20} />
                  <span>Platform Analytics & Data Visualizations</span>
                </div>
                <ChevronDown 
                  size={20} 
                  style={{ 
                    transform: showCharts ? 'rotate(180deg)' : 'rotate(0deg)', 
                    transition: 'transform 0.4s ease' 
                  }} 
                />
              </button>
              
              <div style={{ 
                maxHeight: showCharts ? '5000px' : '0', 
                overflow: 'hidden', 
                transition: 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: showCharts ? 1 : 0,
                visibility: showCharts ? 'visible' : 'hidden'
              }}>
                <div style={{ paddingTop: '8px' }}>
                  <AdminCharts setSharedStats={setOverviewStats} />
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'users' && (
          <div className="admin-card" style={{ padding: 0 }}>
            <div style={{ padding: '24px 30px', borderBottom: '1px solid #f4f7fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>User Directory</h4>
                <p style={{ color: '#a3aed0', fontSize: '0.85rem', fontWeight: 600 }}>Total active users on platform</p>
              </div>
              <button className="admin-btn-add">
                <UserPlus size={18} /> Add New User
              </button>
            </div>
            
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>S.L</th>
                    <th>Join Date</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: '#a3aed0' }}>{(i + 1).toString().padStart(2, '0')}</td>
                      <td style={{ fontWeight: 600 }}>{formatDate(u.created_at)}</td>
                      <td>
                        <div className="admin-avatar-name">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${u.username}&background=f4f7fe&color=4680ff`} 
                            className="admin-avatar-sm" 
                            alt="" 
                          />
                          <span style={{ fontWeight: 700 }}>{u.username}</span>
                        </div>
                      </td>
                      <td style={{ color: '#a3aed0', fontWeight: 600 }}>{u.email}</td>
                      <td>
                        <span className={`admin-pill ${u.role === 'admin' ? 'admin-pill-warning' : 'admin-pill-primary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className="admin-pill admin-pill-success">
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#05cd99' }}></div> Active
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="admin-icon-btn"><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'shelters' && (
          <div className="admin-card" style={{ padding: 0 }}>
            <div style={{ padding: '24px 30px', borderBottom: '1px solid #f4f7fe' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Verification Queue</h4>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Shelter Name</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shelters.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td style={{ color: '#a3aed0', fontWeight: 600 }}>{s.location}</td>
                      <td>
                        <span className={`admin-pill ${s.is_verified ? 'admin-pill-success' : 'admin-pill-danger'}`}>
                          {s.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!s.is_verified ? (
                            <button onClick={() => handleVerify(s.id, true)} className="btn btn-sm" style={{ background: '#05cd99', color: '#fff', borderRadius: '8px' }}>Approve</button>
                          ) : (
                            <button onClick={() => handleVerify(s.id, false)} className="btn btn-sm-ghost" style={{ border: '1px solid #ee5d50', color: '#ee5d50', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>Revoke</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'complaints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Complain Center</h4>
              <div className="admin-pill admin-pill-danger" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                {complaints.filter(c => c.status === 'PENDING').length} PENDING
              </div>
            </div>
            <div className="admin-grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
              {complaints.map(c => (
                <div key={c.id} className="admin-card" style={{ borderLeft: `6px solid ${c.status === 'PENDING' ? '#ee5d50' : '#05cd99'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{c.subject}</div>
                    <span style={{ fontSize: '0.7rem', color: '#a3aed0' }}>{formatDate(c.created_at)}</span>
                  </div>
                  <p style={{ color: '#a3aed0', fontSize: '0.9rem', margin: '14px 0' }}>{c.description}</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {c.status === 'PENDING' && (
                      <button onClick={() => handleResolveComplaint(c.id)} className="btn btn-sm" style={{ background: '#4680ff', color: '#fff', width: '100%' }}>Resolve</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
