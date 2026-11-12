<script setup lang="ts">
import { computed } from 'vue'
import NinePatch from '../NinePatch.vue'

const props = withDefaults(defineProps<{
  name?: string | null
}>(), {
  name: null
})

const displayName = computed(() => {
  if (props.name && props.name.trim().length > 0) {
    return props.name.trim()
  }
  return "Назвати котика"
})
</script>

<template>
  <div class="cat-name-badge-wrapper" title="Налаштувати ім'я котика">
    <NinePatch src="/ui/flat_card.9.png" class="badge__bg" />
    <span class="badge__content">{{ displayName }}</span>
    <span class="badge__pointer"></span>
  </div>
</template>

<style scoped>
.cat-name-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  cursor: pointer;
  user-select: none;
  line-height: 1;
  margin-bottom: 6px;
  transition: transform 0.1s ease;
}

.cat-name-badge-wrapper:hover {
  transform: scale(1.06);
}

.cat-name-badge-wrapper:active {
  transform: scale(0.96);
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
  color: #3f2e21;
  white-space: nowrap;
}

.badge__pointer {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 4px;
  background-color: #5d4037;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  z-index: 2;
}
</style>
