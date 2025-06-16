import { defineStore } from 'pinia'
import {ref} from "vue";


export interface Authority {
    authority: string
}

export interface AuthResponse {
    authorities: Authority[]
    token: string
}


export const useAuthStore = defineStore('auth', () => {
    const token = ref('')
    const roles = ref<string[]>([])

    function login(data: AuthResponse) {
        token.value = data.token
        roles.value = data.authorities.map(a => a.authority)
    }

    function logout() {
        token.value = ''
        roles.value = []
    }

    function hasRole(role: string) {
        return roles.value.includes(role)
    }

    return {
        token,
        roles,
        login,
        logout,
        hasRole,
    }
}, {
    persist: true
})