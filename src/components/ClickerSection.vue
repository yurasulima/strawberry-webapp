<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from "@/services/api.ts"
import { useI18n } from 'vue-i18n'
import { playHarvestSound, playCoinSound } from '@/services/sound'
import { ButtonText, Card } from '@/components/pixel'
import { useUserStore } from "@/stores/user.ts"
import { useAuthStore } from "@/stores/auth.ts"
import { useToastStore } from "@/stores/toast.ts"

const { t } = useI18n()
const userStore = useUserStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

let particleId = 0
const count = ref(0)
const isClicking = ref(false)
const isSelling = ref(false)
const particles = ref<{ id: number; offsetX: number; offsetY: number }[]>([])
let pendingClicks = 0

const formattedResetTime = ref('00:00:00')
let timerInterval: ReturnType<typeof setInterval> | null = null
let flushInterval: ReturnType<typeof setInterval> | null = null

const remainingClicks = computed(() => userStore.remainingDailyClicks)
const isLimitReached = computed(() => remainingClicks.value <= 0)
const usedClicks = computed(() => Math.min(200, Math.max(0, 200 - remainingClicks.value)))
const progressPercent = computed(() => Math.min(100, (usedClicks.value / 200) * 100))

const getTargetResetDate = (): Date => {
  if (userStore.nextClickResetTime) {
    const parsed = new Date(userStore.nextClickResetTime)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }
  const now = new Date()
  const currentHour = now.getHours()
  const nextHour = (Math.floor(currentHour / 6) + 1) * 6
  const target = new Date(now)
  if (nextHour >= 24) {
    target.setDate(target.getDate() + 1)
    target.setHours(0, 0, 0, 0)
  } else {
    target.setHours(nextHour, 0, 0, 0)
  }
  return target
}

const updateTimer = () => {
  const target = getTargetResetDate()
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) {
    formattedResetTime.value = '00:00:00'
    userStore.fetchUser()
    return
  }

  const diffSec = Math.floor(diffMs / 1000)
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  const seconds = diffSec % 60

  const pad = (n: number) => n.toString().padStart(2, '0')
  formattedResetTime.value = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const handleBeforeUnload = () => {
  if (pendingClicks > 0) {
    const body = JSON.stringify({ name: "strawberry", count: pendingClicks })
    const token = authStore.token
    const baseUrl = api.defaults.baseURL || 'https://strawberryapi.dangerous.pp.ua'

    fetch(`${baseUrl}/slots/take`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body,
      keepalive: true
    }).catch(() => {})
  }
}

onMounted(async () => {
  localStorage.removeItem("clicker-ban")

  try {
    const response = await api.get('/slots/count', { params: { name: 'strawberry' } })
    count.value = response.data.count ?? 0
  } catch {}

  await userStore.fetchUser()

  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
  flushInterval = setInterval(flushClicks, 2000)

  window.addEventListener("beforeunload", handleBeforeUnload)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (flushInterval) clearInterval(flushInterval)
  window.removeEventListener("beforeunload", handleBeforeUnload)
})

const flushClicks = async () => {
  if (pendingClicks === 0) return

  try {
    const response = await api.post('/slots/take', { name: 'strawberry', count: pendingClicks })
    if (typeof response.data === 'object' && response.data !== null) {
      count.value = response.data.count ?? count.value
      if (response.data.remainingDailyClicks !== undefined) {
        userStore.setRemainingClicks(response.data.remainingDailyClicks, response.data.nextClickResetTime)
      }
    } else {
      count.value = response.data
    }
    pendingClicks = 0
  } catch (error: any) {
    console.error("Помилка при відправці кліків:", error)
    pendingClicks = 0
    await userStore.fetchUser()
    const errText = error.response?.data?.message || error.response?.data || t('clicker.daily_limit_reached')
    const messageStr = typeof errText === 'string' ? errText : JSON.stringify(errText)
    toastStore.showToast(messageStr, 'error')
  }
}

const handleClick = () => {
  if (isLimitReached.value) {
    toastStore.showToast(t('clicker.limit_reached_toast', { time: formattedResetTime.value }), 'error')
    return
  }

  playHarvestSound()

  userStore.decrementRemainingClicks(1)
  userStore.addStrawberries(1)
  count.value++

  const button = document.querySelector('.strawberry-button') as HTMLElement
  if (button) {
    const buttonRect = button.getBoundingClientRect()
    const offsetX = Math.random() * buttonRect.width
    const offsetY = Math.random() * buttonRect.height

    particles.value.push({ id: particleId++, offsetX, offsetY })
  }

  pendingClicks++
  isClicking.value = true

  setTimeout(() => {
    if (particles.value.length > 0) {
      particles.value.shift()
    }
  }, 1000)

  setTimeout(() => (isClicking.value = false), 150)
}

