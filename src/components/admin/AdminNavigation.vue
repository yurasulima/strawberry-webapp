<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CardPrimary, LeftButton, AdminButton } from '@/components/pixel'

export type AdminTabType =
  | 'admin-telemetry'
  | 'admin-chats'
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
  { id: 'admin-chats', emoji: '💬', labelKey: 'admin.nav.chats' },
  { id: 'admin-businesses', emoji: '🏭', labelKey: 'admin.nav.businesses' },
  { id: 'admin-items', emoji: '📦', labelKey: 'admin.nav.items' },
  { id: 'admin-users', emoji: '👥', labelKey: 'admin.nav.users' },
]
</script>

<template>
  <div class="admin-nav-container">
    <CardPrimary width="min(390px, calc(100vw - 12px))" height="70px" :padding="2">
      <div class="admin-nav-bar">
        <div class="admin-nav-item">
          <LeftButton
              :size="64"  :title="t('admin.nav.back')" @click="emit('exit')" />
        </div>

        <div v-for="tab in tabs" :key="tab.id" class="admin-nav-item">
          <AdminButton
              :size="64"
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
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: calc(100vw - 12px);
}

.admin-nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
}

.admin-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
