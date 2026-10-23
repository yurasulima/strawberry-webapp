<script setup lang="ts">
import PixelButton from './PixelButton.vue'

const props = withDefaults(defineProps<{
  width?: number | string
  height?: number | string
  padding?: number | string
  disabled?: boolean
  loading?: boolean
  active?: boolean
  icon?: string
  playSound?: boolean
}>(), {
  width: 48,
  height: 48,
  padding: '4px'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <PixelButton
    texture="/ui/button_right.png"
    pressed-texture="/ui/button_right_pressed.png"
    :width="width"
    :height="height"
    :padding="padding"
    :disabled="disabled"
    :loading="loading"
    :active="active"
    :icon="icon"
    :play-sound="playSound"
    @click="emit('click', $event)"
  >
    <slot />
  </PixelButton>
</template>
