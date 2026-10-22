
<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  scale: {
    type: Number,
    default: undefined,
  },
})

const PIXEL_SCALE = 2

const root = ref(null)

let observer = null
let image = null
let disposed = false

  function isBlack(data, offset) {
  return (
      data[offset + 3] > 127 &&
      data[offset] < 32 &&
      data[offset + 1] < 32 &&
      data[offset + 2] < 32
  )
}

function findRange(data, length, stride = 4) {
  let first = -1
  let last = -1

  for (let i = 0; i < length; i++) {
    if (isBlack(data, i * stride)) {
      if (first === -1) first = i
      last = i
    }
  }

  return first === -1 ? null : [first, last + 1]
}

function draw() {
  if (
      disposed ||
      !root.value ||
      !image?.complete ||
      !image.naturalWidth
  ) {
    return
  }

  const canvas = root.value.querySelector('canvas')
  if (!canvas) return

  const rect = root.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const dpr = window.devicePixelRatio || 1

  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, rect.width, rect.height)

  const sourceWidth = image.naturalWidth - 2
  const sourceHeight = image.naturalHeight - 2

  if (sourceWidth <= 0 || sourceHeight <= 0) return

  // Створюємо канвас для зчитування 1px ліній 9-patch направляючих з оригінального зображення
  const fullTemp = document.createElement('canvas')
  fullTemp.width = image.naturalWidth
  fullTemp.height = image.naturalHeight

  const fullCtx = fullTemp.getContext('2d', { willReadFrequently: true })
  if (!fullCtx) return
  fullCtx.imageSmoothingEnabled = false
  fullCtx.drawImage(image, 0, 0)

  // Верхній (горизонтальний) та лівий (вертикальний) 1px елементи направляючих
  const topRow = fullCtx.getImageData(1, 0, sourceWidth, 1)
  const leftColumn = fullCtx.getImageData(0, 1, 1, sourceHeight)

  const stretchX = findRange(topRow.data, sourceWidth)
  const stretchY = findRange(leftColumn.data, sourceHeight)

  // Створюємо внутрішній канвас тільки для вмісту (без 1px рамки 9-patch)
  const temp = document.createElement('canvas')
  temp.width = sourceWidth
  temp.height = sourceHeight

  const tempCtx = temp.getContext('2d', {
    willReadFrequently: true,
  })

  if (!tempCtx) return

  tempCtx.imageSmoothingEnabled = false
  tempCtx.drawImage(
      image,
      1, 1,
      sourceWidth, sourceHeight,
      0, 0,
      sourceWidth, sourceHeight,
  )

  const [sx0, sx1] = stretchX ?? [
    Math.floor(sourceWidth / 3),
    Math.ceil(sourceWidth * 2 / 3),
  ]

  const [sy0, sy1] = stretchY ?? [
    Math.floor(sourceHeight / 3),
    Math.ceil(sourceHeight * 2 / 3),
  ]

  const xs = [0, sx0, sx1, sourceWidth]
  const ys = [0, sy0, sy1, sourceHeight]

  const width = rect.width
  const height = rect.height

  // Для високого розширення (наприклад, 50x50 і більше) маштаб 1, для низької деталізації 2
  const effectiveScale = props.scale !== undefined
    ? props.scale
    : (sourceWidth >= 40 || sourceHeight >= 40 ? 1 : 2)

  const leftWidth = sx0 * effectiveScale
  const rightWidth = (sourceWidth - sx1) * effectiveScale
  const topHeight = sy0 * effectiveScale
  const bottomHeight = (sourceHeight - sy1) * effectiveScale

  const dx = [
    0,
    leftWidth,
    width - rightWidth,
    width,
  ]

  const dy = [
    0,
    topHeight,
    height - bottomHeight,
    height,
  ]

  // Не дозволяємо фіксованим краям виходити за контейнер.
  if (dx[2] < dx[1]) {
    const scale = width / Math.max(1, leftWidth + rightWidth)
    dx[1] = leftWidth * scale
    dx[2] = dx[1]
  }

  if (dy[2] < dy[1]) {
    const scale = height / Math.max(1, topHeight + bottomHeight)
    dy[1] = topHeight * scale
    dy[2] = dy[1]
  }

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = xs[col]
      const sy = ys[row]
      const sw = xs[col + 1] - sx
      const sh = ys[row + 1] - sy

      const x0 = Math.round(dx[col] * dpr) / dpr
      const y0 = Math.round(dy[row] * dpr) / dpr
      const x1 = Math.round(dx[col + 1] * dpr) / dpr
      const y1 = Math.round(dy[row + 1] * dpr) / dpr

      if (sw <= 0 || sh <= 0 || x1 <= x0 || y1 <= y0) {
        continue
      }

      const overlap = 1 / dpr

      const destX = col > 0 ? x0 - overlap / 2 : x0
      const destY = row > 0 ? y0 - overlap / 2 : y0
      const destRight = col < 2 ? x1 + overlap / 2 : x1
      const destBottom = row < 2 ? y1 + overlap / 2 : y1

      ctx.drawImage(
          temp,
          sx, sy, sw, sh,
          destX,
          destY,
          destRight - destX,
          destBottom - destY,
      )
    }
  }
}

function loadImage() {
  if (image) {
    image.onload = null
    image.onerror = null
  }

  image = new Image()
  image.onload = draw
  image.onerror = () => {
    console.error(`Не вдалося завантажити 9-Patch: ${props.src}`)
  }
  image.src = props.src
}

watch(() => props.src, loadImage)

onMounted(() => {
  disposed = false

  observer = new ResizeObserver(draw)
  if (root.value) observer.observe(root.value)

  loadImage()
})

onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()

  if (image) {
    image.onload = null
    image.onerror = null
  }
})
</script>

<template>
  <div ref="root" class="nine-patch">
    <canvas class="nine-patch__canvas" />
  </div>
</template>

<style scoped>
.nine-patch {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.nine-patch__canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
</style>
