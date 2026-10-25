<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWebApp } from "vue-tg"
import { useAuthStore } from "@/stores/auth.ts"
import { useUserStore } from "@/stores/user.ts"
import Toolbar from "@/components/Toolbar.vue"
import PlayersSection from '@/components/PlayersSection.vue'
import ClickerSection from '@/components/ClickerSection.vue'
import InventorySection from '@/components/InventorySection.vue'
import ProfileSection from '@/components/ProfileSection.vue'
import DebugSection from '@/components/DebugSection.vue'
import BottomNavigation, { type TabType } from '@/components/BottomNavigation.vue'
import BussinesSection from "@/components/BussinesSection.vue"
import MarketSection from "@/components/MarketSection.vue"
import SettingsSection from "@/components/SettingsSection.vue"
import AdminSection from "@/components/AdminSection.vue"
import DailyRewardsModal from "@/components/DailyRewardsModal.vue"
import { PixelToastContainer } from "@/components/pixel"
import api from "@/services/api.ts"
import { useRouter } from 'vue-router'

const { t } = useI18n()
const isLoading = ref(true)
const showDailyRewards = ref(false)
const userStore = useUserStore()
const { initDataUnsafe } = useWebApp()
const user = initDataUnsafe.user || { id: 1, first_name: "Тест", last_name: "Акк", username: "testAkk", language_code: null, photo_url: "https://api.dangerous.pp.ua/image/null.png" }

if (user === undefined) {
  const router = useRouter()
  router.replace('/404')
}

const activeTab = ref<TabType>('clicker')

watch(activeTab, () => {
  userStore.fetchUser()
})

onMounted(async () => {
  if (!user) {
    console.log('User is null or undefined')
    isLoading.value = false
    return
  }
  try {
    const response = await api.post('/auth/telegram', {
      telegram_id: user.id,
      photo_url: user.photo_url,
      last_name: user.last_name,
      first_name: user.first_name,
      username: user.username,
      language_code: user.language_code,
      inviter_telegram_id: initDataUnsafe.start_param,
    })
    if (user.language_code) {
      localStorage.setItem('lang', user.language_code)
    }

    if (response.status === 200) {
      const auth = useAuthStore()
      auth.login(response.data)
      userStore.setUser(response.data)
      if (userStore.canClaimDaily) {
        showDailyRewards.value = true
      }
    }
  } catch (error) {
    console.error('API call error:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="app-container">
    <PixelToastContainer />

    <!-- Показуємо splash, поки isLoading -->
    <div v-if="isLoading" class="splash-screen">
      <div class="loader">{{ t('loading') }}</div>
    </div>

    <!-- Основний контент показуємо, якщо не завантажуємо -->
    <template v-else>
      <Toolbar
          v-if="activeTab !== 'admin'"
          :language_code="user.language_code"
          :firstName="user.first_name"
          :lastName="user.last_name"
          :avatar="user.photo_url"
          :money="userStore.money"
          :strawberry="userStore.strawberries"
          @openSettings="activeTab = activeTab === 'settings' ? 'clicker' : 'settings'"
          @openDailyRewards="showDailyRewards = true"
      />

      <DailyRewardsModal v-model="showDailyRewards" />

      <div class="main-content">
        <ClickerSection v-show="activeTab === 'clicker'" />
        <InventorySection v-show="activeTab === 'inventory'" />
        <ProfileSection v-show="activeTab === 'profile'" />
        <BussinesSection v-show="activeTab === 'business'" :user="user" />
        <MarketSection v-show="activeTab === 'shop'" :user="user" />
        <PlayersSection v-show="activeTab === 'users'" />
        <SettingsSection v-show="activeTab === 'settings'" @close="activeTab = 'clicker'" />
        <AdminSection v-show="activeTab === 'admin'" />
        <DebugSection v-show="activeTab === 'debug'" />
      </div>

      <BottomNavigation class="bott" :activeTab="activeTab" @changeTab="activeTab = $event" />
    </template>
  </div>
</template>

<style scoped>

.app-container {
  background-image: url("/new_background.png"); /* без 'public/' */
  background-size: cover; /* покриває весь контейнер */
  background-position: center;
  background-repeat: no-repeat;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  max-width: 420px;
  margin: 0 auto;
  min-height: 100vh;
  color: #EAEFEF;
  font-family: "Pixel", "Segoe UI", sans-serif;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}
.app-container::before {
  content: "";
  position: absolute;
  inset: 0;
  backdrop-filter: blur(1px);
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 0;
}

.main-content {
  z-index: 1;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 70px;
}
.bott {

  z-index: 1;
}
.splash-screen {
  position: fixed;
  inset: 0;
  background-color: #222;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  z-index: 2000;
}

.loader {
  /* Можна тут зробити анімацію або просто текст */
}
</style>
