<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user'
import CatSprite from '@/components/pixel/CatSprite.vue'
import MyCatModal from '@/components/MyCatModal.vue'
import { playClickSound, playMeowSound, startPurr, stopPurr } from '@/services/sound'
import api from '@/services/api'

const userStore = useUserStore()
const showCatModal = ref(false)
const isPetted = ref(false)
const hearts = ref<{ id: number; x: number; y: number }[]>([])
let heartId = 0

const myCat = computed(() => userStore.user?.cat)

// Якщо котик підібраний, але ще не має імені — авто-відкриваємо модалку для створення імені
watch(myCat, (cat) => {
  if (cat && (!cat.name || cat.name.trim() === '')) {
    showCatModal.value = true
  }
}, { immediate: true })

// Налаштування реакцій котика на тапи
const MEOW_CHANCE = 0.25      // ймовірність нявкнути при звичайному тапі
const PURR_TAPS = 5           // скільки тапів поспіль запускають мурчання
const TAP_RESET_MS = 1200     // пауза між тапами, після якої серія скидається
const PURR_STOP_MS = 2500     // скільки мурчить після останнього тапа

let tapCount = 0
let tapResetTimer: ReturnType<typeof setTimeout> | null = null
let purrStopTimer: ReturnType<typeof setTimeout> | null = null

function handleCatSounds() {
  tapCount++
  if (tapResetTimer) clearTimeout(tapResetTimer)
  tapResetTimer = setTimeout(() => (tapCount = 0), TAP_RESET_MS)

  if (tapCount >= PURR_TAPS) {
    startPurr()
    if (purrStopTimer) clearTimeout(purrStopTimer)
    purrStopTimer = setTimeout(() => stopPurr(), PURR_STOP_MS)
  } else if (Math.random() < MEOW_CHANCE) {
    playMeowSound()
  }
}

onBeforeUnmount(() => {
  if (tapResetTimer) clearTimeout(tapResetTimer)
  if (purrStopTimer) clearTimeout(purrStopTimer)
  stopPurr(200)
})

async function petCat(e: MouseEvent) {

  handleCatSounds()

  isPetted.value = true
  setTimeout(() => (isPetted.value = false), 350)

  // Сердечко
  const id = heartId++
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = rect.left + rect.width / 2 + (Math.random() * 20 - 10)
  const y = rect.top + (Math.random() * 10)

  hearts.value.push({ id, x, y })
  setTimeout(() => {
    hearts.value = hearts.value.filter(h => h.id !== id)
  }, 750)

  if (myCat.value) {
    myCat.value.pettedCount = (myCat.value.pettedCount || 0) + 1
    try {
      await api.post('/cats/pet')
    } catch (err) {
      // ignore
    }
  }
}

function openModal() {
  playClickSound()
  showCatModal.value = true
}
</script>

<template>
  <div v-if="myCat" class="cat-companion-wrapper">
    <div class="cat-companion" :class="{ 'is-petted': isPetted }" @click="petCat">
      <div class="cat-bubble" @click.stop="openModal" title="Налаштувати ім'я котика">
        <span>{{ myCat.name || "Назвати котика" }}</span>
      </div>

      <div class="cat-sprite-box">
        <CatSprite
            :colors="myCat.colors"
            :size="72"
            :playing="true"
        />
      </div>
    </div>

    <!-- Сердечка при погладжуванні -->
    <Teleport to="body">
      <div class="hearts-layer">
        <img
            v-for="h in hearts"
            :key="h.id"
            class="floating-heart"
            src="/ui/heart.png"
            alt=""
            draggable="false"
            :style="{ left: `${h.x}px`, top: `${h.y}px` }"
        />
      </div>
    </Teleport>

    <!-- Модалка огляду/встановлення імені котика -->
    <MyCatModal v-model="showCatModal" />
  </div>
</template>

<style scoped>
.cat-companion-wrapper {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  pointer-events: auto;
}

.cat-companion {
  display: flex;
  flex-direction: column;
  align-items: start;
  cursor: grab;
  transition: transform 0.15s ease;
}

.cat-companion:active {
  cursor: grabbing;
}

.cat-companion.is-petted {
  animation: cat-bounce 0.35s ease-in-out;
}

.cat-bubble {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #fff8eb;
  border: 1px solid #5d4037;
  border-radius: 6px;
  padding: 2px 6px;
  font-family: var(--font-pixel), sans-serif;
  font-size: 11px;
  font-weight: bold;
  color: #3f2e21;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-bottom: 2px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.cat-bubble:hover {
  transform: scale(1.06);
  background: #fff0d6;
}

.bubble-icon {
  font-size: 10px;
}

.cat-sprite-box {
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));
}

@keyframes cat-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.15) translateY(-6px); }
  100% { transform: scale(1); }
}

.hearts-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

.floating-heart {
  position: fixed;
  width: 20px;
  height: 20px;
  image-rendering: pixelated;
  animation: float-up-heart 0.75s ease-out forwards;
}

@keyframes float-up-heart {
  0% {
    opacity: 1;
    transform: translate(-50%, 0) scale(0.6);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -24px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -48px) scale(0.8);
  }
}
</style>