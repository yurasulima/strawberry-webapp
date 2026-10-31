<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { CardPrimary, Card, ButtonText, SlideFade } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from '@/services/sound'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const emit = defineEmits<{
  (e: 'success'): void
}>()

const authStore = useAuthStore()
const userStore = useUserStore()
const toastStore = useToastStore()

const authKey = ref('')
const telegramLink = ref('')
const isLoading = ref(false)
const isChecking = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function generateKey() {
  const randomStr = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
  authKey.value = randomStr
  telegramLink.value = `https://t.me/StrawberryAppBot?start=auth_${randomStr}`
}

function openTelegramBot() {
  playClickSound()
  if (typeof window !== 'undefined') {
    window.location.href = telegramLink.value
  }
}

async function checkLoginStatus(silent = false) {
  if (!authKey.value || isLoading.value) return
  if (!silent) isChecking.value = true

  try {
    const res = await api.post('/auth/login-by-key', { key: authKey.value })
    if (res.data && res.data.token) {
      playPurchaseSound()
      authStore.login(res.data.token)
      if (res.data.userId) {
        userStore.setUser(res.data)
      } else {
        await userStore.fetchUser()
      }
      toastStore.showToast('Успішний вхід через Telegram!', 'success')
      stopPolling()
      emit('success')
    }
  } catch (err: any) {
    if (!silent) {
      const msg = err.response?.data?.message || 'Вхід ще не підтверджено у Telegram боті'
      toastStore.showToast(msg, 'error')
    }
  } finally {
    if (!silent) isChecking.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    checkLoginStatus(true)
  }, 2500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  generateKey()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="web-login-overlay">
    <SlideFade>
      <CardPrimary width="360px" height="auto" :padding="14">
        <div class="login-content">
          <div class="login-header">
            <img src="/items/strawberry.png" class="login-logo" alt="Strawberry" />
            <h2 class="login-title">Вхід у Strawberry Game</h2>
          </div>

          <Card width="100%" height="auto" :padding="12" class="login-box">
            <p class="login-desc">
              Для підтвердження входу відкрийте Telegram бота та натисніть «Start».
            </p>

            <div class="login-actions">
              <ButtonText height="50" width="100%" padding="8px 16px" @click="openTelegramBot">
                💬 Відкрити Telegram бота
              </ButtonText>

              <ButtonText
                height="48"
                width="100%"
                padding="8px 16px"
                :loading="isChecking"
                @click="() => checkLoginStatus(false)"
              >
                ✅ Продовжити (Перевірити вхід)
              </ButtonText>
            </div>
          </Card>
        </div>
      </CardPrimary>
    </SlideFade>
  </div>
</template>

<style scoped>
.web-login-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  color: #3f2e21;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.login-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  image-rendering: pixelated;
}

.login-title {
  margin: 0;
  font-size: 20px;
  color: #3f2e21;
  font-weight: bold;
}

.login-box {
  box-sizing: border-box;
}

.login-desc {
  font-size: 15px;
  color: #5d4037;
  text-align: center;
  margin: 0 0 12px;
  line-height: 1.3;
}

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
</style>
