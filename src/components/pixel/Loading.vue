<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { preloadTexture } from '@/services/texturePreloader'

const props = withDefaults(defineProps<{
  size?: number | string
  width?: number | string
  height?: number | string
  texture?: string
  frameCount?: number
  duration?: number | string
  text?: string
  vertical?: boolean
  center?: boolean
}>(), {
  size: 32,
  texture: '/ui/loading.png',
  frameCount: 37,
  duration: '1.2s',
  vertical: false,
  center: false,
})

function cssSize(value?: number | string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && !isNaN(Number(value))) return `${value}px`
  return value
}

const computedWidth = computed(() => {
  if (props.width !== undefined) return cssSize(props.width)
  if (props.size !== undefined) return cssSize(props.size)
  return '32px'
})

const computedHeight = computed(() => {
  if (props.height !== undefined) return cssSize(props.height)
  if (props.size !== undefined) return cssSize(props.size)
  return '32px'
})

const computedDuration = computed(() => {
  if (typeof props.duration === 'number') {
    return `${props.duration}s`
  }
  return props.duration || '1.2s'
})

function preloadCurrentTexture() {
  if (props.texture) {
    preloadTexture(props.texture)
  }
}

onMounted(() => {
  preloadCurrentTexture()
})

watch(() => props.texture, preloadCurrentTexture)
</script>

<template>
  <div
    class="pixel-loading-container"
    :class="{
      'is-vertical': vertical,
      'is-center': center
    }"
    role="status"
    aria-label="Loading"
  >
    <div
      class="pixel-loading-icon"
      :style="{
        width: computedWidth,
        height: computedHeight,
        minWidth: computedWidth,
        minHeight: computedHeight,
      }"
    >
      <div
        class="pixel-loading-sprite"
        :style="{
          backgroundImage: `url('${texture}')`,
          width: `calc(100% * ${frameCount})`,
          animationDuration: computedDuration,
          animationTimingFunction: `steps(${frameCount})`,
        }"
      />
    </div>
    <span v-if="text || $slots.default" class="pixel-loading-text">
      <slot>{{ text }}</slot>
    </span>
  </div>
</template>

<style scoped>
.pixel-loading-container {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.pixel-loading-container.is-vertical {
  flex-direction: column;
}

.pixel-loading-container.is-center {
  justify-content: center;
  width: 100%;
}

.pixel-loading-icon {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-block;
}

.pixel-loading-sprite {
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  animation-name: pixel-loading-anim;
  animation-iteration-count: infinite;
}

@keyframes pixel-loading-anim {
  0% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.pixel-loading-text {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: #3f2e21;
}
</style>
