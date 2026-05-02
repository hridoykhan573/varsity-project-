import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Truck, ShoppingBag, CheckCircle, Phone, MapPin } from 'lucide-react'
import useCartStore from '../../store/cartStore'
import { formatPrice } from '../../utils/helpers'
import api from '../../api/axiosInstance'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore()
  const navigate = useNavigate()
  
  const [shippingInfo, setShippingInfo] = useState({
    home_address: '',
    road_number: '',
    contact_phone: '',
    shipping_email: ''
  })
  const [paymentMethod, setPaymentMethod] = useState('bkash')
  const [loading, setLoading] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)

  // Redirect if cart is empty and not just completed
  useEffect(() => {
    if (items.length === 0 && !orderComplete) {
      navigate('/shop')
    }
  }, [items, orderComplete, navigate])

  const handleInputChange = (e) => {
    setShippingInfo({ ...shippingInfo, [e.target.name]: e.target.value })
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (!shippingInfo.home_address || !shippingInfo.contact_phone) {
      return toast.error('Please fill in Home Address and Contact Number')
    }

    setLoading(true)
    try {
      // 1. Create the Order in Backend
      const orderData = {
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        home_address: shippingInfo.home_address,
        road_number: shippingInfo.road_number,
        contact_phone: shippingInfo.contact_phone,
        shipping_email: shippingInfo.shipping_email
      }

      const { data: order } = await api.post('/api/products/checkout/', orderData)

      if (paymentMethod === 'bkash') {
        // 2. Initiate bKash Payment
        const { data: bkashRes } = await api.post('/api/payments/bkash/create/', {
          order_id: order.id,
          callback_url: `${window.location.origin}/payment/bkash/callback`
        })

        if (bkashRes.bkash_url) {
          window.location.href = bkashRes.bkash_url
        } else {
          throw new Error('Could not initiate bKash payment')
        }
      } else {
        // 3. Process Cash on Delivery (Mock)
        await api.post('/api/payments/', {
          order_id: order.id,
          amount: order.total_amount,
          method: 'cash'
        })
        
        setOrderComplete(true)
        clearCart()
        toast.success('Order placed successfully! 📦')
      }
    } catch (err) {
      console.error('Checkout Error:', err)
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Checkout failed'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: 600 }}>
        <div style={{ 
          background: 'rgba(34,197,94,0.1)', 
          width: 80, height: 80, borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color: '#22c55e'
        }}>
          <CheckCircle size={40} />
        </div>
        <h1 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: 16 }}>Order Confirmed!</h1>
        <p style={{ color: 'var(--gray-400)', marginBottom: 32 }}>
          Your order has been placed successfully. We'll contact you soon for delivery.
        </p>
        <button onClick={() => navigate('/shop')} className="btn btn-primary" style={{ width: '100%', maxWidth: 300 }}>
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="page-wrapper container" style={{ padding: '40px 20px' }}>
      <button onClick={() => navigate('/shop')} className="btn btn-ghost" style={{ marginBottom: 32 }}>
        <ArrowLeft size={18} /> Back to Shop
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40 }}>
        {/* Left Side: Forms */}
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: 32 }}>Checkout</h2>
          
          <form onSubmit={handleCheckout}>
            {/* Shipping Section */}
            <div className="card" style={{ padding: 32, marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Truck size={20} color="var(--orange-500)" /> Shipping Information
              </h3>
              
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <MapPin size={14} /> Home Address *
                </label>
                <textarea 
                  name="home_address"
                  value={shippingInfo.home_address}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your house, apartment, and area details..."
                  rows="2"
                  required
                />
              </div>

              <div className="grid-2" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Road Number (Optional)</label>
                  <input 
                    type="text"
                    name="road_number"
                    value={shippingInfo.road_number}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g. Road 12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input 
                    type="text"
                    name="contact_phone"
                    value={shippingInfo.contact_phone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="017xxxxxxxx"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Optional)</label>
                <input 
                  type="email"
                  name="shipping_email"
                  value={shippingInfo.shipping_email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Payment Section */}
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CreditCard size={20} color="var(--orange-500)" /> Payment Method
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* bKash Option */}
                <label style={{ 
                  display: 'flex', alignItems: 'center', gap: 16, padding: '20px',
                  borderRadius: '16px', border: `2px solid ${paymentMethod === 'bkash' ? 'var(--orange-500)' : 'rgba(128,128,128,0.1)'}`,
                  background: paymentMethod === 'bkash' ? 'rgba(249,115,22,0.05)' : 'rgba(128,128,128,0.02)',
                  cursor: 'pointer', transition: 'var(--transition)'
                }}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentMethod === 'bkash'} 
                    onChange={() => setPaymentMethod('bkash')}
                    style={{ accentColor: 'var(--orange-500)', width: 20, height: 20 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-100)' }}>bKash Payment</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Secure digital payment via bKash gateway</div>
                  </div>
                  <img src="https://path-to-your-assets/bkash_logo.png" alt="bKash" style={{ height: 30, opacity: 0.8 }} 
                       onError={(e) => { e.target.style.display = 'none' }} />
                </label>

                {/* Cash Option */}
                <label style={{ 
                  display: 'flex', alignItems: 'center', gap: 16, padding: '20px',
                  borderRadius: '16px', border: `2px solid ${paymentMethod === 'cash' ? 'var(--orange-500)' : 'rgba(128,128,128,0.1)'}`,
                  background: paymentMethod === 'cash' ? 'rgba(249,115,22,0.05)' : 'rgba(128,128,128,0.02)',
                  cursor: 'pointer', transition: 'var(--transition)'
                }}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentMethod === 'cash'} 
                    onChange={() => setPaymentMethod('cash')}
                    style={{ accentColor: 'var(--orange-500)', width: 20, height: 20 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-100)' }}>Cash on Delivery</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Pay only when you receive your items</div>
                  </div>
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '20px', fontSize: '1.1rem', marginTop: 32, fontWeight: 800 }}
            >
              {loading ? <span className="spinner spinner-sm" /> : <>Confirm Order • ৳{getTotalPrice().toFixed(0)}</>}
            </button>
          </form>
        </div>

        {/* Right Side: Summary Card */}
        <div style={{ position: 'sticky', top: 120, height: 'fit-content' }}>
          <div className="card" style={{ padding: 24, background: 'var(--gray-800)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShoppingBag size={20} color="var(--orange-500)" /> Order Summary
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-200)' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Qty: {item.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--gray-100)' }}>
                    ৳{(Number(item.final_price || item.price) * item.quantity).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" style={{ margin: '16px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Total Amount</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--orange-500)' }}>৳{getTotalPrice().toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
