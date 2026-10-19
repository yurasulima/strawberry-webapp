import { defineStore } from 'pinia'
import { ref } from "vue"

export interface Authority {
    authority: string
}

export const useAuthStore = defineStore('auth', () => {
    const token = ref('')
    const roles = ref<string[]>([])

    function login(data: any) {
        let rawToken = ''
        if (typeof data === 'string') {
            rawToken = data
        } else if (data && typeof data === 'object' && typeof data.token === 'string') {
            rawToken = data.token
        }

        if (rawToken && /^[\x00-\x7F]*$/.test(rawToken)) {
            token.value = rawToken
        } else {
            token.value = ''
        }
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
