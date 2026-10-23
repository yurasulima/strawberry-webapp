<script setup lang="ts">
import PixelButton from './PixelButton.vue'

const props = withDefaults(defineProps<{
  width?: number | string
  padding?: number | string
  disabled?: boolean
  loading?: boolean
  active?: boolean
  icon?: string
  playSound?: boolean
}>(), {
  width: 'auto',
  padding: '0 24px'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <PixelButton
      class="text-button"
      texture="/ui/button_text.9.png"
      pressed-texture="/ui/button_text_pressed.9.png"
      :width="width"
      :height="50"
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

<style scoped>
.text-button {
  font-family: 'Crumbline', sans-serif;
  font-size: 16px;
  line-height: 1;
}

.text-button :deep(.btn-text) {
  line-height: 1;
  font-weight: normal;
  font-size: 20px;
  text-shadow: none;
}
</style>
