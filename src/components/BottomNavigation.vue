<script setup lang="ts">
import {ref} from 'vue'
import {
  GameButton,
  ShopButton,
  TopButton,
  SettingsButton,
  CardPrimary
} from '@/components/pixel'
import BusinessButton from "@/components/pixel/BusinessButton.vue";

const props = defineProps<{ activeTab: 'clicker' | 'profile' | 'users' | 'shop' | 'business' | 'debug' }>()
const emit = defineEmits<{
  (e: 'changeTab', tab: 'clicker' | 'profile' | 'users' | 'shop' | 'business' | 'debug'): void
}>()

const profileClickCount = ref(0)
let lastClickTime = 0

function switchTab(tab: 'clicker' | 'profile' | 'users' | 'shop' | 'business' | 'debug') {
  emit('changeTab', tab)
}

function handleProfileClick() {
  const now = Date.now()
  if (now - lastClickTime > 600) {
    profileClickCount.value = 1
  } else {
    profileClickCount.value++
  }

  lastClickTime = now

  if (profileClickCount.value >= 7) {
    emit('changeTab', 'debug')
    profileClickCount.value = 0
  } else {
    emit('changeTab', 'profile')
  }
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
