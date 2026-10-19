<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import InvitedUserList from "@/components/InvitedUserList.vue";
import type { User } from "@/types/User.ts";

const { t } = useI18n()
const player = ref<User | null>(null)

onMounted(async () => {
  try {
    const response = await api.get('/users/me')
    player.value = response.data
  } catch (error) {
    console.error('API call error:', error)
  }
})

function getItemIcon(itemName: string) {
  if (itemName === 'strawberry') return '/strawberry.png'
  if (itemName === 'money') return '/honeywood/icons/interface/coin.png'
  return '/honeywood/icons/nature/sprout.png'
}
</script>

<template>
  <div class="profile-container">
    <div class="profile-card honeywood-panel-paper" v-if="player">
      <!-- Аватар і ім'я -->
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
            <span v-if="player.premium" class="tag premium">
              <Icon icon="pixelarticons:zap" class="tag-icon" />
              <span>{{ t('profile.premium') }}</span>
            </span>
            <span v-if="player.banned" class="tag banned">
              <Icon icon="pixelarticons:close" class="tag-icon" />
              <span>{{ t('profile.banned') }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Опис профілю -->
      <div class="profile-bio-box" v-if="player.bio && player.bio.trim().length">
        <p class="profile-bio">{{ player.bio }}</p>
      </div>

      <!-- Головний показник: Полунички -->
      <div class="strawberry-banner">
        <div class="banner-title">{{ t('profile.strawberries') }}</div>
        <div class="strawberry-row">
          <img src="/strawberry.png" alt="Strawberry" class="main-strawberry-icon" />
          <span class="main-strawberry-count">
            {{ player.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0 }}
          </span>
        </div>
      </div>

      <!-- RPG Інвентар -->
      <div class="profile-inventory">
        <h3>🎒 {{ t('profile.inventory') }}</h3>
        <div class="inventory-grid" v-if="player.slots && player.slots.length">
          <div
              v-for="slot in player.slots"
              :key="slot.id"
              class="inventory-slot honeywood-slot"
          >
            <img :src="getItemIcon(slot.item?.name)" class="slot-item-icon" :alt="slot.item?.name" />
            <span class="slot-count">×{{ slot.count }}</span>
            <div class="slot-tooltip">{{ t('items.' + slot.item?.name) }}</div>
          </div>
        </div>
        <div v-else class="empty-inventory">
          Інвентар порожній
        </div>
      </div>
    </div>

    <!-- Стан завантаження -->
    <div v-else class="loading-state honeywood-panel-paper">
      <Icon icon="pixelarticons:reload" class="loading-icon spin" />
      <span>{{ t('profile.loading') }}</span>
    </div>

    <!-- Список запрошених друзів -->
    <InvitedUserList />
  </div>
</template>

<style scoped>
.profile-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
}

.profile-card {
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #5d4037;
  flex-shrink: 0;
}

.profile-name-status {
  flex-grow: 1;
  overflow: hidden;
}

.profile-name {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #3f2e21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-tags {
  margin-top: 6px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 8px;
  font-size: 9px;
  font-family: var(--font-pixel);
  border-radius: 6px;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.premium {
  background-color: #2e7d32;
  border: 1px solid #1b5e20;
}

.banned {
  background-color: #c62828;
  border: 1px solid #8e0000;
}

.profile-bio-box {
  background-color: rgba(63, 46, 33, 0.08);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(63, 46, 33, 0.2);
  margin-bottom: 16px;
}

.profile-bio {
  font-size: 16px;
  margin: 0;
  color: #3f2e21;
  white-space: pre-wrap;
  word-break: break-word;
}

.strawberry-banner {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 20px;
  box-shadow: 0 3px 0 #3e2723;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.banner-title {
  font-size: 11px;
  font-family: var(--font-pixel);
  color: #5d4037;
}

.strawberry-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-strawberry-icon {
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
}

.main-strawberry-count {
  font-size: 16px;
  font-family: var(--font-pixel);
  font-weight: bold;
  color: #2e7d32;
}

.profile-inventory {
  margin-top: 16px;
}

.profile-inventory h3 {
  font-size: 12px;
  color: #3f2e21;
  margin-bottom: 12px;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 10px;
}

.inventory-slot {
  width: 100%;
  aspect-ratio: 1;
  position: relative;
  box-sizing: border-box;
  padding: 6px;
}

.slot-item-icon {
  width: 28px;
  height: 28px;
  image-rendering: pixelated;
  object-fit: contain;
}

.slot-count {
  position: absolute;
  bottom: 3px;
  right: 4px;
  font-size: 10px;
  font-family: var(--font-pixel);
  font-weight: bold;
  color: #3f2e21;
  text-shadow: 1px 1px #fff;
}

.slot-tooltip {
  font-size: 9px;
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: #3f2e21;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.inventory-slot:hover .slot-tooltip {
  opacity: 1;
}

.empty-inventory {
  font-size: 11px;
  color: #7c624d;
  text-align: center;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  font-size: 12px;
  color: #3f2e21;
}

.loading-icon.spin {
  animation: spin 1s linear infinite;
  font-size: 18px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
