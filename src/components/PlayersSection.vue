<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
import { AppScreen, AppCard, AppText, AppPrimaryButton } from '@/components/ui'
import type { User } from "@/types/User.ts";

const { t } = useI18n()

const players = ref<User[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const fetchPlayers = async () => {
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
  <AppScreen>
    <AppCard variant="paper" class="players-card">
      <div class="players-header">
        <AppText variant="title" as="h2">{{ t('players.title') }}</AppText>
        <AppPrimaryButton
            icon="pixelarticons:reload"
            :loading="loading"
            @click="fetchPlayers"
        >
          {{ t('players.refresh') }}
        </AppPrimaryButton>
      </div>

      <div v-if="loading" class="state-msg">
        <AppText variant="body">{{ t('players.loading') }}</AppText>
      </div>
      <div v-else-if="error" class="error-msg">
        <AppText variant="body" color="danger">{{ error }}</AppText>
      </div>
      <div v-else-if="players.length === 0" class="state-msg">
        <AppText variant="body">{{ t('players.empty') }}</AppText>
      </div>

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
            <AppText variant="subtitle" as="div" class="player-name">
              {{ player.firstName || player.lastName ? (player.firstName ?? '') + ' ' + (player.lastName ?? '') : t('profile.no_name') }}
            </AppText>
          </div>
          <div class="player-score">
            <img src="/strawberry.png" alt="Strawberry" class="score-icon" />
            <AppText variant="subtitle" color="success">
              {{ player.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0 }}
            </AppText>
          </div>
        </li>
      </ul>
    </AppCard>
  </AppScreen>
</template>

<style scoped>
.players-card {
  width: 100%;
}

.players-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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
  font-family: var(--font-pixel);
  font-size: 11px;
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

.state-msg, .error-msg {
  text-align: center;
  margin: 20px 0;
}
</style>
