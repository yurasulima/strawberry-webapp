import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Лише те, що потрібно UI. Позиції гравця/ворогів тут НЕ зберігаємо:
 * реактивність на кожен кадр дуже дорога, а симуляція живе в src/game.
 */
export const useGameStore = defineStore('game', () => {
  const coins = ref(0)
  const fps = ref(0)
  const paused = ref(false)

  function reset() {
    coins.value = 0
    fps.value = 0
    paused.value = false
  }

  return { coins, fps, paused, reset }
})
