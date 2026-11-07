<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
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
    /** Розмір одного кадру на екрані. Для чітких пікселів бери кратне frameSize: 64, 96, 128 */
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
    size: 96,
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

let textures: CatTextures | null = null
let strip: HTMLCanvasElement | null = null
let timer: ReturnType<typeof setInterval> | null = null

function numericSize(): number {
  if (typeof props.size === 'number') return props.size
  const parsed = parseFloat(props.size)
  return Number.isNaN(parsed) ? 96 : parsed
}

// Перефарбовуємо всю стрічку один раз при зміні кольорів, а не щокадру
function rebuildStrip() {
  if (!textures) return
  if (!strip) {
    strip = document.createElement('canvas')
    strip.width = textures.width
    strip.height = textures.height
  }
  const data = recolorStrip(textures.gray, textures.zones, props.colors)
  const image = new ImageData(new Uint8ClampedArray(data), textures.width, textures.height)
  strip.getContext('2d')!.putImageData(image, 0, 0)
  draw()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !strip) return
  const ctx = canvas.getContext('2d')!
  const fs = props.frameSize
  const f = props.frame ?? currentFrame.value
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, fs, fs)
  ctx.drawImage(strip, (f % props.frames) * fs, 0, fs, fs, 0, 0, fs, fs)
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
    textures = await loadCatTextures(props.grayTexture, props.zonesTexture)
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
    :width="frameSize"
    :height="frameSize"
    :style="{ width: `${numericSize()}px`, height: `${numericSize()}px` }"
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
