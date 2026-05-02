import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: BASE_URL,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = sessionStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
          sessionStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          sessionStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
