import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react'
import { createProduct, updateProduct, fetchProduct } from '../../api/productApi'
import { errorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ManageProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    name: '',
    description: '',
    brand: '',
    weight: '',
    production_date: '',
    expiry_date: '',
    price: '',
    discount_percent: '0',
    tax_percent: '0',
    stock: '1'
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      const load = async () => {
        try {
          const { data } = await fetchProduct(id)
          setForm({
            name: data.name || '',
            description: data.description || '',
            brand: data.brand || '',
            weight: data.weight || '',
            production_date: data.production_date || '',
            expiry_date: data.expiry_date || '',
            price: data.price || '',
            discount_percent: data.discount_percent?.toString() || '0',
            tax_percent: data.tax_percent?.toString() || '0',
            stock: data.stock?.toString() || '1'
          })
          if (data.image) setImagePreview(data.image)
        } catch (e) {
          toast.error('Failed to load product')
          navigate('/dashboard')
        } finally {
          setLoading(false)
        }
      }
      load()
    }
  }, [id, navigate, isEdit])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('description', form.description)
      formData.append('brand', form.brand)
      formData.append('weight', form.weight)
      formData.append('production_date', form.production_date)
      formData.append('expiry_date', form.expiry_date)
      formData.append('price', form.price)
      formData.append('discount_percent', form.discount_percent)
      formData.append('tax_percent', form.tax_percent)
      formData.append('stock', form.stock)
      if (imageFile) formData.append('image', imageFile)

      if (isEdit) {
        await updateProduct(id, formData)
        toast.success('Product updated!')
      } else {
        await createProduct(formData)
        toast.success('Product added to catalog!')
      }
      navigate('/dashboard')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: 800 }}>
      <Link to="/dashboard" className="btn btn-ghost" style={{ marginBottom: 24, alignSelf: 'flex-start' }}><ArrowLeft size={18} /> Back to Dashboard</Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
      <p style={{ color: 'var(--gray-400)', marginBottom: 32 }}>Fill in the details for your pet food or accessory item.</p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
        <div className="grid-2">
          {/* Left Col: Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="form-input" required placeholder="e.g. Royal Canin Adult Cat Food" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="form-input" rows="4" placeholder="Describe the item..." />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input name="brand" value={form.brand} onChange={handleChange} className="form-input" placeholder="e.g. Royal Canin" />
              </div>
              <div className="form-group">
                <label className="form-label">Weight / Unit</label>
                <input name="weight" value={form.weight} onChange={handleChange} className="form-input" placeholder="e.g. 500g, 2kg, 1L" />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Production Date</label>
                <input type="date" name="production_date" value={form.production_date} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input type="date" name="expiry_date" value={form.expiry_date} onChange={handleChange} className="form-input" />
              </div>
            </div>

            <div className="grid-3">
                <div className="form-group">
                    <label className="form-label">Price (৳) *</label>
                    <input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} className="form-input" required placeholder="e.g. 500" />
                </div>
                <div className="form-group">
                    <label className="form-label">Discount (%)</label>
                    <input type="number" name="discount_percent" value={form.discount_percent} onChange={handleChange} className="form-input" min="0" max="100" />
                </div>
                <div className="form-group">
                    <label className="form-label">Tax (%)</label>
                    <input type="number" name="tax_percent" value={form.tax_percent} onChange={handleChange} className="form-input" min="0" max="100" />
                </div>
            </div>

            <div className="form-group">
              <label className="form-label">Stock Quantity</label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange} className="form-input" min="0" />
            </div>
          </div>

          {/* Right Col: Image */}
          <div>
            <label className="form-label">Product Image</label>
            <div 
              style={{
                width: '100%', height: 260, border: '2px dashed rgba(255,255,255,.1)', borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,.02)', position: 'relative', overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('img-upload').click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <ImageIcon size={48} style={{ color: 'var(--gray-500)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--gray-400)', fontSize: '.9rem' }}>Click to upload an image</p>
                </>
              )}
              <input type="file" id="img-upload" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        <div className="divider" style={{ margin: '32px 0 24px' }} />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Link to="/dashboard" className="btn btn-ghost">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner spinner-sm" /> : <><Save size={18} /> {isEdit ? 'Save Changes' : 'Publish Product'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
