import api from './axiosInstance'

export const getAdoptions    = (params) => api.get('/api/adoptions/', { params })
export const sendAdoption    = (data)   => api.post('/api/adoptions/', data)
export const updateAdoption  = (id, data) => api.patch(`/api/adoptions/${id}/`, data)
export const getMyAdoptions  = ()       => api.get('/api/adoptions/mine/')
export const getIncomingAdoptions = ()  => api.get('/api/adoptions/incoming/')
export const deleteAdoption  = (id)     => api.delete(`/api/adoptions/${id}/`)
