<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { dpr, toPx, snapContain } from '@/services/pixelSnap'

const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  size?: number | string
  width?: number | string
  height?: number | string
  fit?: 'contain' | 'cover' | 'fill' | 'none'
  fallback?: string
  /** false = вимкнути підгонку під цілий піксельний масштаб */
  snap?: boolean
}>(), {
  src: '',
  alt: 'Pixel Image',
  fit: 'contain',
  fallback: 'https://mcapi.memories-app.org/image/null.png',
  snap: true
})

const hasError = ref(false)
const imgEl = ref<HTMLImageElement | null>(null)
const natural = ref<{ w: number; h: number } | null>(null)

function cssSize(value?: number | string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && !isNaN(Number(value))) return `${value}px`
  return value
}

const rawWidth = computed(() => props.width !== undefined ? props.width : props.size)
const rawHeight = computed(() => props.height !== undefined ? props.height : props.size)

const computedWidth = computed(() => cssSize(rawWidth.value))
const computedHeight = computed(() => cssSize(rawHeight.value))

const currentSrc = computed(() => {
  if (hasError.value || !props.src) return props.fallback
  return props.src
})

/** Піксель-перфект розмір картинки: ціле число фізичних пікселів на піксель текстури. */
const snapped = computed(() => {
  if (!props.snap || props.fit !== 'contain' || !natural.value) return null
  const bw = toPx(rawWidth.value)
  const bh = toPx(rawHeight.value)
  if (bw === null || bh === null) return null
  return snapContain(bw, bh, natural.value.w, natural.value.h, dpr.value)
})

function readNatural() {
  const el = imgEl.value
  if (el && el.complete && el.naturalWidth) {
    natural.value = { w: el.naturalWidth, h: el.naturalHeight }
  }
}

function handleError() {
  hasError.value = true
}

watch(() => props.src, () => {
  hasError.value = false
  natural.value = null
})
watch(currentSrc, () => { natural.value = null })

onMounted(readNatural)
</script>

<template>
  <div
      class="pixel-image-container"
      :class="{ 'is-snapped': !!snapped }"
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
        ref="imgEl"
        :src="currentSrc"
        :alt="alt"
        class="pixel-image"
        :style="snapped
        ? { width: snapped.width + 'px', height: snapped.height + 'px', maxWidth: 'none', maxHeight: 'none' }
        : { objectFit: fit }"
        @load="readNatural"
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

/* при підгонці картинка може бути трохи більшою за бокс - не обрізаємо */
.pixel-image-container.is-snapped {
  overflow: visible;
}

.pixel-image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  display: block;
  flex-shrink: 0;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  -webkit-user-drag: none;
}
</style>