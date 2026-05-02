import api from './axiosInstance'

export const getBookings    = (params) => api.get('/api/bookings/', { params })
export const getMyBookings  = ()       => api.get('/api/bookings/mine/')
export const createBooking  = (data)   => api.post('/api/bookings/', data)
export const updateBooking  = (id, data) => api.patch(`/api/bookings/${id}/`, data)
export const cancelBooking  = (id)     => api.patch(`/api/bookings/${id}/`, { status: 'cancelled' })
export const deleteBooking  = (id)     => api.delete(`/api/bookings/${id}/`)
export const trackOrder     = (orderId) => api.get('/api/bookings/track/', { params: { order_id: orderId } })
