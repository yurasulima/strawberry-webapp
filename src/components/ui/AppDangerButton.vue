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
      class="app-btn app-btn-danger"
      :disabled="disabled || loading"
      @click="handleClick"
  >
    <span v-if="loading" class="btn-loading-dots">...</span>
    <Icon v-else-if="icon" :icon="icon" class="btn-icon" />
    <span v-if="!loading" class="btn-text"><slot /></span>
  </button>
</template>

<style scoped>
.app-btn-danger {
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
  background-color: #c62828;
  color: #ffffff;
  border: 2px solid #5c0a0a;
  border-radius: 6px;
  box-shadow: 0 3px 0 #3e0000;
  transition: transform 0.05s ease, background-color 0.1s ease;
}

.app-btn-danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

.app-btn-danger:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #3e0000;
}

.app-btn-danger:disabled {
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
