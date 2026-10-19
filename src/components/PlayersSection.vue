<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { playClickSound } from '@/services/sound'
import type { User } from "@/types/User.ts";

const { t } = useI18n()

const players = ref<User[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const fetchPlayers = async () => {
  playClickSound()
  loading.value = true
  error.value = null

  try {
    const response = await api.get('/users')
    players.value = response.data
  } catch (e) {
    error.value = t('players.error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPlayers()
})
</script>

<template>
  <div class="players-section honeywood-panel-paper">
    <div class="players-header">
      <h2>{{ t('players.title') }}</h2>
      <button @click="fetchPlayers" :disabled="loading" class="refresh-btn honeywood-btn">
        <Icon icon="pixelarticons:reload" class="btn-icon" :class="{ 'spin': loading }" />
        <span>{{ t('players.refresh') }}</span>
      </button>
    </div>

    <div v-if="loading" class="state-msg">{{ t('players.loading') }}</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <div v-else-if="players.length === 0" class="state-msg">{{ t('players.empty') }}</div>

    <ul v-else class="players-list">
      <li v-for="(player, index) in players" :key="player.userId || index" class="player-card">
        <div class="rank">#{{ index + 1 }}</div>
        <img
            :src="player.photoUrl || '/default-avatar.png'"
            alt="Avatar"
            class="player-avatar"
            draggable="false"
        />
        <div class="player-info">
          <div class="player-name">
            {{ player.firstName || player.lastName ? (player.firstName ?? '') + ' ' + (player.lastName ?? '') : t('profile.no_name') }}
          </div>
        </div>
        <div class="player-score">
          <img src="/strawberry.png" alt="Strawberry" class="score-icon" />
          <span class="score-num">
            {{ player.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0 }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.players-section {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.players-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.players-header h2 {
  font-size: 14px;
  margin: 0;
  color: #3f2e21;
}

.refresh-btn {
  font-size: 10px;
  padding: 6px 10px;
}

.btn-icon {
  font-size: 14px;
}

.btn-icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.players-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background-color: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 8px;
  box-shadow: 0 3px 0 #3e2723;
  box-sizing: border-box;
}

.rank {
  font-size: 10px;
  font-weight: bold;
  color: #8d6e63;
  min-width: 24px;
}

.player-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #5d4037;
  flex-shrink: 0;
}

.player-info {
  flex-grow: 1;
  overflow: hidden;
}

.player-name {
  font-size: 11px;
  font-weight: bold;
  color: #3f2e21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-score {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.score-icon {
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
}

.score-num {
  font-size: 11px;
  font-weight: bold;
  color: #2e7d32;
}

.state-msg, .error-msg {
  font-size: 11px;
  text-align: center;
  margin: 20px 0;
  color: #5d4037;
}

.error-msg {
  color: #c62828;
}
</style>
