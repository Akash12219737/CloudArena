import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  me: () => api.get('/users/me'),
  updateProfile: (data: { username?: string; email?: string }) =>
    api.patch('/users/me', data),
}

// ── Labs ──────────────────────────────────────────────────────────────────────
export const labApi = {
  create: (lab_type: string) => api.post('/labs', { lab_type }),
  list: () => api.get('/labs'),
  get: (id: number) => api.get(`/labs/${id}`),
  getPodStatus: (id: number) => api.get(`/labs/${id}/pod-status`),
  delete: (id: number) => api.delete(`/labs/${id}`),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  listUsers: () => api.get('/admin/users'),
  listActiveLabs: () => api.get('/admin/labs/active'),
  forceDeleteLab: (id: number) => api.delete(`/admin/labs/${id}`),
}
