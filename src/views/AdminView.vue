<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { CardPrimary, ButtonText, PixelToastContainer } from '@/components/pixel'
import FlatCard from '@/components/pixel/FlatCard.vue'
import WebLoginModal from '@/components/WebLoginModal.vue'
import AdminTelemetrySection from '@/components/admin/AdminTelemetrySection.vue'
import AdminChatsSection from '@/components/admin/AdminChatsSection.vue'
import AdminBusinessesSection from '@/components/admin/AdminBusinessesSection.vue'
import AdminItemsSection from '@/components/admin/AdminItemsSection.vue'
import AdminUsersSection from '@/components/admin/AdminUsersSection.vue'
import type { AdminTabType } from '@/components/admin/AdminNavigation.vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useUserStore } from '@/stores/user.ts'
import { useItemCatalogStore } from '@/stores/itemCatalog.ts'
import { playClickSound } from '@/services/sound.ts'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const itemCatalog = useItemCatalogStore()

const isLoading = ref(true)
const showWebLogin = ref(false)

interface NavItem {
  id: AdminTabType
  labelKey: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'admin-telemetry', labelKey: 'admin.nav.telemetry', icon: 'pixelarticons:chart-bar' },
  { id: 'admin-users', labelKey: 'admin.nav.users', icon: 'pixelarticons:users' },
  { id: 'admin-chats', labelKey: 'admin.nav.chats', icon: 'pixelarticons:chat' },
  { id: 'admin-businesses', labelKey: 'admin.nav.businesses', icon: 'pixelarticons:briefcase' },
  { id: 'admin-items', labelKey: 'admin.nav.items', icon: 'pixelarticons:archive' },
]

// Вкладка зберігається в URL (?tab=users) — працює оновлення сторінки та кнопки "назад"
const tabFromQuery = (): AdminTabType => {
  const raw = String(route.query.tab || '')
  const id = (raw.startsWith('admin-') ? raw : `admin-${raw}`) as AdminTabType
  return navItems.some(n => n.id === id) ? id : 'admin-telemetry'
}

const activeTab = ref<AdminTabType>(tabFromQuery())

watch(() => route.query.tab, () => {
  activeTab.value = tabFromQuery()
})

function changeTab(tab: AdminTabType) {
  if (tab === activeTab.value) return
  playClickSound()
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab: tab.replace('admin-', '') } })
}

const isAdmin = computed(() => !!userStore.user?.admin)
const activeNav = computed(() => navItems.find(n => n.id === activeTab.value))

const displayName = computed(() => {
  const u = userStore.user
  if (!u) return ''
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || `#${u.userId ?? ''}`
})
const avatar = computed(() => userStore.user?.photoUrl || '/default-avatar.png')

function exitAdmin() {
  playClickSound()
  router.push('/')
}

function openCats() {
  playClickSound()
  router.push('/cats')
}

async function bootstrap() {
  isLoading.value = true
  try {
    if (!authStore.token) {
      showWebLogin.value = true
      return
    }
    const res = await userStore.fetchUser()
    if (!res) {
      authStore.logout()
      showWebLogin.value = true
      return
    }
    if (userStore.user?.admin) {
      await itemCatalog.preloadAll()
    }
  } catch (e) {
    console.error('Admin auth error:', e)
    authStore.logout()
    showWebLogin.value = true
  } finally {
    isLoading.value = false
  }
}

async function handleWebLoginSuccess() {
  showWebLogin.value = false
  await bootstrap()
}

onMounted(() => {
  // знімаємо мобільне обмеження ширини #app (див. main.css) лише на час життя цієї сторінки
  document.body.classList.add('admin-desktop')
  void bootstrap()
})

onBeforeUnmount(() => {
  document.body.classList.remove('admin-desktop')
})
</script>

