import api from './axiosInstance'

export const submitComplaint = (formData) => {
  return api.post('/api/complaints/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const getComplaints = () => {
  return api.get('/api/complaints/')
}

export const resolveComplaint = (id) => {
  return api.patch(`/api/complaints/${id}/`, { status: 'RESOLVED' })
}
