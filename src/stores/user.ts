import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { User } from '@/types/User'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  const money = computed(() => {
    if (!user.value?.slots) return 0
    const moneySlot = user.value.slots.find(slot => slot.item?.name === 'money')
    return moneySlot?.count || 0
  })

  const strawberries = computed(() => {
    if (!user.value?.slots) return 0
    const strawberrySlot = user.value.slots.find(slot => slot.item?.name === 'strawberry')
    return strawberrySlot?.count || 0
  })

  const remainingDailyClicks = computed(() => {
    return user.value?.remainingDailyClicks ?? 200
  })

  const nextClickResetTime = computed(() => {
    return user.value?.nextClickResetTime ?? null
  })

  async function fetchUser() {
    isLoading.value = true
    try {
      const response = await api.get<User>('/users/me')
      user.value = response.data
      return response.data
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      isLoading.value = false
    }
  }

  function setUser(userData: User) {
    user.value = userData
  }

  function decrementRemainingClicks(amount = 1) {
    if (user.value && user.value.remainingDailyClicks !== undefined) {
      user.value.remainingDailyClicks = Math.max(0, user.value.remainingDailyClicks - amount)
    }
  }

  function setRemainingClicks(remaining: number, resetTime?: string | null) {
    if (user.value) {
      user.value.remainingDailyClicks = remaining
      if (resetTime !== undefined) {
        user.value.nextClickResetTime = resetTime
      }
    }
  }

  function addStrawberries(amount = 1) {
    if (!user.value) return
    if (!user.value.slots) {
      user.value.slots = []
    }
    const slot = user.value.slots.find(s => s.item?.name === 'strawberry')
    if (slot) {
      slot.count += amount
    } else {
      user.value.slots.push({
        id: Date.now(),
        item: { id: 1, name: 'strawberry' },
        count: amount
      })
    }
  }

  return {
    user,
    money,
    strawberries,
    remainingDailyClicks,
    nextClickResetTime,
    isLoading,
    fetchUser,
    setUser,
    decrementRemainingClicks,
    setRemainingClicks,
    addStrawberries
  }
})
