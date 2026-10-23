<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
import { playHarvestSound, playCoinSound } from '@/services/sound'
import { ButtonText } from '@/components/pixel'
import { useUserStore } from "@/stores/user.ts"
import { useToastStore } from "@/stores/toast.ts"

const { t } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

let particleId = 0
const count = ref(0)
const isClicking = ref(false)
const isSelling = ref(false)
const particles = ref<{ id: number; offsetX: number; offsetY: number }[]>([])
let pendingClicks = 0

onMounted(async () => {
  localStorage.removeItem("clicker-ban")

  try {
    const response = await api.get('/slots/count', { params: { name: 'strawberry' } })
    count.value = response.data.count ?? 0
  } catch {}

  setInterval(flushClicks, 2000)

  window.addEventListener("beforeunload", () => {
    if (pendingClicks > 0) {
      const data = JSON.stringify({ name: "strawberry", count: pendingClicks })
      navigator.sendBeacon("/api/slots/take", data)
    }
  })
})

const flushClicks = async () => {
  if (pendingClicks === 0) return

  try {
    const response = await api.post('/slots/take', { name: 'strawberry', count: pendingClicks })
    count.value = response.data
    pendingClicks = 0
    await userStore.fetchUser()
  } catch (error: any) {
    console.error("Помилка при відправці кліків:", error)
    const errText = error.response?.data?.message || error.response?.data || t('clicker.daily_limit_reached')
    const messageStr = typeof errText === 'string' ? errText : JSON.stringify(errText)
    toastStore.showToast(messageStr, 'error')
    pendingClicks = 0
  }
}

const handleClick = () => {
  playHarvestSound()

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
            @click="$emit('click')"
        >
          <img
              src="/ui/strawberry.png"
              alt="Strawberry"
              oncontextmenu="return false;"
              class="strawberry-icon"
              :class="{ 'pop-animation': isClicking }"
          />
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

      <p class="strawberry-count">{{ t('clicker.strawberries') }}: {{ count }}</p>

      <ButtonText
          height="64"
          padding="12px 20px"
          :loading="isSelling"
          :disabled="count <= 0 && pendingClicks === 0"
          @click="sellAllStrawberries"
      >
        {{ t('clicker.sell_all') }}
      </ButtonText>
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
}

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
}

.strawberry-button:active {
  transform: translateY(3px);
  box-shadow: 0 3px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
}

.strawberry-icon {
  width: 200px;
  height: 200px;
  image-rendering: pixelated;
  transition: transform 0.1s ease-in-out;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  touch-action: manipulation;
}

.strawberry-count {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 2px 2px #1c1d2e;
  margin: 5px 0;
  font-family: var(--font-pixel);
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
