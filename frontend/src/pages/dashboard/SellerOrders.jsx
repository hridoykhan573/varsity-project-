import React, { useState, useEffect } from 'react'
import { ShoppingBag, Truck, CheckCircle, XCircle, Clock, MapPin, Phone, Mail, ChevronDown, Search, Trash2, FileText, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useChatStore from '../../store/chatStore'
import api from '../../api/axiosInstance'
import toast from 'react-hot-toast'
import { formatPrice } from '../../utils/helpers'
import ConfirmModal from '../../components/ui/ConfirmModal'
import OrderReceiptModal from '../../components/ui/OrderReceiptModal'

const STATUS_COLORS = {
  pending: 'rgba(249,115,22,0.15)',     // Orange
  processing: 'rgba(59,130,246,0.15)',  // Blue
  shipped: 'rgba(168,85,247,0.15)',     // Purple
  delivered: 'rgba(34,197,94,0.15)',    // Green
  cancelled: 'rgba(239,68,68,0.15)',     // Red
}

const TEXT_COLORS = {
  pending: '#f97316',
  processing: '#3b82f6',
  shipped: '#a855f7',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

export default function SellerOrders({ mode = 'inbox' }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmState, setConfirmState] = useState({ isOpen: false })
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const navigate = useNavigate()

  const handleStartChat = async (targetUserId) => {
    try {
      const { data } = await api.get(`/api/chat/conversations/find_or_create/?user_id=${targetUserId}`)
      useChatStore.getState().setActiveConversation(data)
      navigate('/chat')
    } catch (err) {
      toast.error('Could not start chat.')
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(searchQuery)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [mode, searchQuery])

  const fetchOrders = async (query = '') => {
    setLoading(true)
    try {
      const baseUrl = mode === 'history' 
        ? '/api/products/seller-orders/history/' 
        : '/api/products/seller-orders/'
      
      const url = query ? `${baseUrl}?search=${encodeURIComponent(query)}` : baseUrl
      const { data } = await api.get(url)
      setOrders(data.results || data || [])
    } catch (err) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/api/products/orders/${orderId}/status/`, { status: newStatus })
      toast.success(`Order status updated to ${newStatus}`)
      fetchOrders() 
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleArchive = async (orderId) => {
    setConfirmState({
      isOpen: true,
      title: 'Archive Order',
      message: 'Are you sure you want to archive this order from your inbox? It will still be available in the History portal.',
      confirmText: 'Archive',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await api.post(`/api/products/orders/${orderId}/archive/`)
          toast.success('Order archived from inbox')
          fetchOrders()
        } catch (err) {
          toast.error('Failed to archive order')
        }
      }
    })
  }

  const handleDeleteOrder = async (orderId) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Order Permanently',
      message: 'Are you sure you want to PERMANENTLY delete this order? This will restore any subtracted stock and notify the buyer. This action cannot be undone.',
      confirmText: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState({ isOpen: false })
        try {
          await api.delete(`/api/products/orders/${orderId}/delete/`)
          toast.success('Order deleted and buyer notified')
          fetchOrders()
        } catch (err) {
          toast.error('Failed to delete order')
        }
      }
    })
  }

  return (
    <div style={{ padding: '0 0 20px 0' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShoppingBag className="text-orange" /> {mode === 'history' ? 'Order History' : 'Order Inbox'}
        </h1>
        <p style={{ color: 'var(--gray-400)' }}>
          {mode === 'history' 
            ? 'A complete permanent record of all your successful and cancelled sales.' 
            : 'Manage your active product sales and customer deliveries.'}
        </p>
      </header>

      {/* Search Bar */}
      <div style={{ marginBottom: 24, position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Search by ID, Name, Location or Date..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px 16px 12px 48px', 
            background: 'var(--gray-800)', 
            border: '1px solid rgba(128,128,128,0.2)', 
            borderRadius: '16px',
            color: 'var(--gray-100)',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.3s'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--orange-500)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(128,128,128,0.2)'}
        />
        <Search 
          size={20} 
          style={{ 
            position: 'absolute', 
            left: 16, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--gray-500)' 
          }} 
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{ 
              position: 'absolute', 
              right: 16, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              background: 'none', 
              border: 'none', 
              color: 'var(--gray-500)', 
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      <ConfirmModal {...confirmState} onCancel={() => setConfirmState({ isOpen: false })} />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className="spinner" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📦</div>
          <h3 style={{ fontWeight: 800, marginBottom: 8 }}>{mode === 'history' ? 'History is empty' : 'No active orders'}</h3>
          <p style={{ color: 'var(--gray-500)' }}>When customers buy your products, they will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id
            return (
              <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isExpanded ? '1px solid var(--orange-500)' : '1px solid rgba(128,128,128,0.1)' }}>
                {/* Order Header */}
                <div 
                  onClick={() => toggleExpand(order.id)}
                  style={{ 
                    padding: '16px 24px', 
                    background: isExpanded ? 'rgba(249,115,22,0.03)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 42, height: 42, borderRadius: '10px', 
                      background: 'var(--orange-500)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '0.9rem'
                    }}>
                      #{order.id}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isExpanded ? 'var(--orange-400)' : 'var(--gray-100)' }}>
                        Order ID: <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{order.custom_id}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                        {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      padding: '6px 14px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: STATUS_COLORS[order.status],
                      color: TEXT_COLORS[order.status]
                    }}>
                      {order.status}
                    </div>
                    <ChevronDown size={18} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                  </div>
                </div>

                {/* Collapsible Content */}
                <div style={{ 
                  maxHeight: isExpanded ? '1000px' : '0', 
                  overflow: 'hidden', 
                  transition: 'max-height 0.5s cubic-bezier(0, 1, 0, 1)',
                  background: 'transparent'
                }}>
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(128,128,128,0.1)' }}>
                    <div style={{ 
                       padding: '20px 0', 
                       display: 'flex', 
                       justifyContent: 'flex-end', 
                       gap: 12,
                       borderBottom: '1px solid rgba(128,128,128,0.1)',
                       marginBottom: 24
                    }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStartChat(order.user_id || order.user); }}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: 8, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <MessageSquare size={14} /> Chat with Customer
                      </button>

                      {mode === 'inbox' && order.status === 'pending' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmState({
                              isOpen: true,
                              title: 'Confirm Order',
                              message: 'Confirm this order? This will immediately decrease product stock.',
                              confirmText: 'Confirm',
                              variant: 'primary',
                              onConfirm: () => {
                                setConfirmState({ isOpen: false });
                                handleUpdateStatus(order.id, 'processing');
                              }
                            });
                          }}
                          className="btn btn-success btn-sm"
                          style={{ background: 'var(--green-600)', borderColor: 'var(--green-500)' }}
                        >
                          <CheckCircle size={14} /> Confirm Order
                        </button>
                      )}

                      {mode === 'inbox' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                          className="btn btn-danger btn-sm"
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                          <Trash2 size={14} /> Delete Order
                        </button>
                      )}

                      {mode === 'inbox' && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleArchive(order.id); }}
                            className="btn btn-danger btn-sm"
                            style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                          >
                            <XCircle size={14} /> Archive
                          </button>
                          
                          <select 
                            value={order.status}
                            onChange={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, e.target.value); }}
                            style={{ 
                              background: 'var(--gray-800)', 
                              border: '1px solid rgba(128,128,128,0.2)', 
                              color: 'var(--gray-100)', 
                              padding: '8px 12px', 
                              borderRadius: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </>
                      )}

                      {mode === 'history' && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedOrder(order);
                            setShowReceipt(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 8 }}
                        >
                          <FileText size={14} /> View Receipt
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32 }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: 20, letterSpacing: '0.05em' }}>ORDERED ITEMS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {order.items?.map((item) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 40, height: 40, borderRadius: '8px', background: '#fff', padding: 4 }}>
                                {item.image ? (
                                  <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : '📦'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.product_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>৳{Number(item.price_at_purchase).toFixed(0)} × {item.quantity}</div>
                              </div>
                              <div style={{ fontWeight: 800, color: 'var(--gray-100)' }}>৳{(Number(item.price_at_purchase) * item.quantity).toFixed(0)}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 24, padding: '16px 0 0', borderTop: '1px dashed rgba(128,128,128,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, color: 'var(--gray-400)' }}>Total Revenue</span>
                          <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--orange-500)' }}>৳{Number(order.total_amount).toFixed(0)}</span>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: 20, letterSpacing: '0.05em' }}>DELIVERY DETAILS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <MapPin size={16} className="text-orange" style={{ marginTop: 3 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Address</div>
                              <div style={{ color: 'var(--gray-300)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {order.home_address}
                                {order.road_number && <><br /><span style={{ color: 'var(--gray-500)' }}>Road: {order.road_number}</span></>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <Phone size={16} className="text-orange" style={{ marginTop: 3 }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Contact Phone</div>
                              <div style={{ fontWeight: 800 }}>{order.contact_phone}</div>
                            </div>
                          </div>
                          {order.shipping_email && (
                            <div style={{ display: 'flex', gap: 12 }}>
                              <Mail size={16} className="text-orange" style={{ marginTop: 3 }} />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Email</div>
                                <div style={{ color: 'var(--gray-300)', fontSize: '0.85rem' }}>{order.shipping_email}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <OrderReceiptModal 
        isOpen={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        order={selectedOrder} 
      />
    </div>
  )
}
