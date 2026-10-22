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
  width: 64,
  height: 64,
  padding: '6px'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <PixelButton
    texture="/ui/button_ok.png"
    pressed-texture="/ui/button_ok_pressed.png"
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
