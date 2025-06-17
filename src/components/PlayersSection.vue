<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts";

interface Item {
  id: number
  name: string
}

interface Slot {
  id: number
  item: Item
  count: number
}

interface Player {
  photoUrl?: string | null
  createAt: string
  userId: number
  telegramId: number
  firstName: string | null
  lastName: string | null
  bio: string | null
  lang: string | null
  premium: boolean
  banned: boolean
  slots: Slot[]
}


const players = ref<Player[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const fetchPlayers = async () => {
  loading.value = true
  error.value = null

  try {
     const response = await api.get('/users')
     players.value = await response.data
    console.log(players)

  } catch (e) {
    error.value = 'Не вдалося завантажити гравців'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPlayers()
})
</script>

<template>
  <div class="players-section">
    <h2>Гравці</h2>

    <p v-if="loading">Завантаження...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <div style="text-align: center; margin-bottom: 12px;">
      <button @click="fetchPlayers" :disabled="loading" class="refresh-button">
        🔄 Оновити
      </button>
    </div>

    <ul v-if="!loading && !error && players.length" class="players-list">

      <li v-for="player in players" :key="player.userId" class="player-item">
        <img
            v-if="player.photoUrl"
            :src="player.photoUrl"
            alt="Avatar"
            class="player-avatar"
            draggable="false"
        />
        <div class="player-name">
          {{ player.firstName ?? '' }} {{ player.lastName ?? '' }}
        </div>
        <div class="player-strawberry">
        <span class="strawberry-count">
          {{ player.slots.find(s => s.item.name === 'strawberry')?.count ?? 0 }}
        </span>

        </div>
      </li>
    </ul>


    <p v-if="!loading && !error && players.length === 0">Гравців немає.</p>
  </div>
</template>

<style scoped>

.refresh-button {
  background-color: #1c1d2e;
  width: 100%;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: background-color 0.2s ease;
}
.refresh-button:hover {
  background-color: #333;
}
.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


.players-section {
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
  padding: 10px 16px;
  background-color: #b8cfce;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(0,0,0,0.4);
  color: #333446;
}

.players-section h2 {
  text-align: center;
  margin-bottom: 16px;
  font-weight: bold;
  color: #1c1d2e;
}

.players-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.player-item {
  display: flex;
  align-items: center;
  justify-content: space-between; /* <-- рознести ім'я і полунички по краях */
  gap: 12px;
  padding: 10px 15px;
  background-color: #eafef0;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: inset 0 0 6px #7f8caa;
  user-select: none;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  user-select: none;
  pointer-events: none;
}

.player-name {
  flex-grow: 1; /* щоб ім'я займало доступне місце між аватаром і полуничками */
  font-size: 16px;
  color: #1c1d2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 8px; /* відступ від аватарки */
}

.player-strawberry {
  display: flex;
  align-items: center;
  gap: 6px;
}

.strawberry-count {
  font-weight: 700;
  font-size: 18px;
  min-width: 20px;
  text-align: right;
}

.player-name {
  font-size: 16px;
  color: #1c1d2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.error {
  color: #dc143c;
  font-weight: bold;
  text-align: center;
}
</style>
