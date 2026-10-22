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
  padding: '0 24px' // тільки горизонтальний padding
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
      :height="64"
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
  font-family: 'Crumbline', monospace;
  font-size: 16px;
  line-height: 1;
}

/* :deep потрібен, бо .btn-text знаходиться всередині дочірнього компонента */
.text-button :deep(.btn-text) {
  line-height: 1;
  transform: translateY(1px);
  font-weight: normal;
  font-size: 26px;
  text-shadow:
      1px 0 0 currentColor,
      0 1px 0 rgba(255, 255, 255, 0.6); /* ваша світла підкладка */
}
</style>