import React from 'react'
import { X, Info, Calendar, Package, Tag, User, Mail, Phone, ShoppingBag } from 'lucide-react'
import { formatDate } from '../../utils/helpers'

export default function ProductModal({ isOpen, onClose, product }) {
  if (!isOpen || !product) return null

  const DetailItem = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <div style={{ 
        width: 36, height: 36, borderRadius: '10px', 
        background: 'rgba(249,115,22,0.1)', 
        color: 'var(--orange-500)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} />
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</p>
        <p style={{ fontSize: '0.95rem', color: 'var(--gray-200)', margin: 0, fontWeight: 600 }}>{value || 'N/A'}</p>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Banner Image */}
        <div style={{ 
          height: '240px', 
          background: 'white', 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          {product.image ? (
            <img src={product.image} alt={product.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '5rem' }}>📦</span>
          )}
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }} className="modal-close">
            <X size={20} />
          </button>
          
          {/* Discount Badge */}
          {product.discount_percent > 0 && (
            <div style={{ 
              position: 'absolute', top: 16, left: 16, 
              background: 'var(--orange-500)', color: 'white', 
              padding: '6px 12px', borderRadius: '8px', 
              fontWeight: 800, fontSize: '0.85rem' 
            }}>
              {product.discount_percent}% OFF
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '32px 32px 48px' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--gray-100)' }}>{product.name}</h2>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.95rem', lineHeight: 1.6 }}>{product.description || 'No description provided.'}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            <DetailItem icon={Tag} label="Brand" value={product.brand} />
            <DetailItem icon={Package} label="Weight" value={product.weight} />
            <DetailItem icon={Calendar} label="Production Date" value={product.production_date ? formatDate(product.production_date) : null} />
            <DetailItem icon={Calendar} label="Expiry Date" value={product.expiry_date ? formatDate(product.expiry_date) : null} />
            <DetailItem icon={ShoppingBag} label="In Stock" value={product.stock > 0 ? `${product.stock} units` : 'Out of Stock'} />
            <DetailItem icon={User} label="Seller" value={product.seller_details?.username} />
          </div>

          {/* Seller Contact Quick Bar */}
          <div style={{ 
            marginTop: 24, 
            padding: '16px', 
            background: 'rgba(128,128,128,0.05)', 
            borderRadius: '16px',
            border: '1px solid rgba(128,128,128,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '0.85rem' }}>
              <Mail size={14} /> {product.seller_details?.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-400)', fontSize: '0.85rem' }}>
              <Phone size={14} /> {product.seller_details?.phone || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
