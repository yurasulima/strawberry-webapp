<script setup lang="ts">
import NinePatch from '../NinePatch.vue'

defineProps({
  width: {
    type: [String, Number],
    default: 320,
  },
  height: {
    type: [String, Number],
    default: 180,
  },
  padding: {
    type: [String, Number],
    default: 16,
  },
})

function cssSize(value: any) {
  return typeof value === 'number' ? `${value}px` : value
}

const cardTexture = '/ui/primary_card.9.png'
</script>

<template>
  <div
    class="card"
    :style="{
      width: cssSize(width),
      height: cssSize(height),
      padding: cssSize(padding),
    }"
  >
    <NinePatch
      :src="cardTexture"
      class="card__background"
    />

    <div class="card__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  box-sizing: border-box;
  display: inline-block;
  min-width: 0;
  min-height: 0;
}

.card__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
