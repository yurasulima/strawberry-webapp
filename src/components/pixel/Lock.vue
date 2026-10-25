<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { preloadTexture } from '@/services/texturePreloader'

const props = withDefaults(defineProps<{
  size?: number | string
  width?: number | string
  height?: number | string
  texture?: string
  alt?: string
  clickable?: boolean
}>(), {
  size: 32,
  texture: '/ui/lock.png',
  alt: 'Lock',
  clickable: false,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

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

function handleClick(e: MouseEvent) {
  if (props.clickable) {
    emit('click', e)
  }
}

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
    class="pixel-lock"
    :class="{ 'is-clickable': clickable }"
    :style="{
      width: computedWidth,
      height: computedHeight,
      minWidth: computedWidth,
      minHeight: computedHeight,
    }"
    @click="handleClick"
  >
    <img
      :src="texture"
      :alt="alt"
      class="pixel-lock__img"
    />
  </div>
</template>

<style scoped>
.pixel-lock {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  flex-shrink: 0;
  box-sizing: border-box;
}

.pixel-lock.is-clickable {
  cursor: pointer;
}

.pixel-lock__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
}
</style>