<template>
  <div class="admin-page">
    <PixelToastContainer />
    <WebLoginModal v-if="showWebLogin" @success="handleWebLoginSuccess" />

    <div v-if="isLoading" class="splash">{{ t('loading') }}</div>

    <!-- Немає прав -->
    <div v-else-if="!showWebLogin && !isAdmin" class="denied">
      <CardPrimary width="min(420px, calc(100vw - 24px))" height="auto" :padding="16">
        <h2 class="denied-title">{{ t('admin.title') }}</h2>
        <p class="denied-text">{{ t('admin.access_denied') }}</p>
        <ButtonText width="100%" @click="exitAdmin">{{ t('admin.nav.back') }}</ButtonText>
      </CardPrimary>
    </div>

    <div v-else-if="isAdmin" class="layout">
      <!-- Сайдбар -->
      <aside class="sidebar">
        <CardPrimary width="100%" height="100%" :padding="10">
          <div class="sidebar-inner">
            <div class="brand">
              <img class="brand-logo" src="/favicons/android-icon-192x192.png" alt="" />
              <span class="brand-title">{{ t('admin.title') }}</span>
            </div>

            <nav class="nav">
              <ButtonText
                v-for="item in navItems"
                :key="item.id"
                width="100%"
                :active="activeTab === item.id"
                @click="changeTab(item.id)"
              >
                <span class="nav-label">
                  <Icon :icon="item.icon" class="nav-icon" />
                  {{ t(item.labelKey) }}
                </span>
              </ButtonText>

              <ButtonText width="100%" @click="openCats">
                <span class="nav-label">
                  <Icon icon="pixelarticons:heart" class="nav-icon" />
                  Котики
                </span>
              </ButtonText>
            </nav>

            <div class="sidebar-footer">
              <FlatCard width="100%" height="auto" padding="8px 10px">
                <div class="me">
                  <img class="me-avatar" :src="avatar" alt="" />
                  <div class="me-info">
                    <span class="me-name">{{ displayName }}</span>
                    <span class="me-role">admin</span>
                  </div>
                </div>
              </FlatCard>
              <ButtonText width="100%" @click="exitAdmin">
                <span class="nav-label">
                  <Icon icon="pixelarticons:logout" class="nav-icon" />
                  {{ t('admin.nav.back') }}
                </span>
              </ButtonText>
            </div>
          </div>
        </CardPrimary>
      </aside>

      <!-- Контент -->
      <main class="content">


        <div class="section-wrap">
          <AdminTelemetrySection v-if="activeTab === 'admin-telemetry'" />
          <AdminUsersSection v-else-if="activeTab === 'admin-users'" />
          <AdminChatsSection v-else-if="activeTab === 'admin-chats'" />
          <AdminBusinessesSection v-else-if="activeTab === 'admin-businesses'" />
          <AdminItemsSection v-else-if="activeTab === 'admin-items'" />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  position: relative;
  min-height: 100vh;
  color: #eaefef;
  font-family: var(--font-pixel);
  background-color: #1d1712;
  background-image: url('/new_background.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  box-sizing: border-box;
}

.admin-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(1px);
  pointer-events: none;
  z-index: 0;
}

.splash {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
  color: #fff;
  font-size: 18px;
  z-index: 2000;
}

.denied {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: #3f2e21;
}

.denied-title {
  margin: 0 0 10px;
  font-size: 22px;
  text-align: center;
}

.denied-text {
  margin: 0 0 14px;
  text-align: center;
  font-size: 18px;
}

/* ───────── Десктопний layout ───────── */
.layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  box-sizing: border-box;
}

.sidebar {
  position: sticky;
  top: 16px;
  height: calc(100vh - 32px);
  min-height: 520px;
  color: #3f2e21;
}

.sidebar-inner {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 0;
}

.brand-logo {
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
}

.brand-title {
  font-size: 22px;
  line-height: 1.1;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-label {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
}

.nav-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.sidebar-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.me {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.me-avatar {
  width: 36px;
  height: 36px;
  object-fit: cover;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.me-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.me-name {
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.me-role {
  font-size: 13px;
  color: #8a6f58;
}

.content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 0;
}

.topbar-icon {
  font-size: 28px;
}

.topbar-title {
  margin: 0;
  font-size: 28px;
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6);
}

.section-wrap {
  width: 100%;
  max-width: 1280px;
  color: #3f2e21;
}

/* ───────── Адаптація мобільних секцій під широкий екран ───────── */
.section-wrap :deep(.stats-grid) {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.section-wrap :deep(.telemetry-grid),
.section-wrap :deep(.chat-stats-grid) {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.section-wrap :deep(.item-grid) {
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

/* ПК: збільшуємо весь контент і сайдбар */
@media (min-width: 1100px) {
  .layout {
    grid-template-columns: 340px minmax(0, 1fr);
    max-width: 1900px;
  }

  .section-wrap {
    zoom: 1.3;
    max-width: 1500px;
  }

  .topbar-title { font-size: 34px; }
  .topbar-icon { font-size: 34px; }
  .brand-logo { width: 52px; height: 52px; }
  .brand-title { font-size: 28px; }
  .nav-label { font-size: 22px; }
  .nav-icon { font-size: 28px; }
  .me-avatar { width: 46px; height: 46px; }
  .me-name { font-size: 20px; }
  .me-role { font-size: 16px; }
}

/* Вузький екран (планшет) — сайдбар стає верхньою панеллю */
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
    min-height: 0;
  }

  .sidebar-footer {
    margin-top: 0;
  }
}
</style>

<style>
body.admin-desktop #app {
  max-width: none;
  margin: 0;
}
</style>
