import api from './axiosInstance'

export const getBootcamps = (params) => api.get('/api/bootcamps/', { params })
export const getBootcamp  = (id)     => api.get(`/api/bootcamps/${id}/`)
export const createBootcamp = (data) => api.post('/api/bootcamps/', data)
export const updateBootcamp = (id, data) => api.patch(`/api/bootcamps/${id}/`, data)
export const deleteBootcamp = (id)     => api.delete(`/api/bootcamps/${id}/`)
export const toggleCalendarMark = (id) => api.post(`/api/bootcamps/${id}/toggle_calendar/`)
export const getMyCalendarBootcamps = () => api.get('/api/bootcamps/my_calendar/')
export const getMyBootcamps = () => api.get('/api/bootcamps/mine/')
