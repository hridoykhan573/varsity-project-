import api from './axiosInstance'

export const getHealthBlogs = () => api.get('/api/vet/health-blogs/')
export const getHealthBlogBySlug = (slug) => api.get(`/api/vet/health-blogs/${slug}/`)

// Doctor specific endpoints
export const createHealthBlog = (data) => api.post('/api/vet/health-blogs/', data, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

export const updateHealthBlog = (slug, data) => api.patch(`/api/vet/health-blogs/${slug}/`, data, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

export const deleteHealthBlog = (slug) => api.delete(`/api/vet/health-blogs/${slug}/`)

// Comments
export const getHealthBlogComments = (slug) => api.get(`/api/vet/health-blogs/${slug}/comments/`)
export const addHealthBlogComment = (slug, content) => api.post(`/api/vet/health-blogs/${slug}/comments/`, { content })
