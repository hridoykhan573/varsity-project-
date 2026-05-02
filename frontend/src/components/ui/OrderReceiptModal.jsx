import React, { useRef } from 'react'
import { X, ImageIcon, Printer, FileText, CheckCircle, Package } from 'lucide-react'
import { formatDate, formatFullDateTime, formatPrice, capitalize } from '../../utils/helpers'
import * as htmlToImage from 'html-to-image'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'

export default function OrderReceiptModal({ isOpen, onClose, order }) {
  const receiptRef = useRef(null)

  if (!isOpen || !order) return null

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return
    const toastId = toast.loading('Generating receipt image...')
    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: '#fff',
        pixelRatio: 3, 
      })
      const link = document.createElement('a')
      link.download = `PawHub-Order-${order.custom_id || order.id}.png`
      link.href = dataUrl
      link.click()
      toast.success('Receipt image downloaded!', { id: toastId })
    } catch (err) {
      toast.error('Failed to generate image.', { id: toastId })
    }
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return
    const toastId = toast.loading('Generating PDF...')
    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: '#fff',
        pixelRatio: 2, 
      })
      
      const imgProps = receiptRef.current.getBoundingClientRect()
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgProps.width, imgProps.height]
      })
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgProps.width, imgProps.height)
      pdf.save(`PawHub-Order-${order.custom_id || order.id}.pdf`)
      toast.success('PDF downloaded!', { id: toastId })
    } catch (err) {
      toast.error('Failed to generate PDF.', { id: toastId })
    }
  }

  return (
    <div className="modal-overlay no-print-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-box receipt-container" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 720, 
          padding: 0, 
          overflowY: 'auto', 
          background: '#fff', 
          color: '#1a1a2e',
          maxHeight: '94vh',
          borderRadius: '20px',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#111', color: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={18} className="text-orange" />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Order Receipt</h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadImage} style={{ color: '#fff', background: 'rgba(255,255,255,.07)' }}>
              <ImageIcon size={14} /> Photo
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF}>
              <Printer size={14} /> PDF
            </button>
            <button className="modal-close" onClick={onClose} style={{ color: '#fff' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div ref={receiptRef} style={{ padding: '50px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
          
          {/* BIG WATERMARK LOGO */}
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            opacity: 0.03,
            pointerEvents: 'none',
            zIndex: 0,
            textAlign: 'center',
            width: '100%',
            userSelect: 'none'
          }}>
            <div style={{ fontSize: '18rem', lineHeight: 0.5, marginBottom: '2rem' }}>🐾</div>
            <div style={{ 
              fontSize: '10rem', 
              fontWeight: 950, 
              textTransform: 'uppercase', 
              letterSpacing: '10px',
              fontFamily: 'var(--font-display), sans-serif'
            }}>
              PawHub
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 700, marginTop: '1rem', letterSpacing: '5px' }}>
              OFFICIAL RECEIPT
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
              <div>
                <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, color: '#111' }}>
                  <span style={{ color: 'var(--orange-500)' }}>Paw</span><span style={{ color: 'var(--green-600)' }}>Hub</span>
                </h1>
                <p style={{ fontSize: '.85rem', color: '#666', fontWeight: 700, marginTop: 4 }}>Premium Marketplace for Pet Supplies</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: '#777', letterSpacing: '2px', marginBottom: 4 }}>Official Invoice</h2>
                <p style={{ fontSize: '.85rem', color: '#111', fontWeight: 700 }}>#{order.custom_id || order.id}</p>
                <p style={{ fontSize: '.8rem', color: '#555', fontWeight: 600 }}>{formatDate(order.created_at)}</p>
              </div>
            </div>

            {/* Address Info */}
            <div style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '24px 0', marginBottom: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
              <div>
                <p style={{ textTransform: 'uppercase', fontSize: '.7rem', fontWeight: 900, color: '#999', marginBottom: 10, letterSpacing: '1px' }}>Bill To</p>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 4 }}>{order.user_detail?.username || 'Valued Customer'}</h3>
                <p style={{ fontSize: '.85rem', color: '#444' }}>{order.shipping_email || order.user_detail?.email}</p>
                <p style={{ fontSize: '.85rem', color: '#444', marginTop: 8, lineHeight: 1.5 }}>{order.home_address}{order.road_number ? `, Road: ${order.road_number}` : ''}</p>
                <p style={{ fontSize: '.85rem', color: '#444', fontWeight: 700 }}>📞 {order.contact_phone}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ textTransform: 'uppercase', fontSize: '.7rem', fontWeight: 900, color: '#999', marginBottom: 10, letterSpacing: '1px' }}>Status</p>
                <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '40px', background: '#111', color: '#fff', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                  {order.status}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#999' }}>Product Details</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#999' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#999' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '18px 0' }}>
                      <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111', marginBottom: 2 }}>{item.product_name}</p>
                      <p style={{ fontSize: '.75rem', color: '#888', fontWeight: 600 }}>ID: PROD-{item.product_id || 'N/A'}</p>
                    </td>
                    <td style={{ textAlign: 'center', padding: '18px 0', fontWeight: 700, fontSize: '0.9rem' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '18px 0', fontWeight: 800, fontSize: '1rem', color: '#111' }}>{formatPrice(item.price_at_purchase)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ color: '#666', fontWeight: 600, fontSize: '.9rem' }}>Subtotal</p>
                  <p style={{ fontWeight: 800, fontSize: '1rem' }}>{formatPrice(order.total_amount)}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 10, borderBottom: '2px solid #111' }}>
                  <p style={{ color: '#666', fontWeight: 600, fontSize: '.9rem' }}>Shipping</p>
                  <p style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--green-600)' }}>FREE</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase' }}>Grand Total</p>
                  <p style={{ fontWeight: 900, fontSize: '1.6rem', color: 'var(--orange-500)' }}>{formatPrice(order.total_amount)}</p>
                </div>
              </div>
            </div>

            {/* Confirmation Footer */}
            <div style={{ marginTop: 60, padding: '24px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#10b981', marginBottom: 6 }}>
                <CheckCircle size={18} strokeWidth={3} />
                <p style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase' }}>Transaction Verified</p>
              </div>
              <p style={{ fontSize: '.8rem', color: '#64748b', fontWeight: 600 }}>Thank you for shopping at PawHub Store!</p>
            </div>

            <p style={{ marginTop: 40, textAlign: 'center', fontSize: '.8rem', color: '#999', fontStyle: 'italic', fontWeight: 500 }}>
              This is a computer generated invoice and does not require a physical signature.
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, .no-print-overlay { display: none !important; }
          .receipt-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; border: none !important; }
          #printable-receipt { padding: 40px !important; }
        }
      `}} />
    </div>
  )
}
