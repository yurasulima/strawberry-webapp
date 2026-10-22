<script setup lang="ts">
import { computed } from 'vue'
import NinePatch from '../NinePatch.vue'

const props = withDefaults(defineProps<{
  width?: number | string
  height?: number | string
  padding?: number | string
  title?: string
  closable?: boolean
  texture?: string
}>(), {
  width: '100%',
  height: 'auto',
  padding: 12,
  closable: false,
  texture: '/ui/message.9.png'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

function cssSize(value?: number | string): string {
  if (value === undefined) return 'auto'
  return typeof value === 'number' ? `${value}px` : value
}

const computedWidth = computed(() => cssSize(props.width))
const computedHeight = computed(() => cssSize(props.height))
const computedPadding = computed(() => cssSize(props.padding))
</script>

<template>
  <div
    class="pixel-message"
    :style="{
      width: computedWidth,
      height: computedHeight,
      padding: computedPadding,
    }"
  >
    <NinePatch :src="texture" class="pixel-message__background" />

    <div class="pixel-message__content">
      <div v-if="title || closable" class="pixel-message__header">
        <span v-if="title" class="pixel-message__title">{{ title }}</span>
        <button v-if="closable" class="pixel-message__close" title="Закрити" @click="emit('close')">×</button>
      </div>
      <div class="pixel-message__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixel-message {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
}

.pixel-message__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pixel-message__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.pixel-message__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}

.pixel-message__title {
  font-family: var(--font-pixel);
  font-size: 11px;
  font-weight: bold;
  color: #3f2e21;
}

.pixel-message__close {
  background: transparent;
  border: none;
  color: #3f2e21;
  font-family: var(--font-pixel);
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.pixel-message__close:hover {
  color: #c62828;
}

.pixel-message__body {
  width: 100%;
  height: 100%;
  color: #3f2e21;
}
</style>
