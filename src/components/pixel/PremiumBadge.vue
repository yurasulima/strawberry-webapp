<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(defineProps<{
  text?: string
  showIcon?: boolean
}>(), {
  text: 'PRO',
  showIcon: true
})
</script>

<template>
  <span class="pixel-premium-badge">
    <Icon v-if="showIcon" icon="pixelarticons:zap" class="badge-icon" />
    <span>{{ text }}</span>
  </span>
</template>

<style scoped>
.pixel-premium-badge {
  font-family: var(--font-pixel);
  font-size: 10px;
  font-weight: bold;
  background-color: #5977a3;
  border: 1px solid #1b5e20;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  box-shadow: 0 1px 0 #1b5e20;
  user-select: none;
  line-height: 1;
}

.badge-icon {
  font-size: 10px;
}
</style>
