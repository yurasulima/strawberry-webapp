import axios from 'axios';
import {useAuthStore} from "@/stores/auth.js";

const api = axios.create({
    baseURL: 'http://localhost:8081/',
    timeout: 10000,
});


api.interceptors.request.use(
    (config) => {

        const auth = useAuthStore();
        if (auth.token) {
            config.headers.Authorization = `Bearer ${auth.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
