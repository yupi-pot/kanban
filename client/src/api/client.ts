import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(original)),
            reject,
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        await api.post('/auth/refresh')
        processQueue(null)
        return api(original)
      } catch (e) {
        processQueue(e)
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
