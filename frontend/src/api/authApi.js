import api from './axiosInstance'

export const register    = (data) => api.post('/api/auth/register/', data)
export const login       = (data) => api.post('/api/auth/login/', data)
export const logout      = (data) => api.post('/api/auth/logout/', data)
export const getProfile  = ()     => api.get('/api/auth/profile/')
export const updateProfile = (data) => api.patch('/api/auth/profile/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteProfile = ()     => api.delete('/api/auth/profile/')

export const forgotPassword = (data) => api.post('/api/auth/forgot-password/', data)
export const verifyCode = (data) => api.post('/api/auth/verify-code/', data)
export const resetPassword  = (data) => api.post('/api/auth/reset-password/', data)
export const changePassword = (data) => api.post('/api/auth/change-password/', data)
export const getPublicStats = ()     => api.get('/api/auth/public-stats/')

// Veterinary Doctor API
export const doctorRegister  = (data) => api.post('/api/vet/register/', data)
export const getDoctorProfile = ()    => api.get('/api/vet/profile/')
export const updateDoctorProfile = (data) => api.patch('/api/vet/profile/', data)
export const getDoctors = (params)    => api.get('/api/vet/doctors/', { params })

