<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWebApp } from "vue-tg"
import { useAuthStore } from "@/stores/auth.ts"
import Toolbar from "@/components/Toolbar.vue"
import PlayersSection from '@/components/PlayersSection.vue'
import ClickerSection from '@/components/ClickerSection.vue'
import ProfileSection from '@/components/ProfileSection.vue'
import DebugSection from '@/components/DebugSection.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import api from "@/services/api.ts"
import { useRouter } from 'vue-router'

const money = ref(0)
const isLoading = ref(true)
const { initDataUnsafe } = useWebApp()
const user = initDataUnsafe.user || { id: 1, first_name: "Тест", last_name: "Акк", username: "testAkk", language_code: null, photo_url: "https://api.mblueberry.fun/image/null.png" }

if (user === null) {
  const router = useRouter()
  router.replace('/404')
}

const activeTab = ref<'clicker' | 'profile' | 'users' | 'debug'>('clicker')




const activeComponent = computed(() => {
  switch (activeTab.value) {
    case 'clicker': return ClickerSection
    case 'profile': return ProfileSection
    case 'users': return PlayersSection
    case 'debug': return DebugSection
    default: return ClickerSection
  }
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
    })
    if (user.language_code !== null) {
      localStorage.setItem('lang', user.language_code)
    }
    const moneySlot = response.data.slots?.find((slot: any) => slot.item?.name === 'money')
    money.value = moneySlot?.count || 0

    if (response.status === 200) {
      const auth = useAuthStore()
      auth.login(response.data)
    }
  } catch (error) {
    console.error('API call error:', error)
  } finally {
    isLoading.value = false  // <- після завершення ініціалізації виключаємо завантаження
  }
})
</script>

<template>
  <div class="app-container">
    <!-- Показуємо splash, поки isLoading -->
    <div v-if="isLoading" class="splash-screen">
      <div class="loader">Завантаження...</div>
    </div>

    <!-- Основний контент показуємо, якщо не завантажуємо -->
    <template v-else>
      <Toolbar
          :language_code="user.language_code"
          :firstName="user.first_name"
          :lastName="user.last_name"
          :avatar="user.photo_url"
          :money="money"
      />

      <div class="main-content">
        <keep-alive>
          <component :is="activeComponent"/>
        </keep-alive>
      </div>

      <BottomNavigation class="bott" :activeTab="activeTab" @changeTab="activeTab = $event" />
    </template>
  </div>
</template>

<style scoped>

.app-container {
  background-image: url("/background.jpg"); /* без 'public/' */
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
  backdrop-filter: blur(5px);
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
  font-size: 22px;
  z-index: 2000;
}

.loader {
  /* Можна тут зробити анімацію або просто текст */
}
</style>
