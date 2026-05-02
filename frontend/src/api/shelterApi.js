import api from './axiosInstance'

export const getShelters      = (params) => api.get('/api/shelters/', { params })
export const getMyShelters    = ()       => api.get('/api/shelters/mine/')
export const getShelter       = (id)     => api.get(`/api/shelters/${id}/`)
export const createShelter    = (data)   => api.post('/api/shelters/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateShelter    = (id, data) => api.patch(`/api/shelters/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getShelterServices = (id)  => api.get(`/api/shelters/${id}/services/`)
export const addShelterService  = (id, data) => api.post(`/api/shelters/${id}/services/`, data)
export const getShelterReviews  = (id)  => api.get(`/api/reviews/?shelter=${id}`)
export const deleteShelter      = (id)  => api.delete(`/api/shelters/${id}/`)

// ── Reports ──────────────────────────────────────────────────────────────────
export const fetchAdoptionReport = (params) => api.get('/api/shelters/reports/adoptions/', { params })
export const fetchHealthReport   = (params) => api.get('/api/shelters/reports/health/', { params })
export const fetchBookingReport  = (params) => api.get('/api/shelters/reports/bookings/', { params })
export const fetchRevenueReport  = (params) => api.get('/api/shelters/reports/revenue/', { params })
