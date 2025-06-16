<script setup lang="ts">
import { defineProps, defineEmits, ref, onMounted } from 'vue'
import api from "@/services/api.ts";
import { useAuthStore } from "@/stores/auth.ts";

const emit = defineEmits<{
  (e: 'click'): void
}>()
let particleId = 0
const count = ref(0)
const isClicking = ref(false)
const isBanned = ref(false)
const banExpiresAt = ref<number | null>(null)

const particles = ref<{ id: number; offsetX: number; offsetY: number }[]>([])

const clickTimestamps: number[] = []

const auth = useAuthStore()

onMounted(async () => {
  try {
    // При завантаженні можна отримати поточний лічильник полуничок з API
    const response = await api.get('/slots/count', { params: { name: 'strawberry' } })
    count.value = response.data.count ?? 0
  } catch {
    // Якщо не вийшло, залишаємо count = 0
  }

  const banUntil = localStorage.getItem("clicker-ban")
  if (banUntil) {
    const now = Date.now()
    const banTime = parseInt(banUntil)
    if (banTime > now) {
      isBanned.value = true
      banExpiresAt.value = banTime
    } else {
      localStorage.removeItem("clicker-ban")
    }
  }

  setInterval(() => {
    if (isBanned.value && banExpiresAt.value && Date.now() >= banExpiresAt.value) {
      isBanned.value = false
      banExpiresAt.value = null
      localStorage.removeItem("clicker-ban")
    }
  }, 1000)
})

const checkAutoClicker = () => {
  const now = Date.now()
  while (clickTimestamps.length && now - clickTimestamps[0] > 5000) {
    clickTimestamps.shift()
  }
  if (clickTimestamps.length > 100) {
    const banUntil = now + 15 * 60 * 1000
    localStorage.setItem("clicker-ban", banUntil.toString())
    banExpiresAt.value = banUntil
    isBanned.value = true
  }
}

const handleClick = async () => {
  if (isBanned.value) return

  const now = Date.now()
  clickTimestamps.push(now)
  checkAutoClicker()

  // Виклик API для додавання полунички
  count.value++
  try {
    await api.post('/slots/take', { name: 'strawberry' })
  } catch (error) {
    console.error('Помилка при додаванні полунички:', error)
  }

  isClicking.value = true

  const button = document.querySelector('.strawberry-button') as HTMLElement;
  if (button) {
    const buttonRect = button.getBoundingClientRect();
    const randomOffsetX = Math.random() * buttonRect.width;
    const randomOffsetY = Math.random() * buttonRect.height;
    particles.value.push({ id: particleId++, offsetX: randomOffsetX, offsetY: randomOffsetY });
  }

  setTimeout(() => {
    particles.value.shift()
  }, 1000)

  setTimeout(() => (isClicking.value = false), 150)
}
</script>


<template>
  <p v-if="isBanned && banExpiresAt" class="ban-message">
    🚫 Ви забанені за автоклік до {{ new Date(banExpiresAt).toLocaleTimeString() }}
  </p>
  <div @click="handleClick" class="clicker-section">
    <div class="click-area">
      <button
          class="strawberry-button"
          @click="$emit('click')"
          :disabled="isBanned"
      >
        <img
            src="/strawberry.png"
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
          +1
        </span>
      </div>
    </div>

    <p class="strawberry-count">Полуничок: {{ count }}</p>
  </div>
</template>

<style scoped>
.clicker-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
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

.strawberry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: 0 4px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
}

.strawberry-button:active:not(:disabled) {
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

.strawberry-icon.pop-animation {
  transform: scale(1.15);
}

.strawberry-count {
  font-size: 28px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 2px 2px #1c1d2e;
  margin-top: 15px;
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
