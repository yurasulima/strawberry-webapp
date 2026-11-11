<script setup lang="ts">
import NinePatch from '../NinePatch.vue'

withDefaults(defineProps<{
  text?: string
  showIcon?: boolean
}>(), {
  text: 'Premium',
  showIcon: true
})
</script>

<template>
  <div class="premium-badge-wrapper">
    <NinePatch src="/ui/badge_rare.9.png" :scale="1" class="badge__bg" />
    <span class="badge__content">{{ text }}</span>
  </div>
</template>

<style scoped>
.premium-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  user-select: none;
  line-height: 1;
  flex-shrink: 0;
}

.badge__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.badge__content {
  position: relative;
  z-index: 1;
  font-family: var(--font-pixel), sans-serif;
  font-size: 11px;
  font-weight: bold;
  color: #ffffff;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