const sellAllStrawberries = async (e: MouseEvent) => {
  e.stopPropagation()
  isSelling.value = true

  try {
    await flushClicks()
    const res = await api.post('/items/sell-all', { name: 'strawberry' })
    playCoinSound()
    count.value = 0
    const coins = res.data.coinsEarned ?? 0
    toastStore.showToast(t('clicker.sold_success', { coins }), 'success')
    await userStore.fetchUser()
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || t('clicker.no_strawberries_to_sell')
    toastStore.showToast(errorMsg, 'error')
  } finally {
    isSelling.value = false
  }
}
</script>

<template>
  <div class="clicker-container">
    <div class="clicker-section">



      <div class="click-area" @click="handleClick">
        <button
            class="strawberry-button"
            :class="{ 'strawberry-button--disabled': isLimitReached }"
            @click="$emit('click')"
        >
          <img
              src="/ui/strawberry.png"
              alt="Strawberry"
              oncontextmenu="return false;"
              class="strawberry-icon"
              :class="{ 'pop-animation': isClicking, 'disabled-icon': isLimitReached }"
          />
          <div v-if="isLimitReached" class="lock-overlay">
            <img src="/ui/lock.png" alt="Locked" class="lock-icon-img" />
          </div>
        </button>

        <div class="particles-container">
          <span
              v-for="p in particles"
              :key="p.id"
              class="particle-text"
              :style="{ left: `${p.offsetX}px`, top: `${p.offsetY}px` }"
          >
            {{ t('clicker.plusOne') }}
          </span>
        </div>
      </div>

<!--      <ButtonText-->
<!--          height="64"-->
<!--          padding="12px 20px"-->
<!--          :loading="isSelling"-->
<!--          :disabled="count <= 0 && pendingClicks === 0"-->
<!--          @click="sellAllStrawberries"-->
<!--      >-->
<!--        {{ t('clicker.sell_all') }}-->
<!--      </ButtonText>-->


      <Card v-if="isLimitReached" width="100%" height="auto" :padding="10" class="limit-card-wrapper">
        <div   class="limit-status-box">
          <div class="limit-alert-banner">
            <img src="/ui/lock.png" alt="Lock" class="limit-alert-icon" />
            <div class="limit-alert-text">
              <span class="alert-title">{{ t('clicker.limit_reached_title') }}</span>
              <span class="alert-timer">{{ t('clicker.limit_resets_in', { time: formattedResetTime }) }}</span>
            </div>
          </div>
        </div>
      </Card>

    </div>
  </div>
</template>

<style scoped>
.clicker-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.clicker-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;
}

/* Limit Status Box inside Card */
.limit-card-wrapper {
  width: 100%;
  box-sizing: border-box;
}

.limit-status-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: 'Crumbline', sans-serif;
  color: #3f2e21;
}

.limit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.limit-title {
  font-size: 18px;
  font-weight: normal;
  color: #3f2e21;
}

.limit-badge-max {
  background-color: #c62828;
  color: #ffffff;
  font-family: var(--font-pixel);
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #8e0000;
  animation: pulse-max 1.5s infinite;
}

@keyframes pulse-max {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Pixel Progress Frame */
.pixel-progress-frame {
  width: 100%;
  height: 12px;
  background-color: #e8d8c3;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 2px;
  box-sizing: border-box;
  overflow: hidden;
}

.pixel-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #2e7d32);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.pixel-progress-fill.fill-danger {
  background: linear-gradient(90deg, #e53935, #c62828);
}

.limit-timer-sub {
  font-size: 15px;
  color: #5d4037;
  text-align: right;
}

/* Alert Banner when Limit Reached */
.limit-alert-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffebee;
  border: 2px solid #c62828;
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 4px;
}

.limit-alert-icon {
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.limit-alert-text {
  display: flex;
  flex-direction: column;
}

.alert-title {
  font-size: 16px;
  color: #c62828;
  font-weight: bold;
}

.alert-timer {
  font-size: 15px;
  color: #3f2e21;
}

/* Click Area */
.click-area {
  position: relative;
  display: inline-block;
}

.strawberry-button {
  background-color: #b8cfce;
  border: 4px solid #7f8caa;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 6px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
  cursor: pointer;
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.strawberry-button:active:not(.strawberry-button--disabled) {
  transform: translateY(3px);
  box-shadow: 0 3px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
}

.strawberry-button--disabled {
  opacity: 0.8;
  cursor: not-allowed;
  box-shadow: 0 4px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
}

.strawberry-icon {
  width: 200px;
  height: 200px;
  image-rendering: pixelated;
  transition: transform 0.1s ease-in-out, filter 0.3s ease;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  touch-action: manipulation;
}

.disabled-icon {
  filter: grayscale(0.65) opacity(0.7);
}

.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(63, 46, 33, 0.25);
  border-radius: 8px;
}

.lock-icon-img {
  width: 56px;
  height: 56px;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}

.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.particle-text {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
  color: #ffa07a;
  animation: float-up-fade 1s ease-out forwards;
  text-shadow: 0 0 5px #000;
  white-space: nowrap;
}

@keyframes float-up-fade {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-70px) scale(1.2);
  }
}
</style>
