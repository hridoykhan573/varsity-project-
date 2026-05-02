import React, { useRef } from 'react'
import { X, Printer, Download, CheckCircle, Image as ImageIcon, FileText } from 'lucide-react'
import { formatDate, formatFullDateTime, formatPrice, capitalize } from '../../utils/helpers'
import * as htmlToImage from 'html-to-image'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'

export default function ReceiptModal({ isOpen, onClose, booking }) {
  const receiptRef = useRef(null)

  if (!isOpen || !booking) return null

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return
    const toastId = toast.loading('Generating image...')
    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: '#fff',
        pixelRatio: 3, // Premium quality
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })
      const link = document.createElement('a')
      link.download = `PawHub-Receipt-${booking.id}.png`
      link.href = dataUrl
      link.click()
      toast.success('Image downloaded!', { id: toastId })
    } catch (err) {
      console.error('Oops, something went wrong!', err)
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
        format: [imgProps.width, imgProps.height] // Capture exactly the full content height
      })
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgProps.width, imgProps.height)
      pdf.save(`PawHub-Receipt-${booking.id}.pdf`)
      
      toast.success('PDF downloaded!', { id: toastId })
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Failed to generate PDF.', { id: toastId })
    }
  }

  const latestPayment = booking.latest_payment || {}
  const paymentTime = latestPayment.created_at || booking.created_at

  return (
    <div className="modal-overlay no-print-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-box receipt-container" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 680, // Slightly narrower for better one-page fit
          padding: 0, 
          overflowY: 'auto', // Allow scrolling within modal
          background: '#fff', 
          color: '#1a1a2e',
          maxHeight: '94vh', // More screen space
          borderRadius: '20px'
        }}
      >
        {/* Modal Header (Hidden during print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.1)', background: '#111', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--orange-500)', padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} color="white" />
            </div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Official Receipt</h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadImage} style={{ color: '#fff', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' }}>
              <ImageIcon size={14} /> Photo
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF} style={{ fontWeight: 700 }}>
               Print / Save PDF
            </button>
            <button className="modal-close" onClick={onClose} style={{ color: '#fff', opacity: 0.8, marginLeft: 8, background: 'rgba(255,255,255,.1)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} id="printable-receipt" style={{ padding: '40px 50px', background: '#fff', width: '100%' }}>
          {/* PawHub Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
            <div>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>
                <span style={{ color: 'var(--orange-500)' }}>Paw</span><span style={{ color: 'var(--green-600)' }}>Hub</span>
              </h1>
              <p style={{ fontSize: '.85rem', color: '#555', fontWeight: 600, marginTop: 4 }}>Pet Care & Boarding Excellence</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 2, letterSpacing: '1px', color: '#111' }}>RECEIPT</h2>
              <p style={{ fontSize: '.8rem', color: '#666', fontWeight: 600 }}>ID: PH-B{booking.id}-T{latestPayment.transaction_id?.slice(-8).toUpperCase() || 'MOCK'}</p>
              <p style={{ fontSize: '.8rem', color: '#666', fontWeight: 600 }}>Date: {formatDate(paymentTime)}</p>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', padding: '24px 0', marginBottom: 30, display: 'flex', justifyContent: 'space-between', gap: '30px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ textTransform: 'uppercase', fontSize: '.7rem', fontWeight: 900, color: '#888', marginBottom: 8, letterSpacing: '1.2px' }}>Provided By</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: '#111' }}>{booking.shelter_detail?.name}</h3>
              <p style={{ fontSize: '.85rem', color: '#444', lineHeight: 1.5 }}>{booking.shelter_detail?.location}</p>
              <p style={{ fontSize: '.85rem', color: '#444' }}>{booking.shelter_detail?.phone}</p>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <p style={{ textTransform: 'uppercase', fontSize: '.7rem', fontWeight: 900, color: '#888', marginBottom: 8, letterSpacing: '1.2px' }}>Bill To</p>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4, color: '#111' }}>{booking.user_detail?.username || 'Valued Customer'}</h3>
              <p style={{ fontSize: '.85rem', color: '#444' }}>{booking.user_detail?.email}</p>
              <p style={{ fontSize: '.85rem', color: '#444', lineHeight: 1.5 }}>{booking.user_detail?.location || 'Registered User'}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f0f0f0' }}>
                <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '12px 0', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>Pet</th>
                <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '24px 0' }}>
                  <p style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111', marginBottom: 4 }}>{booking.service_detail?.name || 'Shelter Service'}</p>
                  <p style={{ fontSize: '.85rem', color: '#666', fontWeight: 600 }}>{formatDate(booking.start_date)} to {formatDate(booking.end_date)}</p>
                </td>
                <td style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111' }}>{booking.pet_detail?.name}</p>
                  <p style={{ fontSize: '.75rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{booking.pet_detail?.pet_type}</p>
                </td>
                <td style={{ textAlign: 'right', padding: '24px 0', fontWeight: 900, fontSize: '1.1rem', color: '#111' }}>
                  {formatPrice(booking.total_price)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <div style={{ width: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ color: '#777', fontWeight: 700, fontSize: '.9rem' }}>Subtotal</p>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: '#111' }}>{formatPrice(booking.total_price)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, borderBottom: '2px solid #111', paddingBottom: 12 }}>
                <p style={{ color: '#777', fontWeight: 700, fontSize: '.9rem' }}>Tax</p>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: '#111' }}>Free</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#111' }}>Total Paid</p>
                <p style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--orange-500)' }}>{formatPrice(booking.total_price)}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 80, padding: '32px', background: '#fcfcfc', borderRadius: '16px', border: '1px dashed #ddd', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#10b981', marginBottom: 12 }}>
              <CheckCircle size={22} strokeWidth={3} />
              <p style={{ fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Confirmed</p>
            </div>
            <p style={{ fontSize: '.9rem', color: '#555', fontWeight: 700 }}>
              Method: <span style={{ color: '#111' }}>{capitalize(latestPayment.method || 'Online Payment')}</span> · 
              Reference: <span style={{ color: '#111' }}>#{latestPayment.transaction_id?.toUpperCase() || 'MOCK-REF'}</span>
            </p>
            <p style={{ fontSize: '.85rem', color: '#888', marginTop: 6, fontWeight: 500 }}>
              Processed on {formatFullDateTime(paymentTime)}
            </p>
          </div>

          <div style={{ marginTop: 80, textAlign: 'center' }}>
            <p style={{ fontSize: '.95rem', color: '#999', fontStyle: 'italic', fontWeight: 600 }}>Thank you for trusting Paw<span style={{ color: 'var(--green-600)' }}>Hub</span> with your pet's care!</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, .no-print-overlay { display: none !important; }
          .receipt-container { 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: none !important;
            border: none !important;
            transform: none !important;
          }
          body { background: white !important; }
          .modal-overlay { background: transparent !important; position: static !important; display: block !important; }
          .modal-box { position: static !important; transform: none !important; margin: 0 !important; }
          #printable-receipt { padding: 0 !important; }
        }
      `}} />
    </div>
  )
}
