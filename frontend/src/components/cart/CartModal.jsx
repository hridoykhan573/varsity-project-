import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '../../store/cartStore'
import { formatPrice } from '../../utils/helpers'

export default function CartModal() {
  const navigate = useNavigate()
  const { 
    items, 
    isModalOpen, 
    setModalOpen, 
    updateQuantity, 
    removeItem, 
    getTotalPrice,
    getTotalItems 
  } = useCartStore()

  if (!isModalOpen) return null

  return (
    <div 
      className="cart-overlay" 
      onClick={() => setModalOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <div 
        className="cart-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          background: 'var(--gray-900)',
          borderRadius: '24px',
          border: '1px solid rgba(128,128,128,0.2)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px', 
          borderBottom: '1px solid rgba(128,128,128,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(128,128,128,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              background: 'rgba(249,115,22,0.1)', 
              padding: '10px', 
              borderRadius: '12px',
              color: 'var(--orange-500)'
            }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--gray-100)' }}>Your Shopping Cart</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>{getTotalItems()} items added</p>
            </div>
          </div>
          <button 
            onClick={() => setModalOpen(false)}
            style={{ 
              background: 'rgba(128,128,128,0.1)', 
              border: 'none', 
              borderRadius: '50%', 
              padding: '8px', 
              color: 'var(--gray-400)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(128,128,128,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(128,128,128,0.1)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="custom-scrollbar">
          {items.length === 0 ? (
            <div style={{ 
              padding: '40px 0', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              gap: 16
            }}>
              <div style={{ fontSize: '4rem', opacity: 0.2 }}>🛒</div>
              <h3 style={{ color: 'var(--gray-300)' }}>Your cart is empty</h3>
              <p style={{ color: 'var(--gray-500)', maxWidth: '240px' }}>Looks like you haven't added anything here yet.</p>
              <button 
                onClick={() => setModalOpen(false)}
                className="btn btn-primary"
                style={{ marginTop: 8 }}
              >
                Go to Shop
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map((item) => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  gap: 16, 
                  background: 'rgba(128,128,128,0.04)', 
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(128,128,128,0.12)'
                }}>
                  <div style={{ 
                    width: '70px', 
                    height: '70px', 
                    background: '#fff', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>📦</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{item.name}</h4>
                      <button 
                        onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ color: 'var(--orange-400)', fontWeight: 700, fontSize: '0.95rem' }}>
                        ৳{Number(item.final_price || item.price).toFixed(1)}
                      </span>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10,
                        background: 'rgba(128,128,128,0.08)',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(128,128,128,0.15)'
                      }}>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '16px', textAlign: 'center', color: 'var(--gray-100)' }}>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ 
            padding: '24px', 
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray-400)', fontWeight: 600 }}>Total Amount</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-100)' }}>৳{getTotalPrice().toFixed(0)}</span>
            </div>
            <button 
              className="btn btn-primary"
              style={{ padding: '14px', borderRadius: '14px', width: '100%', fontSize: '1rem', fontWeight: 800 }}
              onClick={() => {
                setModalOpen(false)
                navigate('/shop/checkout')
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
