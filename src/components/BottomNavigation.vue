<script setup lang="ts">
import { computed } from 'vue'
import {
  GameButton,
  ShopButton,
  TopButton,
  AdminButton,
  CardPrimary
} from '@/components/pixel'
import BusinessButton from "@/components/pixel/BusinessButton.vue"
import { useUserStore } from '@/stores/user'
import InventoryButton from "@/components/pixel/InventoryButton.vue";
import type { AdminTabType } from '@/components/admin/AdminNavigation.vue'

export type TabType = 'clicker' | 'inventory' | 'profile' | 'users' | 'shop' | 'business' | 'debug' | 'settings' | AdminTabType

const props = defineProps<{ activeTab: TabType }>()
const emit = defineEmits<{
  (e: 'changeTab', tab: TabType): void
}>()

const userStore = useUserStore()
const isAdmin = computed(() => !!userStore.user?.admin)
const isAdminActive = computed(() => props.activeTab.startsWith('admin'))

function switchTab(tab: TabType) {
  emit('changeTab', tab)
}
</script>

<template>
  <div class="bottom-navigation-container">
    <CardPrimary :width="isAdmin ? '410px' : '350px'" height="70px" :padding="1">
      <div class="bottom-navigation-bar">

        <GameButton
            size="64"
            :active="props.activeTab === 'clicker'"
            @click="switchTab('clicker')"
        />

        <InventoryButton
            size="64"
            :active="props.activeTab === 'inventory'"
            @click="switchTab('inventory')"
        />

        <BusinessButton
            size="64"
            :active="props.activeTab === 'business'"
            @click="switchTab('business')"
        />

        <ShopButton
            size="64"
            :active="props.activeTab === 'shop'"
            @click="switchTab('shop')"
        />

        <TopButton
            size="64"
            :active="props.activeTab === 'users'"
            @click="switchTab('users')"
        />

        <AdminButton
            v-if="isAdmin"
            size="64"
            :active="isAdminActive"
            @click="switchTab('admin-telemetry')"
        />

      </div>
    </CardPrimary>
  </div>
</template>

<style scoped>
.bottom-navigation-container {
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

.bottom-navigation-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
</style>
