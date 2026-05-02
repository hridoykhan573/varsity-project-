import axiosInstance from './axiosInstance'

export const getAdminUsers = () => axiosInstance.get('/accounts/users/')
export const getAdminShelters = () => axiosInstance.get('/shelters/admin/all/')

export const verifyShelter = (id, data) => axiosInstance.patch(`/shelters/${id}/`, data)

export const fetchAdminAnalytics = (params) => axiosInstance.get('/accounts/analytics/', { params })
