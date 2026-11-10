<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

export interface PieItem {
  label: string
  value: number
  color?: string
}

const props = withDefaults(
  defineProps<{
    items: PieItem[]
    title?: string
    displaySize?: number
  }>(),
  {
    items: () => [],
    title: '',
    displaySize: 210
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const activeIndex = ref<number | null>(null)

const GRID_SIZE = 72 // Низька роздільна здатність для справжнього 8-bit/16-bit піксель-арту

const defaultColors = [
  '#fbc02d', // Золотий
  '#2e7d32', // Зелений
  '#c62828', // Червоний
  '#1e88e5', // Синій
  '#ab47bc', // Фіолетовий
  '#ff7043', // Помаранчевий
  '#26a69a', // Бірюзовий
  '#8d6e63'  // Коричневий
]

const total = computed(() => {
  return props.items.reduce((sum, item) => sum + (item.value || 0), 0)
})

interface SliceData {
  item: PieItem
  index: number
  value: number
  percentage: number
  color: string
  startAngle: number
  endAngle: number
}

const slices = computed<SliceData[]>(() => {
  const tot = total.value
  if (!tot || tot <= 0) return []

  let currentAngle = -Math.PI / 2

  return props.items
    .filter(item => item.value > 0)
    .map((item, index) => {
      const pct = (item.value / tot) * 100
      const angleLength = (item.value / tot) * (2 * Math.PI)
      const startAngle = currentAngle
      const endAngle = currentAngle + angleLength
      currentAngle = endAngle

      const color = item.color || defaultColors[index % defaultColors.length]

      return {
        item,
        index,
        value: item.value,
        percentage: Math.round(pct * 10) / 10,
        color,
        startAngle,
        endAngle
      }
    })
})

const activeSlice = computed(() => {
  if (activeIndex.value !== null && slices.value[activeIndex.value]) {
    return slices.value[activeIndex.value]
  }
  return null
})

function drawPixelChart() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE)

  const activeIdx = activeIndex.value
  const currentSlices = slices.value

  if (!currentSlices.length) {
    // Порожній піксельний круг
    const center = GRID_SIZE / 2
    const radius = GRID_SIZE / 2 - 6
    ctx.fillStyle = '#3f2e21'
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#755a47'
    ctx.lineWidth = 2
    ctx.stroke()
    return
  }

  const center = GRID_SIZE / 2
  const outerR = GRID_SIZE / 2 - 4
  const innerR = outerR * 0.52

  // Малювання піксельного пончика посімейним рендерингом точних квадратиків 1x1
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dx = x + 0.5 - center
      const dy = y + 0.5 - center
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist >= innerR && dist <= outerR) {
        let angle = Math.atan2(dy, dx)
        if (angle < -Math.PI / 2) {
          angle += 2 * Math.PI
        }

        let matchedSlice: SliceData | null = null;
        for (const s of currentSlices) {
          if (angle >= s.startAngle && angle <= s.endAngle) {
            matchedSlice = s
            break
          }
        }

        if (matchedSlice) {
          const isBorder = (dist >= outerR - 1) || (dist <= innerR + 1)
          if (isBorder) {
            ctx.fillStyle = '#2a1f18'
          } else if (activeIdx !== null && matchedSlice.index === activeIdx) {
            ctx.fillStyle = lightenColor(matchedSlice.color, 25)
          } else {
            ctx.fillStyle = matchedSlice.color
          }
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }
}

function handleCanvasMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas || !slices.value.length) return

  const rect = canvas.getBoundingClientRect()
  const scale = GRID_SIZE / rect.width
  const px = (e.clientX - rect.left) * scale
  const py = (e.clientY - rect.top) * scale

  const center = GRID_SIZE / 2
  const dx = px - center
  const dy = py - center
  const dist = Math.sqrt(dx * dx + dy * dy)
  const outerR = GRID_SIZE / 2 - 4
  const innerR = outerR * 0.52

  if (dist >= innerR && dist <= outerR) {
    let angle = Math.atan2(dy, dx)
    if (angle < -Math.PI / 2) {
      angle += 2 * Math.PI
    }
    const found = slices.value.find(s => angle >= s.startAngle && angle <= s.endAngle)
    if (found) {
      activeIndex.value = found.index
      return
    }
  }
  activeIndex.value = null
}

function handleCanvasMouseLeave() {
  activeIndex.value = null
}

function lightenColor(hex: string, percent: number): string {
  let num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + Math.round(255 * (percent / 100))
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100))
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100))
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`
}

function formatNum(n: number): string {
  return n.toLocaleString('uk-UA')
}

watch([slices, activeIndex], () => {
  drawPixelChart()
})

onMounted(() => {
  drawPixelChart()
})
</script>

<template>
  <div class="pixel-pie-wrapper">
    <div v-if="title" class="pie-title">{{ title }}</div>

    <div
      class="chart-container"
      :style="{ width: `${displaySize}px`, height: `${displaySize}px` }"
    >
      <canvas
        ref="canvasRef"
        :width="GRID_SIZE"
        :height="GRID_SIZE"
        class="pixel-canvas"
        :style="{ width: `${displaySize}px`, height: `${displaySize}px` }"
        @mousemove="handleCanvasMouseMove"
        @mouseleave="handleCanvasMouseLeave"
      ></canvas>

      <div class="donut-center">
        <template v-if="activeSlice">
          <span class="center-label">{{ activeSlice.item.label }}</span>
          <span class="center-val" :style="{ color: activeSlice.color }">
            {{ formatNum(activeSlice.value) }} ({{ activeSlice.percentage }}%)
          </span>
        </template>
        <template v-else-if="slices.length">
          <span class="center-label">Всього</span>
          <span class="center-val text-gold">{{ formatNum(total) }}</span>
        </template>
        <template v-else>
          <span class="center-label">Немає даних</span>
        </template>
      </div>
    </div>

    <div v-if="slices.length" class="legend-grid">
      <div
        v-for="(s, idx) in slices"
        :key="idx"
        class="legend-item"
        :class="{ active: activeIndex === idx }"
        @mouseenter="activeIndex = idx"
        @mouseleave="activeIndex = null"
      >
        <span class="color-box" :style="{ backgroundColor: s.color }"></span>
        <span class="legend-label">{{ s.item.label }}</span>
        <span class="legend-val">
          <strong>{{ formatNum(s.value) }}</strong> ({{ s.percentage }}%)
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixel-pie-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.pie-title {
  font-size: 13px;
  font-weight: bold;
  color: #fbc02d;
  text-shadow: 1px 1px 0 #000;
  text-align: center;
}

.chart-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pixel-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.5));
  cursor: pointer;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
  max-width: 55%;
}

.center-label {
  font-size: 10px;
  color: #d7ccc8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.center-val {
  font-size: 11px;
  font-weight: bold;
}

.text-gold {
  color: #fbc02d;
}

.legend-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 10px;
  width: 100%;
  margin-top: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 2px;
  background: rgba(42, 31, 24, 0.5);
  border: 1px solid rgba(117, 90, 71, 0.4);
  cursor: pointer;
  transition: background 0.15s ease;
}

.legend-item:hover,
.legend-item.active {
  background: rgba(251, 192, 45, 0.25);
  border-color: #fbc02d;
}

.color-box {
  width: 8px;
  height: 8px;
  border-radius: 0px;
  border: 1px solid #000;
  flex-shrink: 0;
}

.legend-label {
  color: #d7ccc8;
}

.legend-val {
  color: #fff;
  margin-left: auto;
}
</style>
