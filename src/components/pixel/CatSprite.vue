<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import {
  loadCatTextures,
  recolorStrip,
  type CatColors,
  type CatTextures
} from '@/services/catRecolor.ts'

const props = withDefaults(
  defineProps<{
    /** Кольори зон: { fur, markings, belly, accent, collar }. Не задані лишаються оригінальними */
    colors?: CatColors
    /** Розмір кадру по висоті на екрані. Ширина розраховується пропорційно розміру кадру (43x32) */
    size?: number | string
    frameRateMs?: number
    playing?: boolean
    /** Якщо задано, показує лише цей кадр і не анімує */
    frame?: number | null
    grayTexture?: string
    zonesTexture?: string
    frameSize?: number
    frames?: number
  }>(),
  {
    colors: () => ({}),
    size: 72,
    frameRateMs: 120,
    playing: true,
    frame: null,
    grayTexture: '/cats/cat_gray.png',
    zonesTexture: '/cats/cat_zones.png',
    frameSize: 32,
    frames: 10
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentFrame = ref(0)
const textures = shallowRef<CatTextures | null>(null)

let strip: HTMLCanvasElement | null = null
let timer: ReturnType<typeof setInterval> | null = null

// Динамічний розмір кадру з завантаженої текстури (наприклад, 43x32)
const actualFrameWidth = computed(() => {
  const tex = textures.value
  if (tex && tex.width > 0 && props.frames > 0) {
    return Math.round(tex.width / props.frames)
  }
  return 43
})

const actualFrameHeight = computed(() => {
  const tex = textures.value
  if (tex && tex.height > 0) {
    return tex.height
  }
  return 32
})

function numericSize(): number {
  if (typeof props.size === 'number') return props.size
  const parsed = parseFloat(props.size)
  return Number.isNaN(parsed) ? 72 : parsed
}

const displayHeight = computed(() => numericSize())

const displayWidth = computed(() => {
  const fh = actualFrameHeight.value
  const fw = actualFrameWidth.value
  if (!fh || !fw) return numericSize()
  return Math.round(numericSize() * (fw / fh))
})

function rebuildStrip() {
  const tex = textures.value
  if (!tex) return
  if (!strip) {
    strip = document.createElement('canvas')
  }
  strip.width = tex.width
  strip.height = tex.height
  const data = recolorStrip(tex.gray, tex.zones, props.colors)
  const image = new ImageData(new Uint8ClampedArray(data), tex.width, tex.height)
  strip.getContext('2d')!.putImageData(image, 0, 0)
  draw()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !strip) return
  const ctx = canvas.getContext('2d')!
  const fw = actualFrameWidth.value
  const fh = actualFrameHeight.value
  const f = props.frame ?? currentFrame.value
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, fw, fh)
  ctx.drawImage(strip, (f % props.frames) * fw, 0, fw, fh, 0, 0, fw, fh)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()
  if (!props.playing || props.frame !== null) return
  timer = setInterval(() => {
    currentFrame.value = (currentFrame.value + 1) % props.frames
    draw()
  }, props.frameRateMs)
}

watch(() => props.colors, rebuildStrip, { deep: true })
watch(() => [props.playing, props.frameRateMs, props.frame], () => {
  startTimer()
  draw()
})

onMounted(async () => {
  try {
    textures.value = await loadCatTextures(props.grayTexture, props.zonesTexture)
  } catch (e) {
    console.error('CatSprite:', e)
    return
  }
  rebuildStrip()
  startTimer()
})

onBeforeUnmount(stopTimer)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="cat-sprite"
    :width="actualFrameWidth"
    :height="actualFrameHeight"
    :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }"
  />
</template>

<style scoped>
.cat-sprite {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  pointer-events: none;
}
</style>
