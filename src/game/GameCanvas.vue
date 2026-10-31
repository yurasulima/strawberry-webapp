<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { Game } from './Game'

const host = ref<HTMLDivElement | null>(null)
const store = useGameStore()

// Екземпляр гри навмисно НЕ реактивний: Vue не повинен проксіювати Pixi-об'єкти.
let game: Game | null = null
let disposed = false

onMounted(async () => {
  if (!host.value) return
  store.reset()

  const instance = new Game({
    host: host.value,
    events: {
      onCoins: (coins) => (store.coins = coins),
      onFps: (fps) => (store.fps = fps),
      onPause: (paused) => (store.paused = paused),
    },
  })
  game = instance

  await instance.init()
  // Розмонтували, поки йшла ініціалізація: Game сам звільнив ресурси.
  if (disposed) game = null
})

onBeforeUnmount(() => {
  disposed = true
  game?.destroy()
  game = null
})

watch(
  () => store.paused,
  (paused) => game?.setPaused(paused),
)

defineExpose({ setStick: (x: number, y: number) => game?.setStick(x, y) })
</script>

<template>
  <div ref="host" class="game-canvas" />
</template>

<style scoped>
.game-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
</style>
