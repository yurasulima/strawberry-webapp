<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { AppScreen, AppCard, AppText } from '@/components/ui'
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
  <AppScreen>
    <AppCard variant="paper" v-if="player" class="profile-card">
      <!-- Аватар і ім'я -->
      <div class="profile-header">
        <img
            :src="player.photoUrl ?? '/default-avatar.png'"
            alt="Аватар"
            class="profile-avatar"
            draggable="false"
        />
        <div class="profile-name-status">
          <AppText variant="title" as="h2" class="profile-name">
            {{ player.firstName || player.lastName ? (player.firstName ?? '') + ' ' + (player.lastName ?? '') : t('profile.no_name') }}
          </AppText>
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
        <AppText variant="body" class="profile-bio">{{ player.bio }}</AppText>
      </div>

      <!-- Головний показник: Полунички -->
      <div class="strawberry-banner">
        <AppText variant="subtitle" class="banner-title">{{ t('profile.strawberries') }}</AppText>
        <div class="strawberry-row">
          <img src="/strawberry.png" alt="Strawberry" class="main-strawberry-icon" />
          <AppText variant="title" color="success" class="main-strawberry-count">
            {{ player.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0 }}
          </AppText>
        </div>
      </div>

      <!-- RPG Інвентар -->
      <div class="profile-inventory">
        <AppText variant="subtitle" as="h3">🎒 {{ t('profile.inventory') }}</AppText>
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
          <AppText variant="caption" color="muted">Інвентар порожній</AppText>
        </div>
      </div>
    </AppCard>

    <!-- Стан завантаження -->
    <AppCard variant="paper" v-else class="loading-state">
      <Icon icon="pixelarticons:reload" class="loading-icon spin" />
      <AppText variant="body">{{ t('profile.loading') }}</AppText>
    </AppCard>

    <!-- Список запрошених друзів -->
    <InvitedUserList />
  </AppScreen>
</template>

<style scoped>
.profile-card {
  width: 100%;
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
  font-family: var(--font-pixel);
  font-size: 9px;
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

.profile-inventory h3 {
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
  font-family: var(--font-pixel);
  font-size: 10px;
  font-weight: bold;
  color: #3f2e21;
  text-shadow: 1px 1px #fff;
}

.slot-tooltip {
  font-family: var(--font-pixel-retro);
  font-size: 13px;
  position: absolute;
  top: -24px;
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
  text-align: center;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
}

.loading-icon.spin {
  animation: spin 1s linear infinite;
  font-size: 20px;
  color: #3f2e21;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
