<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { playClickSound } from '@/services/sound'
import { preloadTexture } from '@/services/texturePreloader'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  disabled?: boolean
  width?: number | string
  height?: number | string
  playSound?: boolean
  textureOn?: string
  textureOff?: string
}>(), {
  modelValue: false,
  disabled: false,
  width: 64,
  height: 32,
  playSound: true,
  textureOn: '/ui/switch_on.png',
  textureOff: '/ui/switch_off.png'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

function cssSize(value?: number | string): string {
  if (value === undefined) return 'auto'
  return typeof value === 'number' ? `${value}px` : value
}

const currentTexture = computed(() => {
  return props.modelValue ? props.textureOn : props.textureOff
})

function toggle() {
  if (props.disabled) return
  const newValue = !props.modelValue
  if (props.playSound) playClickSound()
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

function preloadTextures() {
  preloadTexture(props.textureOn)
  preloadTexture(props.textureOff)
}

onMounted(() => {
  preloadTextures()
})

watch(() => [props.textureOn, props.textureOff], preloadTextures)
</script>

<template>
  <button
    type="button"
    role="switch"
    class="pixel-switch"
    :class="{ 'is-on': modelValue, 'is-off': !modelValue, 'is-disabled': disabled }"
    :aria-checked="modelValue"
    :disabled="disabled"
    :style="{
      width: cssSize(width),
      height: cssSize(height),
    }"
    @click="toggle"
  >
    <img
      :src="currentTexture"
      alt="Switch"
      class="pixel-switch__img"
    />
  </button>
</template>

<style scoped>
.pixel-switch {
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
}

.pixel-switch.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pixel-switch__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  display: block;
}
</style>
