<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { playClickSound } from '@/services/sound'
import { preloadTexture } from '@/services/texturePreloader'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  enabled?: boolean
  disabled?: boolean
  size?: number | string
  width?: number | string
  height?: number | string
  playSound?: boolean
  textureEnabled?: string
  textureDisabled?: string
}>(), {
  modelValue: undefined,
  enabled: undefined,
  disabled: false,
  size: 32,
  playSound: true,
  textureEnabled: '/ui/button_sound_enabled.png',
  textureDisabled: '/ui/button_sound_disabled.png'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
  (e: 'click', event: MouseEvent): void
}>()

function cssSize(value?: number | string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && !isNaN(Number(value))) return `${value}px`
  return value
}

const isEnabled = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue
  if (props.enabled !== undefined) return props.enabled
  return true
})

const computedWidth = computed(() => {
  if (props.width !== undefined) return cssSize(props.width)
  if (props.size !== undefined) return cssSize(props.size)
  return '32px'
})

const computedHeight = computed(() => {
  if (props.height !== undefined) return cssSize(props.height)
  if (props.size !== undefined) return cssSize(props.size)
  return '32px'
})

const currentTexture = computed(() => {
  return isEnabled.value ? props.textureEnabled : props.textureDisabled
})

function handleClick(e: MouseEvent) {
  if (props.disabled) return
  const newValue = !isEnabled.value
  if (props.playSound) playClickSound()
  emit('update:modelValue', newValue)
  emit('change', newValue)
  emit('click', e)
}

function preloadTextures() {
  preloadTexture(props.textureEnabled)
  preloadTexture(props.textureDisabled)
}

onMounted(() => {
  preloadTextures()
})

watch(() => [props.textureEnabled, props.textureDisabled], preloadTextures)
</script>

<template>
  <button
    type="button"
    role="switch"
    class="pixel-sound-btn"
    :class="{ 'is-enabled': isEnabled, 'is-disabled': disabled }"
    :aria-checked="isEnabled"
    :disabled="disabled"
    :style="{
      width: computedWidth,
      height: computedHeight,
      minWidth: computedWidth,
      minHeight: computedHeight,
    }"
    @click="handleClick"
  >
    <img
      :src="currentTexture"
      :alt="isEnabled ? 'Sound Enabled' : 'Sound Disabled'"
      class="pixel-sound-btn__img"
    />
  </button>
</template>

<style scoped>
.pixel-sound-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  user-select: none;
  outline: none;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: transform 0.05s ease;
}

.pixel-sound-btn:active:not(.is-disabled) {
  transform: translateY(1px);
}

.pixel-sound-btn.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pixel-sound-btn__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
}
</style>
