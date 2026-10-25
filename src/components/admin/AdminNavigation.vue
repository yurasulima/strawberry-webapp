<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {AdminButton, CardPrimary, LeftButton, PixelButton} from '@/components/pixel'

export type AdminTabType =
  | 'admin-telemetry'
  | 'admin-businesses'
  | 'admin-items'
  | 'admin-users'

const props = defineProps<{ activeTab: string }>()

const emit = defineEmits<{
  (e: 'changeTab', tab: AdminTabType): void
  (e: 'exit'): void
}>()

const { t } = useI18n()

const tabs: { id: AdminTabType; emoji: string; labelKey: string }[] = [
  { id: 'admin-telemetry', emoji: '📊', labelKey: 'admin.nav.telemetry' },
  { id: 'admin-businesses', emoji: '🏭', labelKey: 'admin.nav.businesses' },
  { id: 'admin-items', emoji: '📦', labelKey: 'admin.nav.items' },
  { id: 'admin-users', emoji: '👥', labelKey: 'admin.nav.users' },
]
</script>

<template>
  <div class="admin-nav-container">

    <CardPrimary width="350px" height="70px" :padding="1">
      <div class="admin-nav-bar">

        <div class="admin-nav-item">
          <LeftButton size="64" :title="t('admin.nav.back')" @click="emit('exit')" />
        </div>



        <div v-for="tab in tabs" :key="tab.id" class="admin-nav-item">
          <AdminButton
              size="64"
              :active="props.activeTab === tab.id"
              @click="emit('changeTab', tab.id)"
          />


        </div>
      </div>
    </CardPrimary>
  </div>
</template>

<style scoped>
.admin-nav-container {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: calc(100vw - 24px);
}

.admin-nav-bar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
}

.admin-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 66px;
}

.admin-nav-emoji {
  font-size: 26px;
  line-height: 1;
}

.admin-nav-label {
  margin-top: -6px;
  font-family: 'Crumbline', sans-serif;
  font-size: 11px;
  line-height: 1;
  color: #3f2e21;
  white-space: nowrap;
  max-width: 66px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-nav-label.is-active {
  color: #2e7d32;
  font-weight: bold;
}
</style>
