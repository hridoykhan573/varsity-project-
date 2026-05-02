import api from './axiosInstance'

export const requestEmergency = (latitude, longitude) => 
  api.post('/api/vet/emergencies/', { latitude, longitude })

export const getEmergencyDetails = (id) => 
  api.get(`/api/vet/emergencies/${id}/`)

export const getOnlineDoctors = () =>
  api.get('/api/vet/doctors/?is_online=true')
export const getMyEmergencyRequests = () =>
  api.get('/api/vet/emergencies/my_requests/')

// ── Admin Doctor Activity Control ──────────────────────────────
export const adminGetAllPrescriptions = (q = '') =>
  api.get(`/api/vet/admin/doctor-activity/prescriptions/?q=${q}`)

export const adminDeletePrescription = (id) =>
  api.delete(`/api/vet/admin/doctor-activity/${id}/prescriptions/delete/`)

export const adminGetAllConsultations = (statusFilter = 'active') =>
  api.get(`/api/vet/admin/doctor-activity/consultations/?status=${statusFilter}`)

export const adminForceEndConsultation = (id) =>
  api.post(`/api/vet/admin/doctor-activity/${id}/consultations/force-end/`)

export const adminReassignConsultation = (id, doctorId) =>
  api.post(`/api/vet/admin/doctor-activity/${id}/consultations/reassign/`, { doctor_id: doctorId })

export const adminGetDoctorFees = () =>
  api.get('/api/vet/admin/doctor-activity/fees/')

export const adminUpdateDoctorFee = (profileId, data) =>
  api.patch(`/api/vet/admin/doctor-activity/${profileId}/fees/update/`, data)

export const adminGetAllEmergencies = (statusFilter = '') =>
  api.get(`/api/vet/admin/doctor-activity/emergencies/?status=${statusFilter}`)
