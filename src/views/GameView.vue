<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import GameCanvas from '@/game/GameCanvas.vue'
import { useGameStore } from '@/stores/game'

const { t } = useI18n()
const router = useRouter()
const store = useGameStore()
</script>

<template>
  <div class="game-view">
    <GameCanvas />

    <header class="hud">
      <button class="hud-btn" @click="router.push('/')">← {{ t('game.back') }}</button>
      <div class="hud-coins">🍓 {{ store.coins }}</div>
      <button class="hud-btn" @click="store.paused = !store.paused">
        {{ store.paused ? '▶' : 'II' }}
      </button>
    </header>

    <footer class="hud-hint">{{ t('game.controls') }} · {{ store.fps }} FPS</footer>

    <div v-if="store.paused" class="pause" @click="store.paused = false">
      <div class="pause-card">
        <h2>{{ t('game.paused') }}</h2>
        <p>{{ t('game.resume') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  position: fixed;
  inset: 0;
  background: #14161f;
  color: #fff;
  font-family: var(--font-monocraft, monospace);
  overflow: hidden;
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  pointer-events: none;
}

.hud > * {
  pointer-events: auto;
}

.hud-btn,
.hud-coins {
  background: rgba(20, 22, 31, 0.75);
  border: 2px solid #3a3f58;
  border-radius: 6px;
  color: inherit;
  font: inherit;
  padding: 8px 12px;
}

.hud-btn {
  cursor: pointer;
}

.hud-btn:hover {
  border-color: #d7263d;
}

.hud-hint {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  opacity: 0.6;
  pointer-events: none;
}

.pause {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  cursor: pointer;
}

.pause-card {
  text-align: center;
}

.pause-card h2 {
  margin: 0 0 8px;
  font-size: 32px;
}
</style>
