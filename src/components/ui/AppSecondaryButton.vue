<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { playClickSound } from '@/services/sound'

const props = withDefaults(defineProps<{
  disabled?: boolean
  loading?: boolean
  icon?: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  disabled: false,
  loading: false,
  type: 'button'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

function handleClick(e: MouseEvent) {
  if (props.disabled || props.loading) return
  playClickSound()
  emit('click', e)
}
</script>

<template>
  <button
      :type="type"
      class="app-btn app-btn-secondary"
      :disabled="disabled || loading"
      @click="handleClick"
  >
    <span v-if="loading" class="btn-loading-dots">...</span>
    <Icon v-else-if="icon" :icon="icon" class="btn-icon" />
    <span v-if="!loading" class="btn-text"><slot /></span>
  </button>
</template>

<style scoped>
.app-btn-secondary {
  font-family: var(--font-pixel);
  font-size: 11px;
  padding: 8px 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  user-select: none;
  box-sizing: border-box;
  background-color: #e0d0b8;
  color: #3f2e21;
  border: 2px solid #5d4037;
  border-radius: 6px;
  box-shadow: 0 3px 0 #3e2723;
  transition: transform 0.05s ease, background-color 0.1s ease;
}

.app-btn-secondary:hover:not(:disabled) {
  background-color: #ebdcc4;
}

.app-btn-secondary:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #3e2723;
}

.app-btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.btn-loading-dots {
  font-size: 14px;
  font-weight: bold;
}
</style>
