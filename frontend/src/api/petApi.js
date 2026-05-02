import api from './axiosInstance'

export const getPets       = (params) => api.get('/api/pets/', { params })
export const getPet        = (id)     => api.get(`/api/pets/${id}/`)
export const createPet     = (data)   => api.post('/api/pets/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updatePet = (id, data) => {
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData
  return api.patch(`/api/pets/${id}/`, data, isForm ? {} : { headers: { 'Content-Type': 'application/json' } })
}
export const deletePet     = (id)     => api.delete(`/api/pets/${id}/`)
export const getMyPets     = ()       => api.get('/api/pets/mine/')
export const getMyPetHistory = ()     => api.get('/api/pets/mine/history/')
export const getPetHealth  = (id)     => api.get(`/api/pets/${id}/health/`)
export const addHealthRecord = (id, data) => api.post(`/api/pets/${id}/health/`, data)
export const getPetCategoryCounts = ()  => api.get('/api/pets/categories/counts/')
export const getPlatformStats = () => api.get('/api/pets/stats/')
export const syncPetVaccinations = (id) => api.post(`/api/pets/${id}/health/sync-vaccinations/`)
