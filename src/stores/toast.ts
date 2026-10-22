import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastItem {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])
  let nextId = 1

  function showToast(text: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) {
    if (!text) return
    const id = nextId++
    toasts.value.push({ id, text, type })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    showToast,
    removeToast
  }
})
