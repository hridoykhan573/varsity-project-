import { useState, useEffect } from 'react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line
} from 'recharts'
import { fetchAdminAnalytics } from '../../api/adminApi'
import toast from 'react-hot-toast'
import { Calendar } from 'lucide-react'

// Color palettes for sleek admin theme
const COLORS = ['#4680ff', '#10b981', '#ffb547', '#bf5af2', '#ee5d50', '#00b8d9']
const REVENUE_COLOR = '#05cd99'
const ADOPTION_COLOR = '#ffb547'

export default function AdminCharts({ setSharedStats }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchAdminAnalytics()
        setData(res.data)
        if (setSharedStats) {
          setSharedStats(res.data.overview)
        }
      } catch (e) {
        toast.error('Failed to load chart analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setSharedStats])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0' }}>
      <div className="spinner" style={{ borderColor: 'rgba(70, 128, 255, 0.2)', borderTopColor: '#4680ff' }}></div>
    </div>
  )

  if (!data) return null

  // Chart Tooltip Styles
  const tooltipStyle = {
    background: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    fontWeight: 600,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* ── ROW 1: Users Trend & Role Distribution ── */}
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-title">User Growth Over Time</div>
          <div style={{ height: 280, marginTop: 16 }}>
            {data.users_over_time?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.users_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4680ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4680ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area isAnimationActive={false} type="monotone" dataKey="count" name="New Users" stroke="#4680ff" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-title">User Roles</div>
          <div style={{ height: 280, marginTop: 16 }}>
            {data.users_by_role?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.users_by_role}
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="role"
                    isAnimationActive={false}
                  >
                    {data.users_by_role.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Revenue Trend & Bookings Status ── */}
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-title">Booking Revenue ($)</div>
          <div style={{ height: 280, marginTop: 16 }}>
            {data.revenue_over_time?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`$${parseFloat(val).toFixed(2)}`, 'Revenue']} />
                  <Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke={REVENUE_COLOR} strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-title">Boooking Status</div>
          <div style={{ height: 280, marginTop: 16 }}>
            {data.bookings_by_status?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bookings_by_status}
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    isAnimationActive={false}
                  >
                    {data.bookings_by_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Adoptions Over Time ── */}
      <div className="admin-grid-2">
        <div className="admin-card">
          <div className="admin-card-title">Successful Adoptions</div>
          <div style={{ height: 280, marginTop: 16 }}>
            {data.adoptions_over_time?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.adoptions_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line isAnimationActive={false} type="monotone" dataKey="count" name="Adoptions" stroke={ADOPTION_COLOR} strokeWidth={3} dot={{ fill: ADOPTION_COLOR, strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-title">Top App Services</div>
          <div style={{ height: 280, marginTop: 16 }}>
            {data.top_services?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_services} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fill: '#A0AEC0', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="service__name" type="category" tick={{ fill: '#2B3674', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar isAnimationActive={false} dataKey="count" name="Bookings" fill="#bf5af2" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      {/* ── ROW 4: Top Shelters by Requests ── */}
      <div className="admin-grid-1">
        <div className="admin-card">
          <div className="admin-card-title">Top 5 Shelters by Requests</div>
          <div style={{ height: 320, marginTop: 24 }}>
            {data.top_shelters?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.top_shelters} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f2f5" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fill: '#4A5568', fontSize: 13, fontWeight: 700 }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={100} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                    contentStyle={{ ...tooltipStyle, borderRadius: '8px' }}
                    formatter={(val) => [val, 'Requests']}
                  />
                  <Bar isAnimationActive={false} dataKey="count" name="Requests" radius={[0, 10, 10, 0]} barSize={32}>
                    {data.top_shelters.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>
      
    </div>
  )
}

function EmptyChart() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A0AEC0' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No data available for this chart</div>
    </div>
  )
}
