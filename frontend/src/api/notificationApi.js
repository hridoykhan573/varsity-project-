import api from './axiosInstance'

export const getNotifications = () => api.get('/api/notifications/')
export const markRead         = (id) => api.patch(`/api/notifications/${id}/read/`)
export const markAllRead      = () => api.post('/api/notifications/mark_all_read/')
export const deleteNotification = (id) => api.delete(`/api/notifications/${id}/delete/`)
