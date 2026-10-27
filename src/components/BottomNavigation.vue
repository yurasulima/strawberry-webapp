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

const btnSize = computed(() => (isAdmin.value ? 62 : 62))
const cardWidth = computed(() => (isAdmin.value ? 'min(380px, calc(100vw - 12px))' : 'min(336px, calc(100vw - 12px))'))

function switchTab(tab: TabType) {
  emit('changeTab', tab)
}
</script>

<template>
  <div class="bottom-navigation-container">
    <CardPrimary :width="cardWidth" height="66px" :padding="2">
      <div class="bottom-navigation-bar" :class="{ 'is-admin-bar': isAdmin }">

        <GameButton
            :width="btnSize"
            :height="btnSize"
            :active="props.activeTab === 'clicker'"
            @click="switchTab('clicker')"
        />

        <InventoryButton
            :width="btnSize"
            :height="btnSize"
            :active="props.activeTab === 'inventory'"
            @click="switchTab('inventory')"
        />

        <BusinessButton
            :width="btnSize"
            :height="btnSize"
            :active="props.activeTab === 'business'"
            @click="switchTab('business')"
        />

        <ShopButton
            :width="btnSize"
            :height="btnSize"
            :active="props.activeTab === 'shop'"
            @click="switchTab('shop')"
        />

        <TopButton
            :width="btnSize"
            :height="btnSize"
            :active="props.activeTab === 'users'"
            @click="switchTab('users')"
        />

        <AdminButton
            v-if="isAdmin"
            :width="btnSize"
            :height="btnSize"
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

.bottom-navigation-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
}

.bottom-navigation-bar.is-admin-bar {
  gap: 1px;
}
</style>
