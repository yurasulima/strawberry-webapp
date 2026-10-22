<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts"
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText } from '@/components/pixel'
import type { User } from "@/types/User.ts"
import { useToastStore } from "@/stores/toast.ts"

const toastStore = useToastStore()
const players = ref<User[]>([])
const loading = ref(false)

function formatPlayerName(player: User): string {
  if (player.firstName || player.lastName) {
    return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim()
  }
  if (player.username) return `@${player.username}`
  return 'Гравець'
}

function getStrawberryCount(player: User): number {
  return player.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0
}

const fetchPlayers = async () => {
  loading.value = true

  try {
    const response = await api.get('/users')
    players.value = response.data || []
  } catch (e) {
    toastStore.showToast('Помилка завантаження топу гравців', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPlayers()
})
</script>

<template>
  <div class="players-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <div class="players-header">
        <h2 class="title">Топ гравців</h2>
        <ButtonText
            padding="6px 14px"
            :loading="loading"
            @click="fetchPlayers"
        >
          Оновити
        </ButtonText>
      </div>

      <div v-if="loading" class="loading-state">
        <span>Завантаження...</span>
      </div>

      <template v-else>
        <Card v-if="players.length" width="100%" height="auto" :padding="6">
          <ul class="players-list">
            <li v-for="(player, index) in players" :key="player.userId || index" class="player-row">
              <span class="player-rank" :class="{ 'gold': index === 0, 'silver': index === 1, 'bronze': index === 2 }">
                #{{ index + 1 }}
              </span>

              <img
                  :src="player.photoUrl || '/default-avatar.png'"
                  alt=""
                  class="player-avatar"
                  draggable="false"
              />

              <div class="player-info">
                <span class="player-name">{{ formatPlayerName(player) }}</span>
              </div>

              <div class="player-score">
                <img src="/ui/strawberry.png" alt="" class="score-icon" />
                <strong class="score-val">{{ getStrawberryCount(player) }}</strong>
              </div>
            </li>
          </ul>
        </Card>

        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p class="empty-title">Гравців не знайдено</p>
        </div>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.players-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  line-height: 1.1;
  color: #3f2e21;
}

.players-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.title {
  margin: 0;
  font-family: inherit;
  font-size: 22px;
  font-weight: normal;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.players-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  padding: 4px 6px;
}

.player-row + .player-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.player-rank {
  font-size: 18px;
  font-weight: bold;
  min-width: 32px;
  color: #5d4037;
}

.player-rank.gold { color: #d97706; }
.player-rank.silver { color: #64748b; }
.player-rank.bronze { color: #b45309; }

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #5d4037;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.player-name {
  font-size: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-score {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.score-icon {
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
}

.score-val {
  font-size: 18px;
  color: #2e7d32;
  font-weight: normal;
}

.empty-state { text-align: center; padding: 16px 8px; }
.empty-icon { font-size: 32px; color: #5d4037; margin-bottom: 6px; }
.empty-title { margin: 0 0 4px; font-size: 20px; }
</style>
