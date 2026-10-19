import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
    baseURL: 'https://strawberryapi.dangerous.pp.ua/',
    timeout: 10000
})
// const api = axios.create({
//     baseURL: 'http://localhost:9090/',
//     timeout: 10000
// })

api.interceptors.request.use(
    (config) => {
        const auth = useAuthStore()
        let token = auth.token

        if (typeof token !== 'string' || !/^[\x00-\x7F]*$/.test(token)) {
            auth.logout()
            token = ''
        }

        if (token && token.trim().length > 0) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

export default api
