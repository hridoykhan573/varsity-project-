import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Download, Stethoscope, User, Calendar, ClipboardList, Search, FileUp, Save, Clock, PawPrint, Activity, FileImage, PlusCircle, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import api from '../../api/axiosInstance'
import useAuthStore from '../../store/authStore'

export default function PrescriptionModal({ isOpen, onClose, prescriptionData = null, initialPatientData = null, onSuccess }) {
  const { user } = useAuthStore()
  const isDoctor = user?.role === 'doctor'
  
  // Form State
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [patientInfo, setPatientInfo] = useState({ petName: '', petType: 'Dog', diagnosis: '', foodAdvice: '' })
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }])
  const [advice, setAdvice] = useState('')
  const [reportImage, setReportImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [allOwners, setAllOwners] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Initialize for Edit Mode or Initial Patient Data
  useEffect(() => {
    if (prescriptionData) {
      setSelectedOwner(prescriptionData.owner_details)
      setPatientInfo({
        petName: prescriptionData.pet_name,
        petType: prescriptionData.pet_type,
        diagnosis: prescriptionData.diagnosis,
        foodAdvice: prescriptionData.food_advice || ''
      })
      setMedicines(prescriptionData.medicines || [{ name: '', dosage: '', frequency: '', duration: '' }])
      setAdvice(prescriptionData.advice || '')
    } else if (initialPatientData) {
      setSelectedOwner({
        id: initialPatientData.owner_id,
        full_name: initialPatientData.owner_name,
        email: 'Patient via Appointment' // fallback display
      })
      setPatientInfo({
        petName: initialPatientData.pet_name || '',
        petType: 'Dog',
        diagnosis: initialPatientData.diagnosis || '',
        foodAdvice: ''
      })
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }])
      setAdvice('')
    } else {
      // Reset
      setSelectedOwner(null)
      setPatientInfo({ petName: '', petType: 'Dog', diagnosis: '', foodAdvice: '' })
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }])
      setAdvice('')
    }
  }, [prescriptionData, initialPatientData, isOpen])

  // 1. Fetch ALL pet owners for the dropdown on open
  useEffect(() => {
    if (isOpen) {
      api.get('/api/vet/pet-owners/list')
        .then(res => setAllOwners(res.data))
        .catch(() => toast.error('Failed to load owner list.'))
    }
  }, [isOpen])

  // 2. Fetch Selected Consultation context on open (if not editing an existing prescription)
  useEffect(() => {
    if (isOpen && !prescriptionData && !initialPatientData) {
      api.get('/api/vet/consultation/selected')
        .then(res => {
          setSelectedOwner({ id: res.data.id, full_name: res.data.full_name, email: res.data.email })
          if (res.data.pet_name) {
            setPatientInfo(prev => ({ ...prev, petName: res.data.pet_name }))
          }
        })
        .catch(() => {
          // No active selection is fine, user can search manually
        })
    }
  }, [isOpen, prescriptionData, initialPatientData])

  // 3. Search Logic for manual entries
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setLoadingSearch(true)
        api.get(`/api/vet/prescriptions/search_owners/?q=${searchQuery}`)
          .then(res => setSearchResults(res.data))
          .finally(() => setLoadingSearch(false))
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  if (!isOpen) return null

  const filteredOwners = searchQuery 
    ? allOwners.filter(o => o.email.toLowerCase().includes(searchQuery.toLowerCase()) || o.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allOwners

  const addMedicine = () => setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '' }])
  const removeMedicine = (index) => medicines.length > 1 && setMedicines(medicines.filter((_, i) => i !== index))
  const updateMedicine = (index, field, value) => {
    const newMeds = [...medicines]
    newMeds[index][field] = value
    setMedicines(newMeds)
  }

  const handleSave = async () => {
    if (!selectedOwner) return toast.error('Please select a pet owner.')
    if (!patientInfo.petName || medicines[0].name === '') return toast.error('Please enter Pet Name and at least one medicine.')

    setSaving(true)
    const formData = new FormData()
    formData.append('owner', selectedOwner.id)
    formData.append('pet_name', patientInfo.petName)
    formData.append('pet_type', patientInfo.petType)
    formData.append('diagnosis', patientInfo.diagnosis)
    formData.append('food_advice', patientInfo.foodAdvice)
    formData.append('advice', advice)
    formData.append('medicines', JSON.stringify(medicines))
    if (reportImage) formData.append('report_image', reportImage)

    try {
      if (prescriptionData) {
        await api.patch(`/api/vet/prescriptions/${prescriptionData.id}/`, formData)
        toast.success('Prescription updated.')
      } else {
        await api.post('/api/vet/prescriptions/', formData)
        toast.success('Prescription issued and stored.')
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error("Prescription Save Error:", err.response?.data)
      const errorData = err.response?.data
      let errorMsg = 'Failed to save prescription.'
      
      if (errorData) {
        if (typeof errorData === 'object') {
          // Join multiple errors into a readable string
          errorMsg = Object.entries(errorData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ')
        } else if (typeof errorData === 'string') {
          errorMsg = errorData
        }
      }
      
      toast.error(errorMsg, { duration: 5000 })
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePDF = async () => {
    const doc = new jsPDF()
    const brandOrange = [249, 115, 22] // #f97316
    
    // 1. Top Bar / Logo Area
    doc.setFillColor(brandOrange[0], brandOrange[1], brandOrange[2])
    doc.rect(0, 0, 210, 40, 'F')
    
    // Draw professional Paw Logo (Multi-circle design)
    doc.setFillColor(255, 255, 255)
    // Main pad
    doc.circle(20, 24, 5, 'F')
    // 4 Toes
    doc.circle(15, 18, 1.8, 'F')
    doc.circle(18.5, 14.5, 1.8, 'F')
    doc.circle(22.5, 14.5, 1.8, 'F')
    doc.circle(26, 18, 1.8, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('PawHub', 35, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Veterinary Care Platform', 35, 28)
    
    // 2. Doctor Info (Top Right)
    const doctorDisp = prescriptionData?.doctor_details || {
      full_name: user?.get_full_name?.() || `${user?.first_name} ${user?.last_name}`.trim() || user?.username,
      email: user?.email,
      phone: user?.phone,
      bvc_number: user?.doctor_profile?.bvc_number
    }

    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(`Dr. ${doctorDisp.full_name}`, 190, 15, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`BVC Reg: ${doctorDisp.bvc_number || 'N/A'}`, 190, 21, { align: 'right' })
    doc.text(`Phone: ${doctorDisp.phone || 'N/A'}`, 190, 26, { align: 'right' })
    doc.text(`Email: ${doctorDisp.email || 'N/A'}`, 190, 31, { align: 'right' })

    // 3. Middle Section: Owner & Pet Info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('PRESCRIPTION DETAILS', 20, 55)
    doc.setDrawColor(brandOrange[0], brandOrange[1], brandOrange[2])
    doc.setLineWidth(0.5)
    doc.line(20, 58, 190, 58)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Pet Owner: ${selectedOwner?.full_name || 'N/A'}`, 20, 68)
    doc.text(`Pet Name: ${patientInfo.petName} (${patientInfo.petType})`, 20, 74)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 190, 68, { align: 'right' })
    doc.text(`RX ID: ${prescriptionData?.prescription_id || 'PH-RX-TEMP'}`, 190, 74, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text('Diagnosis:', 20, 84)
    doc.setFont('helvetica', 'normal')
    doc.text(patientInfo.diagnosis || 'General Clinical Review', 45, 84)

    // 4. Main Body: Medicines (Rx)
    doc.setFontSize(22)
    doc.setTextColor(brandOrange[0], brandOrange[1], brandOrange[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Rx', 20, 100)

    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    doc.setFillColor(248, 250, 252)
    doc.rect(20, 105, 170, 8, 'F')
    doc.text('Medicine (Drug) Name', 25, 110)
    doc.text('Dosage', 95, 110)
    doc.text('Frequency', 130, 110)
    doc.text('Duration', 165, 110)
    
    let y = 120
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    medicines.forEach(m => {
      doc.text(m.name, 25, y)
      doc.text(m.dosage, 95, y)
      doc.text(m.frequency, 130, y)
      doc.text(m.duration, 165, y)
      y += 8
    })

    // 5. Food & Advice
    y += 10
    if (patientInfo.foodAdvice) {
      doc.setFont('helvetica', 'bold')
      doc.text('FOOD ADVICE:', 20, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.text(patientInfo.foodAdvice, 20, y)
      y += 10
    }

    if (advice) {
      doc.setFont('helvetica', 'bold')
      doc.text('NOTES & ADVICE:', 20, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(advice, 160)
      doc.text(lines, 20, y)
    }

    // 6. Footer
    doc.setDrawColor(240, 240, 240)
    doc.line(20, 275, 190, 275)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Powered by PawHub - Your Trusted Veterinary Partner', 105, 282, { align: 'center' })
    doc.text(`${new Date().toLocaleString()}`, 105, 286, { align: 'center' })

    doc.save(`PH-RX-${patientInfo.petName || 'Pet'}.pdf`)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-box" style={{ 
        maxWidth: 950, width: '95%', padding: 0, overflow: 'hidden', 
        background: 'var(--gray-950)', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Header Section */}
        <div style={{ 
          padding: '28px 32px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(249, 115, 22, 0.05)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--gray-50)', letterSpacing: '-0.02em' }}>
              {isDoctor ? <Stethoscope size={26} color="#f97316" /> : <FileText size={26} color="#f97316" />} 
              {prescriptionData ? (isDoctor ? 'Manage Prescription' : 'Medical Record') : 'Issue New Medical Prescription'}
            </h2>
            <p style={{ fontSize: '.85rem', color: 'var(--gray-400)', marginTop: 4 }}>
              {isDoctor ? 'Professional medical system for verified veterinarians.' : 'Your official digital health record securely issued by PawHub.'}
            </p>
          </div>
          <button onClick={onClose} className="modal-close" style={{ top: 28, right: 32, opacity: 0.6 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '32px', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40 }}>
            
            {/* Left Column: Owner & Pet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Owner Search/Selection */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-200)', marginBottom: 12 }}>
                  <User size={18} color="#f97316" /> <span style={{ fontWeight: 800, fontSize: '.9rem', textTransform: 'uppercase' }}>1. Select Pet Owner</span>
                </div>
                
                {/* Search Bar / Selection */}
                <div style={{ position: 'relative' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Search by name or email..." 
                        style={{ 
                          paddingLeft: 42, 
                          borderColor: selectedOwner ? '#10b981' : 'var(--border-color)',
                          background: selectedOwner ? 'rgba(16, 185, 129, 0.03)' : 'var(--card-bg)'
                        }}
                        value={selectedOwner ? selectedOwner.email : searchQuery} 
                        onChange={e => {
                          if (selectedOwner) {
                            setSelectedOwner(null)
                            setSearchQuery(e.target.value)
                          } else {
                            setSearchQuery(e.target.value)
                          }
                          setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      {selectedOwner && (
                        <button 
                          onClick={() => {
                            setSelectedOwner(null)
                            setSearchQuery('')
                          }}
                          style={{ 
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', 
                            background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {showDropdown && (
                    <div style={{ 
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      background: 'var(--gray-900)', border: '1px solid var(--border-color)', 
                      borderRadius: '16px', zIndex: 100, marginTop: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                      maxHeight: '260px', overflowY: 'auto', padding: '8px'
                    }}>
                      {filteredOwners.length > 0 ? (
                        filteredOwners.map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => {
                              setSelectedOwner(u)
                              setSearchQuery('')
                              setShowDropdown(false)
                            }}
                            style={{ 
                              padding: '12px 16px', cursor: 'pointer', borderRadius: '10px',
                              borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'all 0.2s',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
                              e.currentTarget.style.transform = 'translateY(-2px)'
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--gray-100)', fontSize: '.9rem' }}>{u.email}</div>
                              <div style={{ fontSize: '.7rem', color: 'var(--gray-500)', marginTop: 2 }}>{u.full_name}</div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '.65rem', color: '#10b981', fontWeight: 800 }}>
                              SELECT
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '.85rem' }}>
                          No pet owners found matching your search.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overlay to close dropdown on outside click */}
                  {showDropdown && (
                    <div 
                      onClick={() => setShowDropdown(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 90, cursor: 'default' }} 
                    />
                  )}
                </div>
              </section>

              {/* Pet Info */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-200)', marginBottom: 12 }}>
                  <Activity size={18} color="#f97316" /> <span style={{ fontWeight: 800, fontSize: '.9rem', textTransform: 'uppercase' }}>2. Patient Detail & Diagnosis</span>
                </div>
                <div className="grid-2" style={{ gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontSize: '.7rem' }}>Pet Name</label>
                        <input 
                          className="form-input" placeholder="e.g. Tommy" 
                          value={patientInfo.petName} onChange={e => setPatientInfo({ ...patientInfo, petName: e.target.value })}
                          readOnly={!isDoctor}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginBottom: 6, display: 'block' }}>PET TYPE</label>
                        <select 
                          className="form-input" 
                          value={patientInfo.petType} onChange={e => setPatientInfo({ ...patientInfo, petType: e.target.value })}
                          disabled={!isDoctor}
                        >
                            <option>Dog</option>
                            <option>Cat</option>
                            <option>Bird</option>
                            <option>Rabbit</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginBottom: 6, display: 'block' }}>CLINICAL DIAGNOSIS</label>
                    <textarea 
                      className="form-input" rows={3} placeholder="Describe the pet's condition..."
                      value={patientInfo.diagnosis} onChange={e => setPatientInfo({ ...patientInfo, diagnosis: e.target.value })}
                      readOnly={!isDoctor}
                    />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginBottom: 6, display: 'block' }}>FOOD ADVICE (OPTIONAL)</label>
                    <input 
                      className="form-input" placeholder="e.g. Boiled chicken, No dairy" 
                      value={patientInfo.foodAdvice} onChange={e => setPatientInfo({ ...patientInfo, foodAdvice: e.target.value })}
                      readOnly={!isDoctor}
                    />
                </div>
              </section>

              {/* Report Upload */}
              {isDoctor && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-200)', marginBottom: 12 }}>
                    <FileImage size={18} color="#f97316" /> <span style={{ fontWeight: 800, fontSize: '.9rem', textTransform: 'uppercase' }}>3. Pet Reports (Optional)</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                      <input 
                        type="file" accept="image/*" 
                        onChange={(e) => setReportImage(e.target.files[0])}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--gray-900)', color: 'var(--gray-400)' }} 
                      />
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Medications & Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Medicines List */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-200)' }}>
                            <PlusCircle size={18} color="#f97316" /> <span style={{ fontWeight: 800, fontSize: '.9rem', textTransform: 'uppercase' }}>4. Medicines & Dosage</span>
                        </div>
                        {isDoctor && (
                          <button onClick={addMedicine} style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 800, fontSize: '.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Plus size={14} /> ADD ITEM
                          </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '320px', overflowY: 'auto', paddingRight: 8 }}>
                        {medicines.map((m, idx) => (
                            <div key={idx} style={{ 
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 8, 
                                background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)'
                            }}>
                                <input 
                                    className="form-input-sm" style={{ gridColumn: 'span 4' }} placeholder="Drug Name (e.g. Amoxicillin)" 
                                    value={m.name} onChange={e => updateMedicine(idx, 'name', e.target.value)}
                                    readOnly={!isDoctor}
                                />
                                <input 
                                    className="form-input-sm" style={{ gridColumn: 'span 3' }} placeholder="Dosage (e.g. 500mg)" 
                                    value={m.dosage} onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                                    readOnly={!isDoctor}
                                />
                                <input 
                                    className="form-input-sm" style={{ gridColumn: 'span 4' }} placeholder="Freq (e.g. 2x Daily)" 
                                    value={m.frequency} onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                                    readOnly={!isDoctor}
                                />
                                {isDoctor && (
                                  <button 
                                      onClick={() => removeMedicine(idx)} 
                                      style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                  >
                                      <Trash2 size={16} />
                                  </button>
                                )}
                                <input 
                                    className="form-input-sm" style={{ gridColumn: isDoctor ? 'span 3' : 'span 4' }} placeholder="Notes / Duration (e.g. 7 Days, Take after food)" 
                                    value={m.duration} onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                                    readOnly={!isDoctor}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Additional Advice */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-200)', marginBottom: 12 }}>
                        <ClipboardList size={18} color="#f97316" /> <span style={{ fontWeight: 800, fontSize: '.9rem', textTransform: 'uppercase' }}>5. Additional Advice</span>
                    </div>
                    <textarea 
                        className="form-input" rows={5} placeholder="Feeding instructions, follow-up schedule, signs to watch for..."
                        value={advice} onChange={e => setAdvice(e.target.value)}
                        readOnly={!isDoctor}
                    />
                </section>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ 
          padding: '24px 32px', borderTop: '1px solid var(--border-color)', 
          background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--gray-500)', fontSize: '.75rem' }}>
             <Clock size={14} /> {prescriptionData ? `Updated: ${new Date(prescriptionData.updated_at).toLocaleString()}` : 'New medical record session'}
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {user?.role === 'doctor' && (
              <>
                <button onClick={onClose} className="btn btn-secondary" style={{ borderRadius: '12px' }}>Discard Changes</button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary" 
                  style={{ background: '#f97316', borderColor: '#f97316', gap: 10, padding: '12px 32px', borderRadius: '14px', minWidth: 200 }}
                >
                  {saving ? <div className="spinner-sm" /> : <><Save size={18} /> {prescriptionData ? 'Update' : 'Issue'} & Send</>}
                </button>
              </>
            )}
            <button 
              onClick={handleGeneratePDF}
              className="btn btn-primary"
              style={{ borderRadius: '14px', gap: 10, background: user?.role === 'doctor' ? 'var(--gray-800)' : '#f97316', borderColor: user?.role === 'doctor' ? 'var(--border-color)' : '#f97316' }}
            >
              <Download size={18} /> {user?.role === 'doctor' ? 'Preview PDF' : 'Download Prescription PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
