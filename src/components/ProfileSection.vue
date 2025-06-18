<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

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

const player = ref<Player | null>(null)

onMounted(async () => {
  try {
    const response = await api.get('/users/me')
    player.value = response.data
  } catch (error) {
    console.error('API call error:', error)
  }
})
</script>

<template>
  <div class="profile-section" v-if="player">
    <div class="profile-header">
      <img
          :src="player.photoUrl ?? '/default-avatar.png'"
          alt="Аватар"
          class="profile-avatar"
          draggable="false"
      />
      <div class="profile-name-status">
        <h2 class="profile-name">
          {{ player.firstName || player.lastName ? (player.firstName ?? '') + ' ' + (player.lastName ?? '') : t('profile.no_name') }}
        </h2>
        <div class="status-tags">

          <span v-if="player.premium" class="tag premium">{{ t('profile.premium') }}</span>
          <span v-if="player.banned" class="tag banned">{{ t('profile.banned') }}</span>
        </div>
      </div>
    </div>

    <p class="profile-bio" v-if="player.bio && player.bio.trim().length">
      {{ player.bio }}
    </p>
    <div class="profile-strawberries">
      <h3>{{ t('profile.strawberries') }}</h3>
      <div
          v-for="slot in player.slots.filter(s => s.item.name === 'strawberry')"
          :key="slot.id"
          class="strawberry-item"
      >
        <img src="/strawberry.png" alt="Strawberry" class="strawberry-icon" />
        <span class="count">{{ slot.count }}</span>
      </div>
      <div v-if="!player.slots.some(s => s.item.name === 'strawberry')">
        {{ t('profile.no_strawberries') }}
      </div>

    </div>

    <div class="profile-inventory">
      <h3>{{ t('profile.inventory') }}</h3>
      <div class="inventory-grid">
        <div
            v-for="slot in player.slots"
            :key="slot.id"
            class="inventory-item"
        >
          <div class="item-name">{{ t('items.' + slot.item.name) }}</div>
          <div class="item-count">×{{ slot.count }}</div>
        </div>
      </div>
    </div>

  </div>
  <div v-else class="loading">{{ t('profile.loading') }}</div>
</template>

<style scoped>

.profile-inventory {
  margin-top: 24px;
  font-size: 18px;
  font-weight: bold;
  color: #1c1d2e;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.inventory-item {
  background-color: #e0f0f3;
  padding: 10px;
  border-radius: 10px;
  text-align: center;
  box-shadow: inset 0 0 4px #aaa;
}

.item-name {
  font-size: 14px;
  color: #2a2a2a;
  margin-bottom: 6px;
  word-break: break-word;
}

.item-count {
  font-size: 16px;
  font-weight: 600;
  color: #195870;
}


.profile-section {
  max-width: 400px;
  margin: 20px auto;
  width: 100%;
  padding: 20px;
  background-color: #b8cfce;
  border-radius: 14px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  color: #1c1d2e;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  user-select: none;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 8px #4caf5080;
}

.profile-name-status {
  flex-grow: 1;
}

.profile-name {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0e1017;
}

.status-tags {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 16px;
  color: #fff;
  user-select: none;
}

.premium {
  background-color: #4caf50;
  box-shadow: 0 0 8px #4caf5080;
}

.banned {
  background-color: #dc143c;
  box-shadow: 0 0 8px #dc143c80;
}

.profile-bio {
  font-size: 16px;
  line-height: 1.4;
  background-color: #e0f2f1;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 20px;
  color: #245151;
  white-space: pre-wrap;
  word-break: break-word;
}

.profile-strawberries {
  font-weight: 700;
  font-size: 18px;
  color: #1c1d2e;
}

.strawberry-list {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.strawberry-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #eafef0;
  padding: 6px 10px;
  border-radius: 12px;
  box-shadow: inset 0 0 6px #7f8caa;
}

.strawberry-icon {
  width: 30px;
  height: 30px;
  image-rendering: pixelated;
  user-select: none;
  pointer-events: none;
}

.count {
  font-size: 20px;
  color: #317a44;
}

.loading {
  text-align: center;
  color: #666;
  font-size: 16px;
  margin-top: 30px;
}
</style>
