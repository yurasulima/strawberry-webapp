<script setup lang="ts">
import PixelButton from './PixelButton.vue'

const props = withDefaults(defineProps<{
  size?: number | string
  padding?: number | string
  disabled?: boolean
  loading?: boolean
  active?: boolean
  icon?: string
  playSound?: boolean
}>(), {
  size: 64,
  padding: '6px'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <PixelButton
    texture="/ui/button_left.png"
    pressed-texture="/ui/button_left_pressed.png"
    :size="size"
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
