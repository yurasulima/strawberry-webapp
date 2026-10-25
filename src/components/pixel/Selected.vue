<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import NinePatch from '../NinePatch.vue'
import { preloadTexture } from '@/services/texturePreloader'

const props = withDefaults(defineProps<{
  width?: number | string
  height?: number | string
  padding?: number | string
  active?: boolean
  texture?: string
}>(), {
  width: '100%',
  height: 'auto',
  padding: 8,
  active: true,
  texture: '/ui/selected.9.png'
})

function cssSize(value?: number | string): string {
  if (value === undefined) return 'auto'
  return typeof value === 'number' ? `${value}px` : value
}

const computedWidth = computed(() => cssSize(props.width))
const computedHeight = computed(() => cssSize(props.height))
const computedPadding = computed(() => cssSize(props.padding))

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
    class="pixel-selected"
    :class="{ 'is-active': active }"
    :style="{
      width: computedWidth,
      height: computedHeight,
      padding: computedPadding,
    }"
  >
    <NinePatch
      v-if="active"
      :src="texture"
      class="pixel-selected__background"
    />

    <div class="pixel-selected__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pixel-selected {
  position: relative;
  box-sizing: border-box;
  display: inline-block;
  min-width: 0;
  min-height: 0;
}

.pixel-selected__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pixel-selected__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
</style>
