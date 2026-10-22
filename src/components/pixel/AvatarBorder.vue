<script setup lang="ts">
import { computed } from 'vue'
import NinePatch from '../NinePatch.vue'
import Image from './Image.vue'

const props = withDefaults(defineProps<{
  size?: number | string
  width?: number | string
  height?: number | string
  padding?: number | string
  image?: string | null
  alt?: string
  texture?: string
}>(), {
  texture: '/ui/border.9.png'
})

function formatSize(val?: number | string): string | undefined {
  if (val === undefined) return undefined
  return typeof val === 'number' ? `${val}px` : val
}

const computedWidth = computed(() => {
  if (props.width !== undefined) return formatSize(props.width)
  if (props.size !== undefined) return formatSize(props.size)
  return '64px'
})

const computedHeight = computed(() => {
  if (props.height !== undefined) return formatSize(props.height)
  if (props.size !== undefined) return formatSize(props.size)
  return '64px'
})

const computedPadding = computed(() => {
  if (props.padding !== undefined) return formatSize(props.padding)
  return '6px'
})
</script>

<template>
  <div
    class="pixel-border"
    :style="{
      width: computedWidth,
      height: computedHeight,
      minWidth: computedWidth,
      minHeight: computedHeight,
      maxWidth: computedWidth,
      maxHeight: computedHeight,
      padding: computedPadding,
    }"
  >
    <NinePatch :src="texture" class="pixel-border__background" />
    <div class="pixel-border__content">
      <Image
        v-if="image !== undefined"
        :src="image"
        :alt="alt || 'Avatar'"
        fit="cover"
        width="100%"
        height="100%"
        class="pixel-border__image"
      />
      <slot v-else />
    </div>
  </div>
</template>

<style scoped>
.pixel-border {
  position: relative;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  flex-shrink: 0;
  overflow: hidden;
}

.pixel-border__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pixel-border__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pixel-border__image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.pixel-border__content :deep(img) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
