<script setup lang="ts">
import { ref, computed, useSlots, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import NinePatch from '../NinePatch.vue'
import { playClickSound } from '@/services/sound'
import { preloadTexture } from '@/services/texturePreloader'

const props = withDefaults(defineProps<{
  width?: number | string
  height?: number | string
  padding?: number | string
  disabled?: boolean
  loading?: boolean
  active?: boolean
  icon?: string
  texture?: string
  pressedTexture?: string
  playSound?: boolean
}>(), {
  width: 64,
  height: 64,
  padding: '6px',
  disabled: false,
  loading: false,
  active: false,
  texture: '/ui/button_text.9.png',
  pressedTexture: '/ui/button_text_pressed.9.png',
  playSound: true
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const slots = useSlots()
const isPressed = ref(false)

function cssSize(value?: number | string): string {
  if (value === undefined) return 'auto'
  return typeof value === 'number' ? `${value}px` : value
}

const currentTexture = computed(() => {
  return ((isPressed.value || props.active) && !props.disabled)
    ? props.pressedTexture
    : props.texture
})

function handlePointerDown() {
  if (props.disabled || props.loading) return
  isPressed.value = true
}

function handlePointerUp() {
  isPressed.value = false
}

function handleClick(e: MouseEvent) {
  if (props.disabled || props.loading) return
  if (props.playSound) playClickSound()
  emit('click', e)
}

function preloadButtonTextures() {
  preloadTexture(props.texture)
  preloadTexture(props.pressedTexture)
}

onMounted(() => {
  preloadButtonTextures()
})

watch(() => [props.texture, props.pressedTexture], preloadButtonTextures)
</script>

<template>
  <button
    type="button"
    class="pixel-btn"
    :class="{ 'is-disabled': disabled, 'is-loading': loading, 'is-active': active, 'is-pressed': isPressed }"
    :disabled="disabled || loading"
    :style="{
      width: cssSize(width),
      height: cssSize(height),
      padding: cssSize(padding),
    }"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointerleave="handlePointerUp"
    @click="handleClick"
  >
    <NinePatch :src="currentTexture" class="pixel-btn__background" />

    <span class="pixel-btn__content">
      <span v-if="loading" class="btn-loading-dots">...</span>
      <Icon v-else-if="icon" :icon="icon" class="btn-icon" />
      <span v-if="slots.default && !loading" class="btn-text"><slot /></span>
    </span>
  </button>
</template>

<style scoped>
.pixel-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: transparent;
  border: none;
  margin: 0;
  cursor: pointer;
  user-select: none;
  font-family: inherit;
  font-size: 13px;
  color: #3f2e21;
  outline: none;
  flex-shrink: 0;
}

.pixel-btn.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pixel-btn__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pixel-btn__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transform: translateY(-2px);
  transition: transform 0.05s ease;
}

/* Зсув вмісту вниз при натисканні або активному стані */
.pixel-btn.is-pressed .pixel-btn__content,
.pixel-btn.is-active .pixel-btn__content,
.pixel-btn:active:not(.is-disabled) .pixel-btn__content {
  transform: translateY(1px);
}

.btn-text {
  display: inline-block;
  line-height: 1;
  white-space: nowrap;
  padding: 0 4px;
  text-shadow: none;
}

.btn-icon {
  font-size: 28px;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.btn-loading-dots {
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 2px;
}
</style>
