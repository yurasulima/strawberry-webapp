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
    /** Якщо true — клікабельні (для pointer-подій) лише непрозорі пікселі кота; решта кадру пропускає кліки */
    hitMask?: boolean
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
    frames: 10,
    hitMask: false
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const currentFrame = ref(0)
const textures = shallowRef<CatTextures | null>(null)
const maskPaths = shallowRef<string[]>([])

const HIT_ALPHA_THRESHOLD = 20

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

const hitStyle = computed(() => {
  const clip = maskPaths.value[(props.frame ?? currentFrame.value) % props.frames]
  if (!clip) return null
  const fw = actualFrameWidth.value
  const fh = actualFrameHeight.value
  return {
    width: `${fw}px`,
    height: `${fh}px`,
    clipPath: clip,
    transform: `scale(${displayWidth.value / fw}, ${displayHeight.value / fh})`
  }
})

const displayWidth = computed(() => {
  const fh = actualFrameHeight.value
  const fw = actualFrameWidth.value
  if (!fh || !fw) return numericSize()
  return Math.round(numericSize() * (fw / fh))
})

// Для кожного кадру будує clip-path (в пікселях оригінальної текстури) з усіх непрозорих пікселів.
// Браузер враховує clip-path при hit-testing, тож клік по прозорій частині проходить крізь спрайт.
function buildMasks(data: ArrayLike<number>, texWidth: number): string[] {
  const fw = actualFrameWidth.value
  const fh = actualFrameHeight.value
  const opaque = (f: number, x: number, y: number) =>
    data[(y * texWidth + f * fw + x) * 4 + 3] > HIT_ALPHA_THRESHOLD

  const result: string[] = []
  for (let f = 0; f < props.frames; f++) {
    let d = ''
    for (let y = 0; y < fh; y++) {
      let x = 0
      while (x < fw) {
        if (!opaque(f, x, y)) { x++; continue }
        const x0 = x
        while (x < fw && opaque(f, x, y)) x++
        d += `M${x0} ${y}h${x - x0}v1h-${x - x0}z`
      }
    }
    result.push(`path('${d || 'M0 0z'}')`)
  }
  return result
}

function rebuildStrip() {
  const tex = textures.value
  if (!tex) return
  if (!strip) {
    strip = document.createElement('canvas')
  }
  strip.width = tex.width
  strip.height = tex.height
  const data = recolorStrip(tex.gray, tex.zones, props.colors)
  if (props.hitMask) maskPaths.value = buildMasks(data, tex.width)
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
  <div class="cat-sprite-wrap" :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }">
    <canvas
      ref="canvasRef"
      class="cat-sprite"
      :width="actualFrameWidth"
      :height="actualFrameHeight"
      :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }"
    />
    <div v-if="hitMask && hitStyle" class="cat-hit" :style="hitStyle" />
  </div>
</template>

<style scoped>
.cat-sprite-wrap {
  position: relative;
  display: block;
  flex-shrink: 0;
  line-height: 0;
  pointer-events: none;
}

/* Прозорий шар, що приймає події лише в межах clip-path (непрозорі пікселі кота) */
.cat-hit {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  pointer-events: auto;
}

.cat-sprite {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  user-select: none;
  pointer-events: none;
}
</style>
