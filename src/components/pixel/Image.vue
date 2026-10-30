<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  size?: number | string
  width?: number | string
  height?: number | string
  fit?: 'contain' | 'cover' | 'fill' | 'none'
  fallback?: string
}>(), {
  src: '',
  alt: 'Pixel Image',
  fit: 'contain',
  fallback: 'https://mcapi.memories-app.org/image/null.png'
})

const hasError = ref(false)

function cssSize(value?: number | string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && !isNaN(Number(value))) return `${value}px`
  return value
}

const computedWidth = computed(() => {
  if (props.width !== undefined) return cssSize(props.width)
  if (props.size !== undefined) return cssSize(props.size)
  return undefined
})

const computedHeight = computed(() => {
  if (props.height !== undefined) return cssSize(props.height)
  if (props.size !== undefined) return cssSize(props.size)
  return undefined
})

const currentSrc = computed(() => {
  if (hasError.value || !props.src) {
    return props.fallback
  }
  return props.src
})

function handleError() {
  hasError.value = true
}

watch(() => props.src, () => {
  hasError.value = false
})
</script>

<template>
  <div
    class="pixel-image-container"
    :style="{
      width: computedWidth,
      height: computedHeight,
      minWidth: computedWidth,
      minHeight: computedHeight,
      maxWidth: computedWidth,
      maxHeight: computedHeight,
    }"
  >
    <img
      :src="currentSrc"
      :alt="alt"
      class="pixel-image"
      :style="{
        objectFit: fit,
      }"
      @error="handleError"
    />
  </div>
</template>

<style scoped>
.pixel-image-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}

.pixel-image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
