<script setup lang="ts">
import NinePatch from '../NinePatch.vue'

withDefaults(defineProps<{
  level?: number | string
  prefix?: string
}>(), {
  level: 1,
  prefix: 'LVL:'
})
</script>

<template>
  <div class="level-badge-wrapper">
    <NinePatch src="/ui/badge_level.9.png" class="badge__bg" />
    <span class="badge__content">
      <span v-if="prefix" class="level-prefix">{{ prefix }}</span>
      <span class="level-value">{{ level }}</span>
    </span>
  </div>
</template>

<style scoped>
.level-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
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
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.level-prefix {
  font-size: 10px;
  opacity: 0.9;
}
</style>
