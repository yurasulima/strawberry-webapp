import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
    baseURL: 'https://strawberryapi.mblueberry.fun/',
    timeout: 10000
})
// const api = axios.create({
//     baseURL: 'http://localhost:9090/',
//     timeout: 10000
// })

api.interceptors.request.use(
    (config) => {
        const auth = useAuthStore()
        const token = auth.token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

export default api