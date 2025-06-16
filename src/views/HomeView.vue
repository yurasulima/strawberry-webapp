<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWebApp } from "vue-tg"
import { useAuthStore } from "@/stores/auth.ts"

import PlayersSection from '@/components/PlayersSection.vue'
import ClickerSection from '@/components/ClickerSection.vue'
import ProfileSection from '@/components/ProfileSection.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import api from "@/services/api.ts";

const { initDataUnsafe } = useWebApp()
const user = initDataUnsafe.user || { id: 1, first_name: "Name", last_name: "Surname", username: "Username", language_code: null, photo_url: "https://api.mblueberry.fun/image/null.png" }
const activeTab = ref<'clicker' | 'profile' | 'users'>('clicker')




onMounted(async () => {
  if (!user) {
    console.log('User is null or undefined')
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
      // allows_write_to_pm: user.allows_write_to_pm,
    })
    if (response.status === 200) {
      const auth = useAuthStore()
      auth.login(response.data)
    }
  } catch (error) {
    console.error('API call error:', error)
  }


})
</script>

<template>
  <div class="app-container">

    <div class="main-content">
      <ClickerSection
          v-if="activeTab === 'clicker'"
      />

      <ProfileSection v-if="activeTab === 'profile'" :user="user" />
      <PlayersSection v-if="activeTab === 'users'" :user="user" />
    </div>

    <BottomNavigation :activeTab="activeTab" @changeTab="activeTab = $event" />
  </div>
</template>

<style scoped>
/* Загальні стилі перенесені в компоненти */
.app-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  max-width: 420px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #333446; /* Найтемніший фон */
  color: #EAEFEF; /* Світлий текст */
  font-family: "Pixel", "Segoe UI", sans-serif;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 70px;
}

.ban-message {
  color: #DC143C; /* Яскраво-червоний */
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
  font-size: 18px;
  padding: 8px;
  background-color: #B8CFCE;
  border: 2px solid #A30F2C;
  border-radius: 5px;
}
</style>
