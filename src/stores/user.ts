import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import type { User } from '@/types/User'
import type { DailyRewardStatus } from '@/types/DailyReward'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const dailyRewardsStatus = ref<DailyRewardStatus | null>(null)

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

  const maxDailyClicks = computed(() => {
    if (user.value?.maxDailyClicks !== undefined) {
      return user.value.maxDailyClicks
    }
    const lvl = Math.max(1, user.value?.level ?? 1)
    return 200 + (lvl - 1) * 100
  })

  const remainingDailyClicks = computed(() => {
    return user.value?.remainingDailyClicks ?? maxDailyClicks.value
  })

  const nextClickResetTime = computed(() => {
    return user.value?.nextClickResetTime ?? null
  })

  const dailyStreak = computed(() => {
    return user.value?.dailyStreak ?? 1
  })

  const canClaimDaily = computed(() => {
    if (dailyRewardsStatus.value?.canClaim !== undefined) {
      return dailyRewardsStatus.value.canClaim
    }
    return user.value?.canClaimDaily ?? false
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

  function addMoney(amount: number) {
    if (!user.value) return
    if (!user.value.slots) {
      user.value.slots = []
    }
    const slot = user.value.slots.find(s => s.item?.name === 'money')
    if (slot) {
      slot.count += amount
    } else {
      user.value.slots.push({
        id: Date.now(),
        item: { id: 2, name: 'money' },
        count: amount
      })
    }
  }

  function addItemToSlot(itemName: string, amount = 1) {
    if (!user.value) return
    if (!user.value.slots) {
      user.value.slots = []
    }
    const clean = itemName.toLowerCase().trim()
    const slot = user.value.slots.find(s => s.item?.name?.toLowerCase().trim() === clean)
    if (slot) {
      slot.count += amount
    } else {
      user.value.slots.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        item: { id: Date.now(), name: clean },
        count: amount
      })
    }
  }

  async function fetchDailyRewards() {
    try {
      const res = await api.get('/users/daily-rewards')
      if (res.data) {
        dailyRewardsStatus.value = res.data
        if (res.data.streak !== undefined && user.value) {
          user.value.dailyStreak = res.data.streak
        }
        if (res.data.canClaim !== undefined && user.value) {
          user.value.canClaimDaily = res.data.canClaim
        }
      }
      return res.data
    } catch (err) {
      console.warn('API /users/daily-rewards not available, using store defaults:', err)
      return null
    }
  }

  async function claimDailyReward(dayNumber: number) {
    try {
      const response = await api.post('/users/daily-rewards/claim', { day: dayNumber })
      if (response.data) {
        if (response.data.user) {
          user.value = response.data.user
        } else if (response.data.slots) {
          user.value = { ...user.value, ...response.data }
        }
      }
      await Promise.all([fetchUser(), fetchDailyRewards()])
      return response.data
    } catch (error) {
      console.error('API claimDailyReward error:', error)
      throw error
    }
  }

  return {
    user,
    money,
    strawberries,
    remainingDailyClicks,
    maxDailyClicks,
    nextClickResetTime,
    dailyStreak,
    canClaimDaily,
    dailyRewardsStatus,
    isLoading,
    fetchUser,
    fetchDailyRewards,
    setUser,
    decrementRemainingClicks,
    setRemainingClicks,
    addStrawberries,
    addMoney,
    claimDailyReward
  }
})
