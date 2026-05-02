import React, { useState, useEffect } from 'react'
import { Star, X, MessageSquare, ShieldCheck, Send } from 'lucide-react'
import { createReview, updateReview } from '../../api/reviewApi'
import toast from 'react-hot-toast'
import { errorMessage } from '../../utils/helpers'

export default function ReviewModal({ 
  isOpen, 
  onClose, 
  targetUserId, 
  petName,
  subTitle,       // Optional override for the modal subtitle (e.g. for shop reviews)
  onSuccess,
  editReview = null
}) {
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editReview) {
      setRating(editReview.rating)
      setComment(editReview.comment)
      setImagePreview(editReview.image)
    } else {
      setRating(5)
      setComment('')
      setImage(null)
      setImagePreview(null)
    }
  }, [editReview, isOpen])

  if (!isOpen) return null

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comment.trim()) {
      toast.error('Please add a comment.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      if (!editReview) {
        formData.append('target_user', targetUserId)
        formData.append('review_type', 'user')
      }
      formData.append('rating', rating)
      formData.append('comment', comment)
      
      if (image && typeof image !== 'string') {
        formData.append('image', image)
      }

      if (editReview) {
        await updateReview(editReview.id, formData)
        toast.success(`Review updated! ✓`)
      } else {
        await createReview(formData)
        toast.success(`Review for ${petName}'s seller submitted! ✓`)
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 460, padding: '32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: '14px', 
              background: 'rgba(249, 115, 22, 0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              color: 'var(--orange-400)' 
            }}>
              <Star size={24} fill="currentColor" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-50)' }}>{editReview ? 'Edit Review' : 'Write a Review'}</h2>
              <p style={{ fontSize: '.85rem', color: 'var(--gray-500)' }}>{subTitle || `For ${petName}`}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--gray-500)', hover: { color: 'var(--gray-300)' } }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ color: 'var(--gray-400)', fontSize: '.9rem', marginBottom: 12 }}>How was your experience?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  style={{ 
                    color: (hover || rating) >= star ? 'var(--orange-400)' : 'var(--gray-700)',
                    transition: 'var(--transition)',
                    transform: (hover || rating) >= star ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  <Star size={36} fill={(hover || rating) >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', fontWeight: 600, color: 'var(--gray-300)', marginBottom: 8 }}>
              <MessageSquare size={14} /> Your Comment
            </label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about the transaction process..."
              className="form-control"
              style={{ width: '100%', resize: 'none', marginBottom: 20 }}
            />

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 600, color: 'var(--gray-300)', marginBottom: 8 }}>
                📸 Transaction Photo (Optional)
              </label>
              <p style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginBottom: 12 }}>Supported formats: **JPG, PNG, WEBP**</p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '10px 16px', gap: 8, fontSize: '.85rem' }}>
                  <Send size={14} style={{ transform: 'rotate(-45deg)' }} /> Select Photo
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                {imagePreview ? (
                  <div style={{ position: 'relative', width: 64, height: 64 }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--orange-500)' }} />
                    <button 
                      type="button" 
                      onClick={() => { setImage(null); setImagePreview(null); }}
                      style={{ position: 'absolute', top: -8, right: -8, background: 'var(--red-500)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-600)', fontSize: '.8rem' }}>No photo selected</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(16, 185, 129, 0.05)', 
            border: '1px solid rgba(16, 185, 129, 0.1)', 
            padding: '12px 14px', borderRadius: '12px', 
            display: 'flex', alignItems: 'center', gap: 10, 
            marginBottom: 32 
          }}>
            <ShieldCheck size={18} style={{ color: 'var(--green-500)', flexShrink: 0 }} />
            <p style={{ fontSize: '.78rem', color: 'var(--gray-400)', lineHeight: 1.4 }}>
              Your review is <strong>verified</strong> because you have a confirmed transaction with this seller.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {isSubmitting ? 'Processing...' : (editReview ? 'Update Review' : 'Submit Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
