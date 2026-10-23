<script setup lang="ts">
import {ref} from 'vue'
import {
  GameButton,
  ShopButton,
  TopButton,
  CardPrimary
} from '@/components/pixel'
import BusinessButton from "@/components/pixel/BusinessButton.vue";

export type TabType = 'clicker' | 'profile' | 'users' | 'shop' | 'business' | 'debug' | 'settings'

const props = defineProps<{ activeTab: TabType }>()
const emit = defineEmits<{
  (e: 'changeTab', tab: TabType): void
}>()

function switchTab(tab: TabType) {
  emit('changeTab', tab)
}
</script>

<template>
  <div class="bottom-navigation-container">
    <CardPrimary width="300px" height="70px" :padding="1">
      <div class="bottom-navigation-bar">

        <GameButton
            size="64"
            :active="props.activeTab === 'clicker'"
            @click="switchTab('clicker')"
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
  gap: 8px;
}
</style>
