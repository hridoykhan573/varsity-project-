import api from './axiosInstance'

export const fetchProducts = (params) => api.get('/api/products/', { params })
export const fetchProduct = (id) => api.get(`/api/products/${id}/`)
export const createProduct = (data) => api.post('/api/products/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
})
export const updateProduct = (id, data) => api.put(`/api/products/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
})
export const deleteProduct = (id) => api.delete(`/api/products/${id}/`)
export const getMyOrders = (params) => api.get('/api/products/orders/my/', { params })
