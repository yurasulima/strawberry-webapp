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
      class="app-btn app-btn-primary honeywood-btn"
      :disabled="disabled || loading"
      @click="handleClick"
  >
    <Icon v-if="loading" icon="pixelarticons:reload" class="btn-icon spin" />
    <Icon v-else-if="icon" :icon="icon" class="btn-icon" />
    <span class="btn-text"><slot /></span>
  </button>
</template>

<style scoped>
.app-btn {
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
}

.btn-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.btn-icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
