<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { playClickSound, playSuccessSound } from '@/services/sound'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    isOpen?: boolean
    size?: number | string
    title?: string
    disabled?: boolean
    interactive?: boolean
    texture?: string
    frameRateMs?: number
  }>(),
  {
    modelValue: false,
    isOpen: undefined,
    size: 96,
    title: '',
    disabled: false,
    interactive: true,
    texture: '/ui/chest.png',
    frameRateMs: 80
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'open'): void
  (e: 'click', event: MouseEvent): void
}>()

// Спрайт 3x3, кадри 0..8 (зліва направо, зверху вниз)
const GRID = 3
const CLOSED_FRAME = 0
const OPEN_FRAME = 8

const localOpen = ref(props.isOpen ?? props.modelValue)
const currentFrame = ref(localOpen.value ? OPEN_FRAME : CLOSED_FRAME)
const isAnimating = ref(false)
let animTimer: ReturnType<typeof setInterval> | null = null

function syncFrameWithOpenState(open: boolean) {
  if (isAnimating.value) return
  localOpen.value = open
  currentFrame.value = open ? OPEN_FRAME : CLOSED_FRAME
}

watch(
  () => props.isOpen ?? props.modelValue,
  (val) => {
    syncFrameWithOpenState(val)
  }
)

const col = computed(() => currentFrame.value % GRID)
const row = computed(() => Math.floor(currentFrame.value / GRID))

const numericSize = computed(() => {
  if (typeof props.size === 'number') return props.size
  const parsed = parseFloat(props.size)
  return isNaN(parsed) ? 96 : parsed
})

// Кадр показуємо через background-position — браузер нічого не розтягує
const cropStyle = computed(() => {
  const s = numericSize.value
  return {
    width: `${s}px`,
    height: `${s}px`,
    backgroundImage: `url(${props.texture})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${s * GRID}px ${s * GRID}px`,
    backgroundPosition: `${-col.value * s}px ${-row.value * s}px`
  }
})

function stopAnimation() {
  if (animTimer) {
    clearInterval(animTimer)
    animTimer = null
  }
  isAnimating.value = false
}

function playOpenAnimation() {
  stopAnimation()
  isAnimating.value = true
  currentFrame.value = CLOSED_FRAME

  animTimer = setInterval(() => {
    if (currentFrame.value < OPEN_FRAME) {
      currentFrame.value++
    } else {
      stopAnimation()
      localOpen.value = true
      playSuccessSound()
      emit('update:modelValue', true)
      emit('open')
    }
  }, props.frameRateMs)
}

function handleClick(e: MouseEvent) {
  emit('click', e)

  if (props.disabled || !props.interactive || isAnimating.value) return

  if (!localOpen.value) {
    playClickSound()
    playOpenAnimation()
  }
}

onBeforeUnmount(() => {
  stopAnimation()
})
</script>

<template>
  <div
    class="chest-container"
    :class="{
      'is-open': localOpen,
      'is-animating': isAnimating,
      'is-disabled': disabled,
      'is-interactive': interactive && !disabled
    }"
  >
    <div
      class="chest-box"
      :style="{ width: `${numericSize}px`, height: `${numericSize}px` }"
      @click="handleClick"
    >
      <!-- Сяйво при відкритті -->
      <div v-if="localOpen || currentFrame > 4" class="chest-glow"></div>

      <!-- Один кадр спрайтшиту -->
      <div class="chest-crop" :style="cropStyle" role="img" aria-label="Chest"></div>

      <!-- Слот для нагороди / дропу -->
      <div v-if="localOpen" class="chest-drop-slot">
        <slot name="drop" />
        <slot />
      </div>
    </div>

    <span v-if="title" class="chest-title">{{ title }}</span>
  </div>
</template>

<style scoped>
.chest-container {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
  box-sizing: border-box;
}

.chest-box {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chest-container.is-interactive .chest-box {
  cursor: pointer;
}

.chest-container.is-disabled .chest-box {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Один кадр спрайту */
.chest-crop {
  position: relative;
  z-index: 1;
  display: block;
  flex-shrink: 0;
  overflow: hidden;
  box-sizing: border-box;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
  pointer-events: none;
  transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chest-container.is-interactive:hover .chest-crop {
  transform: scale(1.08) translateY(-2px);
}

.chest-container.is-interactive:active .chest-crop {
  transform: scale(0.94) translateY(1px);
}

.chest-container.is-open .chest-crop {
  filter: drop-shadow(0 6px 14px rgba(255, 215, 0, 0.85));
}

.chest-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(255, 215, 0, 0.6) 0%,
    rgba(255, 160, 0, 0.2) 50%,
    rgba(0, 0, 0, 0) 70%
  );
  border-radius: 50%;
  pointer-events: none;
  animation: glow-pulse 1.8s ease-in-out infinite alternate;
  z-index: 0;
}

.chest-drop-slot {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  animation: drop-appear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.chest-title {
  margin-top: 6px;
  font-family: var(--font-pixel), sans-serif;
  font-size: 14px;
  font-weight: bold;
  color: #3f2e21;
  text-align: center;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

@keyframes glow-pulse {
  0% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.15);
  }
}

@keyframes drop-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, 20px) scale(0.3);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -10px) scale(1);
  }
}
</style>