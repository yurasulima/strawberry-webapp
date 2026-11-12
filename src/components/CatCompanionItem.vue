<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user'
import CatSprite from '@/components/pixel/CatSprite.vue'
import { CatNameBadge } from '@/components/pixel'
import MyCatModal from '@/components/MyCatModal.vue'
import { playClickSound, playMeowSound, startPurr, stopPurr } from '@/services/sound'
import api from '@/services/api'
import type { UserCat } from '@/types/UserCat'

const props = defineProps<{
  cat: UserCat
  index: number
  total: number
}>()

const userStore = useUserStore()
const showCatModal = ref(false)
const isPetted = ref(false)
const hearts = ref<{ id: number; x: number; y: number }[]>([])
let heartId = 0

const myCat = computed(() => props.cat)

/* ───────── Перетягування котика вздовж тулбара ───────── */
const APP_MAX_WIDTH = 420          // ширина ігрової колонки (як .app-container)
const DRAG_THRESHOLD = 6           // px руху, після якого тап вважається перетягуванням
const CAT_SPACING = 110           // відстань між котиками за замовчуванням, px
const LEGACY_STORAGE_KEY = 'cat_offset_x'
const storageKey = computed(() => props.cat.id != null ? `cat_offset_x_${props.cat.id}` : `cat_offset_x_slot_${props.index}`)

const wrapperRef = ref<HTMLElement | null>(null)
const offsetX = ref(0)             // зсув від центру екрана, px
const isDragging = ref(false)
let suppressClick = false
let dragStartX = 0
let dragStartOffset = 0
let dragMoved = false

function maxOffset(): number {
  const half = Math.min(window.innerWidth, APP_MAX_WIDTH) / 2
  const catHalf = (wrapperRef.value?.offsetWidth ?? 72) / 2
  return Math.max(0, half - catHalf - 4)
}

function clampOffset(v: number): number {
  const m = maxOffset()
  return Math.min(m, Math.max(-m, v))
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  dragStartX = e.clientX
  dragStartOffset = offsetX.value
  dragMoved = false
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  const dx = e.clientX - dragStartX
  if (!dragMoved && Math.abs(dx) < DRAG_THRESHOLD) return
  dragMoved = true
  isDragging.value = true
  offsetX.value = clampOffset(dragStartOffset + dx)
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (dragMoved) {
    // click після перетягування не повинен рахуватись як погладжування
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
    try { localStorage.setItem(storageKey.value, String(Math.round(offsetX.value))) } catch {}
  }
  isDragging.value = false
}

function onResize() {
  offsetX.value = clampOffset(offsetX.value)
}

// Збережена позиція → (для єдиного котика) стара позиція → розкладка за індексом
function initOffset() {
  let saved: number | null = null
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (raw !== null && Number.isFinite(Number(raw))) saved = Number(raw)
    else if (props.total === 1) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy !== null && Number.isFinite(Number(legacy))) saved = Number(legacy)
    }
  } catch {}
  offsetX.value = clampOffset(saved ?? (props.index - (props.total - 1) / 2) * CAT_SPACING)
}

onMounted(() => {
  initOffset()
  window.addEventListener('resize', onResize)
})

// Додався/зник котик — перераховуємо позиції тих, у кого немає збереженої
watch(() => props.total, () => { if (!isDragging.value) initOffset() })

// Найновіший котик без імені — авто-відкриваємо модалку (старих безіменних не чіпаємо)
watch(myCat, (cat) => {
  if (props.index === 0 && cat && (!cat.name || cat.name.trim() === '')) {
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
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (tapResetTimer) clearTimeout(tapResetTimer)
  if (purrStopTimer) clearTimeout(purrStopTimer)
  stopPurr(200)
})

async function petCat(e: MouseEvent) {
  if (suppressClick) return

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
    userStore.patchCat({ ...myCat.value, pettedCount: (myCat.value.pettedCount || 0) + 1 })
    try {
      await api.post(myCat.value.id != null ? `/cats/${myCat.value.id}/pet` : '/cats/pet')
    } catch (err) {
      // ignore
    }
  }
}

function openModal() {
  if (suppressClick) return
  playClickSound()
  showCatModal.value = true
}
</script>

<template>
  <div
      v-if="myCat"
      ref="wrapperRef"
      class="cat-companion-wrapper"
      :class="{ 'is-dragging-wrapper': isDragging }"
      :style="{ left: `calc(50% + ${offsetX}px)` }"
  >
    <div
        class="cat-companion"
        :class="{ 'is-petted': isPetted, 'is-dragging': isDragging }"
    >
      <CatNameBadge
          class="cat-badge-hit"
          :name="myCat.name"
          @pointerdown="onPointerDown"
          @click.stop="openModal"
      />

      <!-- Реагує лише на непрозорі пікселі кота; решта спрайта пропускає кліки -->
      <div class="cat-sprite-box">
        <CatSprite
            :colors="myCat.colors"
            :size="100"
            :playing="true"
            hit-mask
            @pointerdown="onPointerDown"
            @click="petCat"
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
    <MyCatModal v-model="showCatModal" :cat-id="myCat.id ?? null" />
  </div>
</template>

<style scoped>
.cat-companion-wrapper {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  pointer-events: none; /* клікабельні лише бейдж і пікселі кота */
}

.cat-companion-wrapper.is-dragging-wrapper {
  z-index: 100;
}

.cat-companion {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transition: transform 0.15s ease;
}

.cat-badge-hit,
.cat-companion :deep(.cat-hit) {
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
}

.cat-companion.is-dragging .cat-badge-hit,
.cat-companion.is-dragging :deep(.cat-hit) {
  cursor: grabbing;
}

.cat-companion.is-petted {
  animation: cat-bounce 0.35s ease-in-out;
}

.cat-name-badge-el {
  margin-bottom: 4px;
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