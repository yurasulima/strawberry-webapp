<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWebApp } from "vue-tg"
import { useAuthStore } from "@/stores/auth.ts"
import { useUserStore } from "@/stores/user.ts"
import Toolbar from "@/components/Toolbar.vue"
import PlayersSection from '@/components/PlayersSection.vue'
import ClickerSection from '@/components/ClickerSection.vue'
import InventorySection from '@/components/InventorySection.vue'
import DebugSection from '@/components/DebugSection.vue'
import BottomNavigation, { type TabType } from '@/components/BottomNavigation.vue'
import BussinesSection from "@/components/BussinesSection.vue"
import MarketSection from "@/components/MarketSection.vue"
import SettingsSection from "@/components/SettingsSection.vue"
import AdminNavigation, { type AdminTabType } from '@/components/admin/AdminNavigation.vue'
import AdminTelemetrySection from '@/components/admin/AdminTelemetrySection.vue'
import AdminChatsSection from '@/components/admin/AdminChatsSection.vue'
import AdminBusinessesSection from '@/components/admin/AdminBusinessesSection.vue'
import AdminItemsSection from '@/components/admin/AdminItemsSection.vue'
import AdminUsersSection from '@/components/admin/AdminUsersSection.vue'
import DailyRewardsModal from "@/components/DailyRewardsModal.vue"
import WebLoginModal from "@/components/WebLoginModal.vue"
import ProfileModal from "@/components/ProfileModal.vue"
import { PixelToastContainer } from "@/components/pixel"
import api from "@/services/api.ts"

const { t } = useI18n()
const isLoading = ref(true)
const showDailyRewards = ref(false)
const showWebLogin = ref(false)
const showProfileModal = ref(false)
const userStore = useUserStore()
const authStore = useAuthStore()
const { initDataUnsafe } = useWebApp()

const isRealTelegramWebApp = computed(() => {
  if (typeof window === 'undefined') return false
  const tg = (window as any).Telegram?.WebApp
  return !!(tg && tg.initData && typeof tg.initData === 'string' && tg.initData.trim().length > 0)
})

const tgUser = computed(() => {
  return isRealTelegramWebApp.value ? initDataUnsafe?.user : null
})

const user = computed(() => {
  if (tgUser.value) {
    return tgUser.value
  }
  return {
    id: userStore.user?.telegramId || 1,
    first_name: userStore.user?.firstName || "Гравець",
    last_name: userStore.user?.lastName || "",
    username: userStore.user?.username || "player",
    language_code: userStore.user?.lang || null,
    photo_url: userStore.user?.photoUrl || "https://api.dangerous.pp.ua/image/null.png"
  }
})

const activeTab = ref<TabType>('clicker')
const isAdminMode = computed(() => activeTab.value.startsWith('admin'))

watch(activeTab, () => {
  if (authStore.token) {
    userStore.fetchUser()
  }
})

async function handleWebLoginSuccess() {
  showWebLogin.value = false
  await userStore.fetchUser()
  if (userStore.canClaimDaily) {
    showDailyRewards.value = true
  }
}

onMounted(async () => {
  if (isRealTelegramWebApp.value && tgUser.value) {
    try {
      const response = await api.post('/auth/telegram', {
        telegram_id: tgUser.value.id,
        photo_url: tgUser.value.photo_url,
        last_name: tgUser.value.last_name,
        first_name: tgUser.value.first_name,
        username: tgUser.value.username,
        language_code: tgUser.value.language_code,
        inviter_telegram_id: initDataUnsafe.start_param,
      })
      if (tgUser.value.language_code) {
        localStorage.setItem('lang', tgUser.value.language_code)
      }

      if (response.status === 200) {
        authStore.login(response.data)
        userStore.setUser(response.data)
        if (userStore.canClaimDaily) {
          showDailyRewards.value = true
        }
      }
    } catch (error) {
      console.error('Telegram WebApp auth error:', error)
    } finally {
      isLoading.value = false
    }
  } else if (authStore.token) {
    try {
      const res = await userStore.fetchUser()
      if (!res) {
        authStore.logout()
        showWebLogin.value = true
      } else if (userStore.canClaimDaily) {
        showDailyRewards.value = true
      }
    } catch (e) {
      console.error('Token invalid or expired, showing web login:', e)
      authStore.logout()
      showWebLogin.value = true
    } finally {
      isLoading.value = false
    }
  } else {
    showWebLogin.value = true
    isLoading.value = false
  }
})
</script>

<template>
  <div class="app-container">
    <PixelToastContainer />

    <!-- Модальне вікно входу для вебу -->
    <WebLoginModal v-if="showWebLogin" @success="handleWebLoginSuccess" />

    <!-- Показуємо splash, поки isLoading -->
    <div v-if="isLoading" class="splash-screen">
      <div class="loader">{{ t('loading') }}</div>
    </div>

    <!-- Основний контент показуємо, якщо не завантажуємо -->
    <template v-else>
      <Toolbar
          v-if="!isAdminMode"
          :language_code="user.language_code"
          :firstName="user.first_name"
          :lastName="user.last_name"
          :avatar="user.photo_url"
          :money="userStore.money"
          :strawberry="userStore.strawberries"
          @openSettings="activeTab = activeTab === 'settings' ? 'clicker' : 'settings'"
          @openDailyRewards="showDailyRewards = true"
          @openProfile="showProfileModal = true"
      />

      <DailyRewardsModal v-model="showDailyRewards" />
      <ProfileModal v-model="showProfileModal" />

      <div class="main-content" :class="{ 'main-content--admin': isAdminMode }">
        <ClickerSection v-show="activeTab === 'clicker'" />
        <InventorySection v-show="activeTab === 'inventory'" />
        <BussinesSection v-show="activeTab === 'business'" :user="user" />
        <MarketSection v-show="activeTab === 'shop'" :user="user" />
        <PlayersSection v-show="activeTab === 'users'" />
        <SettingsSection v-show="activeTab === 'settings'" @close="activeTab = 'clicker'" />
        <template v-if="userStore.user?.admin">
          <AdminTelemetrySection v-if="activeTab === 'admin-telemetry'" />
          <AdminChatsSection v-if="activeTab === 'admin-chats'" />
          <AdminBusinessesSection v-if="activeTab === 'admin-businesses'" />
          <AdminItemsSection v-if="activeTab === 'admin-items'" />
          <AdminUsersSection v-if="activeTab === 'admin-users'" />
        </template>
        <DebugSection v-show="activeTab === 'debug'" />
      </div>

      <AdminNavigation
          v-if="isAdminMode"
          class="bott"
          :activeTab="activeTab"
          @changeTab="activeTab = $event"
          @exit="activeTab = 'clicker'"
      />
      <BottomNavigation v-else class="bott" :activeTab="activeTab" @changeTab="activeTab = $event" />
    </template>
  </div>
</template>

<style scoped>
.app-container {
  background-image: url("/new_background.png");
  background-size: cover;
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
.main-content--admin {
  justify-content: flex-start;
  padding-top: 8px;
  padding-bottom: 110px;
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
}
</style>
