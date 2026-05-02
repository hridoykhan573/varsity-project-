import api from './axiosInstance'

export const getReviews    = (params) => api.get('/api/reviews/', { params })
export const createReview  = (data)   => api.post('/api/reviews/', data)
export const updateReview  = (id, data) => api.patch(`/api/reviews/${id}/`, data)
export const deleteReview  = (id)     => api.delete(`/api/reviews/${id}/`)
