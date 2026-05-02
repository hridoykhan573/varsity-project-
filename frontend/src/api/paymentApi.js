import api from './axiosInstance'

export const createPayment = (data) => api.post('/api/payments/create/', data)
export const getMyPayments = () => api.get('/api/payments/')
export const getPaymentDetail = (id) => api.get(`/api/payments/${id}/`)

// bKash PGW
export const createBKashPayment = (data) => api.post('/api/payments/bkash/create/', data)
export const executeBKashPayment = (data) => api.post('/api/payments/bkash/execute/', data)
