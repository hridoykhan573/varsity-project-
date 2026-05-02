import React from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Heart, ShoppingCart, Trash2 } from 'lucide-react'
import useWishlistStore from '../../store/wishlistStore'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function WishlistModal() {
  const { 
    items, 
    isModalOpen, 
    setModalOpen, 
    toggleWishlist 
  } = useWishlistStore()
  
  const { addItem } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  if (!isModalOpen) return null

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      setModalOpen(false)
      toast.error('Please sign in to add items to your cart!')
      navigate('/login')
      return
    }
    addItem(product)
    toast.success(`${product.name} added to cart! 🛒`)
  }

  const handleRemove = (product) => {
    toggleWishlist(product)
    toast.success('Removed from wishlist')
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={() => setModalOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 2100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <div 
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '85vh',
          background: 'var(--gray-900)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              background: 'rgba(249,115,22,0.1)', 
              padding: '10px', 
              borderRadius: '12px',
              color: 'var(--orange-500)'
            }}>
              <Heart size={20} fill="var(--orange-500)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>My Wishlist</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>{items.length} favorites saved</p>
            </div>
          </div>
          <button 
            onClick={() => setModalOpen(false)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', 
              borderRadius: '50%', 
              padding: '8px', 
              color: 'var(--gray-400)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
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
              <div style={{ fontSize: '4rem', opacity: 0.2 }}>❤️</div>
              <h3 style={{ color: 'var(--gray-300)' }}>Your wishlist is empty</h3>
              <p style={{ color: 'var(--gray-500)', maxWidth: '240px' }}>Save your favorite products to see them here later!</p>
              <button 
                onClick={() => setModalOpen(false)}
                className="btn btn-primary"
                style={{ marginTop: 8 }}
              >
                Discover Products
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map((item) => (
                <div key={item.id} style={{ 
                  display: 'flex', 
                  gap: 16, 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </h4>
                    <p style={{ color: 'var(--orange-400)', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>
                      ৳{Number(item.final_price || item.price).toFixed(0)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => handleAddToCart(item)}
                      style={{ 
                        background: 'rgba(249,115,22,0.1)', 
                        border: 'none', 
                        borderRadius: '10px', 
                        width: 38, height: 38,
                        color: 'var(--orange-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Add to Cart"
                    >
                      <ShoppingCart size={16} />
                    </button>
                    <button 
                      onClick={() => handleRemove(item)}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: 'none', 
                        borderRadius: '10px', 
                        width: 38, height: 38,
                        color: 'var(--gray-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
