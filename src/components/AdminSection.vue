<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import type { User } from '@/types/User.ts'
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText, PixelModal, Switch, PremiumBadge } from '@/components/pixel'
import { playClickSound } from '@/services/sound'
import { useToastStore } from '@/stores/toast.ts'

const { t } = useI18n()
const toastStore = useToastStore()

interface AdminStats {
  totalUsers: number
  bannedUsers: number
  totalMoney: number
  totalStrawberries: number
  totalBusinesses: number
}

interface GlobalTelemetry {
  totalClicksAllTime: number
  totalClicksToday: number
  totalClickBatches: number
  uniqueClickersCount: number
  avgClicksPerClicker: number
  avgClicksPerBatch: number
}

interface UserTelemetry {
  userId: number
  telegramId: number
  userName: string
  totalClicks: number
  clicksToday: number
  totalBatches: number
  avgClicksPerBatch: number
  lastClickTime: string | null
}

const stats = ref<AdminStats | null>(null)
const telemetry = ref<GlobalTelemetry | null>(null)
const users = ref<User[]>([])
const search = ref('')
const isLoadingStats = ref(true)
const isLoadingUsers = ref(true)

type SortOption = 'id_desc' | 'id_asc' | 'money_desc' | 'strawberries_desc' | 'online_desc' | 'name_asc'
const sortBy = ref<SortOption>('id_desc')

const sortedUsers = computed(() => {
  const list = [...users.value]
  return list.sort((a, b) => {
    if (sortBy.value === 'id_desc') {
      return (b.userId || 0) - (a.userId || 0)
    }
    if (sortBy.value === 'id_asc') {
      return (a.userId || 0) - (b.userId || 0)
    }
    if (sortBy.value === 'money_desc') {
      return getUserMoney(b) - getUserMoney(a)
    }
    if (sortBy.value === 'strawberries_desc') {
      return getUserStrawberries(b) - getUserStrawberries(a)
    }
    if (sortBy.value === 'online_desc') {
      const timeA = a.lastOnlineAt ? new Date(a.lastOnlineAt).getTime() : 0
      const timeB = b.lastOnlineAt ? new Date(b.lastOnlineAt).getTime() : 0
      return timeB - timeA
    }
    if (sortBy.value === 'name_asc') {
      const nameA = (a.firstName || a.lastName || a.username || '').toLowerCase()
      const nameB = (b.firstName || b.lastName || b.username || '').toLowerCase()
      return nameA.localeCompare(nameB)
    }
    return 0
  })
})

// Resource Modal state
const isModalOpen = ref(false)
const selectedUser = ref<User | null>(null)
const editMoney = ref<number | null>(null)
const editStrawberries = ref<number | null>(null)
const editLevel = ref<number | null>(null)
const isAddMode = ref(false)
const isSavingResources = ref(false)

// Telemetry state
const selectedDate = ref<string>(new Date().toISOString().split('T')[0])

// Telemetry Modal state
const isUserTelemetryModalOpen = ref(false)
const selectedUserTelemetry = ref<UserTelemetry | null>(null)
const isLoadingUserTelemetry = ref(false)
const selectedUserTelemetryDate = ref<string>(new Date().toISOString().split('T')[0])

const actionLoadingMap = ref<Record<string, boolean>>({})

onMounted(async () => {
  await fetchStats()
  await fetchTelemetry()
  await fetchUsers()
})

async function fetchStats() {
  isLoadingStats.value = true
  try {
    const res = await api.get<AdminStats>('/admin/stats')
    stats.value = res.data
  } catch (err: any) {
    console.error('Error fetching admin stats:', err)
  } finally {
    isLoadingStats.value = false
  }
}

async function fetchTelemetry() {
  try {
    const res = await api.get<GlobalTelemetry>('/admin/telemetry', {
      params: { date: selectedDate.value }
    })
    telemetry.value = res.data
  } catch (err: any) {
    console.error('Error fetching telemetry:', err)
  }
}

watch(selectedDate, () => {
  fetchTelemetry()
})

async function fetchUsers() {
  isLoadingUsers.value = true
  try {
    const res = await api.get<User[]>('/admin/users', {
      params: { search: search.value }
    })
    users.value = res.data
  } catch (err: any) {
    console.error('Error fetching users:', err)
  } finally {
    isLoadingUsers.value = false
  }
}

function handleSearch() {
  fetchUsers()
}

async function toggleBan(u: User) {
  playClickSound()
  actionLoadingMap.value[`ban_${u.userId}`] = true
  try {
    const res = await api.post<User>(`/admin/users/${u.userId}/ban`)
    const index = users.value.findIndex(item => item.userId === u.userId)
    if (index !== -1) {
      users.value[index] = res.data
    }
    toastStore.showToast(t('admin.success_update'), 'success')
    await fetchStats()
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`ban_${u.userId}`] = false
  }
}

async function toggleAdmin(u: User) {
  playClickSound()
  actionLoadingMap.value[`admin_${u.userId}`] = true
  try {
    const res = await api.post<User>(`/admin/users/${u.userId}/toggle-admin`)
    const index = users.value.findIndex(item => item.userId === u.userId)
    if (index !== -1) {
      users.value[index] = res.data
    }
    toastStore.showToast(t('admin.success_update'), 'success')
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`admin_${u.userId}`] = false
  }
}

async function togglePremium(u: User) {
  playClickSound()
  actionLoadingMap.value[`premium_${u.userId}`] = true
  try {
    const res = await api.post<User>(`/admin/users/${u.userId}/toggle-premium`)
    const index = users.value.findIndex(item => item.userId === u.userId)
    if (index !== -1) {
      users.value[index] = res.data
    }
    toastStore.showToast(t('admin.success_update'), 'success')
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`premium_${u.userId}`] = false
  }
}

async function resetLimit(u: User) {
  playClickSound()
  actionLoadingMap.value[`limit_${u.userId}`] = true
  try {
    const res = await api.post<User>(`/admin/users/${u.userId}/reset-limit`)
    const index = users.value.findIndex(item => item.userId === u.userId)
    if (index !== -1) {
      users.value[index] = res.data
    }
    toastStore.showToast(t('admin.success_update'), 'success')
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`limit_${u.userId}`] = false
  }
}

function openEditModal(u: User) {
  playClickSound()
  selectedUser.value = u
  const moneySlot = u.slots?.find(s => s.item?.name === 'money')
  const strawberrySlot = u.slots?.find(s => s.item?.name === 'strawberry')
  editMoney.value = moneySlot?.count ?? 0
  editStrawberries.value = strawberrySlot?.count ?? 0
  editLevel.value = (u as any).level ?? 1
  isAddMode.value = false
  isModalOpen.value = true
}

async function openUserTelemetry(u: User) {
  playClickSound()
  selectedUser.value = u
  isUserTelemetryModalOpen.value = true
  isLoadingUserTelemetry.value = true
  try {
    const res = await api.get<UserTelemetry>(`/admin/telemetry/user/${u.userId}`, {
      params: { date: selectedUserTelemetryDate.value }
    })
    selectedUserTelemetry.value = res.data
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    isLoadingUserTelemetry.value = false
  }
}

watch(selectedUserTelemetryDate, () => {
  if (selectedUser.value && isUserTelemetryModalOpen.value) {
    openUserTelemetry(selectedUser.value)
  }
})

async function saveResources() {
  if (!selectedUser.value) return
  isSavingResources.value = true
  try {
    const res = await api.post<User>(`/admin/users/${selectedUser.value.userId}/resources`, {
      money: editMoney.value,
      strawberries: editStrawberries.value,
      level: editLevel.value,
      addMode: isAddMode.value
    })
    const index = users.value.findIndex(item => item.userId === selectedUser.value?.userId)
    if (index !== -1) {
      users.value[index] = res.data
    }
    toastStore.showToast(t('admin.success_update'), 'success')
    isModalOpen.value = false
    await fetchStats()
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    isSavingResources.value = false
  }
}

function getUserMoney(u: User): number {
  return u.slots?.find(s => s.item?.name === 'money')?.count ?? 0
}

function getUserStrawberries(u: User): number {
  return u.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0
}

function formatLastOnline(lastOnlineAt?: string | null): { text: string; isOnline: boolean } {
  if (!lastOnlineAt) return { text: 'Ніколи', isOnline: false }

  const onlineDate = new Date(lastOnlineAt)
  if (isNaN(onlineDate.getTime())) return { text: 'Невідомо', isOnline: false }

  const diffSec = Math.floor((Date.now() - onlineDate.getTime()) / 1000)

  if (diffSec < 120) {
    return { text: 'Онлайн', isOnline: true }
  }

  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60)
    return { text: `${mins} хв тому`, isOnline: false }
  }

  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600)
    return { text: `${hours} год тому`, isOnline: false }
  }

  const days = Math.floor(diffSec / 86400)
  return { text: `${days} дн тому`, isOnline: false }
}

function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return 'Ніколи'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return 'Невідомо'
  return d.toLocaleString()
}
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <h2 class="title">{{ t('admin.title') }}</h2>

      <!-- Глобальна статистика гри -->
      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_users') }}</span>
          <span class="stat-value">{{ stats.totalUsers }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.banned_users') }}</span>
          <span class="stat-value text-danger">{{ stats.bannedUsers }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_money') }}</span>
          <span class="stat-value text-gold">{{ stats.totalMoney }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_strawberries') }}</span>
          <span class="stat-value text-success">{{ stats.totalStrawberries }}</span>
        </div>
      </div>

      <!-- Глобальна телеметрія кліків -->
      <Card v-if="telemetry" width="100%" height="auto" :padding="10" class="telemetry-card">
        <div class="telemetry-box">
          <div class="telemetry-header-row">
            <span class="telemetry-header">{{ t('admin.telemetry_title') }}</span>
            <div class="date-picker-wrapper">
              <label class="date-label">{{ t('admin.telemetry_date') }}</label>
              <input type="date" v-model="selectedDate" class="pixel-input-date" />
            </div>
          </div>
          <div class="telemetry-grid">
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.total_clicks_all_time') }}</span>
              <span class="telemetry-value text-success">{{ telemetry.totalClicksAllTime }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.clicks_today') }}</span>
              <span class="telemetry-value text-gold">{{ telemetry.totalClicksToday }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.avg_per_user') }}</span>
              <span class="telemetry-value">{{ telemetry.avgClicksPerClicker }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.avg_per_batch') }}</span>
              <span class="telemetry-value">{{ telemetry.avgClicksPerBatch }}</span>
            </div>
          </div>
        </div>
      </Card>

      <!-- Пошук користувачів -->
      <div class="search-box">
        <input
            v-model="search"
            type="text"
            class="pixel-input"
            :placeholder="t('admin.user_search_placeholder')"
            @keyup.enter="handleSearch"
        />
        <ButtonText padding="0 14px" @click="handleSearch">
          <Icon icon="pixelarticons:search" />
        </ButtonText>
      </div>

      <div class="sort-bar">
        <span class="sort-label">{{ t('admin.sort_by') }}</span>
        <select v-model="sortBy" class="pixel-select">
          <option value="id_desc">{{ t('admin.sort_id_desc') }}</option>
          <option value="id_asc">{{ t('admin.sort_id_asc') }}</option>
          <option value="money_desc">{{ t('admin.sort_money') }}</option>
          <option value="strawberries_desc">{{ t('admin.sort_strawberries') }}</option>
          <option value="online_desc">{{ t('admin.sort_online') }}</option>
          <option value="name_asc">{{ t('admin.sort_name') }}</option>
        </select>
      </div>

      <!-- Список користувачів -->
      <div v-if="isLoadingUsers" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <Card v-else-if="sortedUsers.length" width="100%" height="auto" :padding="6" class="users-card">
        <ul class="user-list">
          <li v-for="u in sortedUsers" :key="u.userId" class="user-row">
            <div class="user-main">
              <img
                  :src="u.photoUrl ?? '/default-avatar.png'"
                  alt="Avatar"
                  class="user-avatar"
              />
              <div class="user-info">
                <div class="user-name-line">
                  <span class="user-name">
                    {{ u.firstName || u.lastName ? (u.firstName ?? '') + ' ' + (u.lastName ?? '') : t('profile.no_name') }}
                  </span>
                  <PremiumBadge v-if="u.premium" />
                  <span v-if="u.admin" class="tag tag-admin">ADMIN</span>
                  <span v-if="u.banned" class="tag tag-banned">BANNED</span>
                </div>
                <div class="user-online-line">
                  <span class="online-indicator" :class="{ 'is-online': formatLastOnline(u.lastOnlineAt).isOnline }">
                    ● {{ formatLastOnline(u.lastOnlineAt).text }}
                  </span>
                </div>
                <div class="user-meta">
                  <span>ID: {{ u.telegramId || u.userId }}</span>
                  <span class="meta-res">
                    <img src="/ui/money.png" alt="Money" class="res-icon-inline" />
                    {{ getUserMoney(u) }}
                  </span>
                  <span class="meta-res">
                    <img src="/ui/strawberry.png" alt="Strawberry" class="res-icon-inline" />
                    {{ getUserStrawberries(u) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Дії для кожного користувача -->
            <div class="user-actions">
              <ButtonText
                  padding="0 10px"
                  :loading="actionLoadingMap[`ban_${u.userId}`]"
                  @click="toggleBan(u)"
              >
                {{ u.banned ? t('admin.unban') : t('admin.ban') }}
              </ButtonText>

              <ButtonText
                  padding="0 10px"
                  :loading="actionLoadingMap[`limit_${u.userId}`]"
                  @click="resetLimit(u)"
              >
                {{ t('admin.reset_limit') }}
              </ButtonText>

              <ButtonText
                  padding="0 10px"
                  @click="openEditModal(u)"
              >
                {{ t('admin.edit_resources') }}
              </ButtonText>

              <ButtonText
                  padding="0 10px"
                  @click="openUserTelemetry(u)"
              >
                {{ t('admin.telemetry_btn') }}
              </ButtonText>

              <ButtonText
                  padding="0 10px"
                  :loading="actionLoadingMap[`admin_${u.userId}`]"
                  @click="toggleAdmin(u)"
              >
                {{ t('admin.toggle_admin') }}
              </ButtonText>

              <ButtonText
                  padding="0 10px"
                  :loading="actionLoadingMap[`premium_${u.userId}`]"
                  @click="togglePremium(u)"
              >
                PRO
              </ButtonText>
            </div>
          </li>
        </ul>
      </Card>

      <div v-else class="empty-state">
        <span>{{ t('players.empty') }}</span>
      </div>
    </CardPrimary>

    <!-- Модальне вікно редагування ресурсів -->
    <PixelModal
        v-model="isModalOpen"
        :title="t('admin.resources_modal_title')"
        width="340px"
        @close="isModalOpen = false"
    >
      <div class="modal-body">
        <div class="mode-switch-row">
          <span class="switch-label">{{ isAddMode ? t('admin.add_amount') : t('admin.set_exact') }}</span>
          <Switch v-model="isAddMode" />
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.money_count') }}</label>
          <input v-model.number="editMoney" type="number" class="pixel-input" />
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.strawberries_count') }}</label>
          <input v-model.number="editStrawberries" type="number" class="pixel-input" />
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.level') }}</label>
          <input v-model.number="editLevel" type="number" class="pixel-input" />
        </div>

        <div class="modal-actions">
          <ButtonText
              padding="0 20px"
              :loading="isSavingResources"
              @click="saveResources"
          >
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Модальне вікно телеметрії користувача -->
    <PixelModal
        v-model="isUserTelemetryModalOpen"
        :title="t('admin.user_telemetry_modal')"
        width="340px"
        @close="isUserTelemetryModalOpen = false"
    >
      <div v-if="isLoadingUserTelemetry" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>
      <div v-else-if="selectedUserTelemetry" class="telemetry-modal-body">
        <div class="user-telemetry-title">{{ selectedUserTelemetry.userName }}</div>

        <div class="date-picker-wrapper" style="margin-bottom: 8px;">
          <label class="date-label">{{ t('admin.telemetry_date') }}</label>
          <input type="date" v-model="selectedUserTelemetryDate" class="pixel-input-date" />
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.total_clicks_all_time') }}:</span>
          <strong class="text-success">{{ selectedUserTelemetry.totalClicks }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.clicks_today') }}:</span>
          <strong class="text-gold">{{ selectedUserTelemetry.clicksToday }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.avg_per_batch') }}:</span>
          <strong>{{ selectedUserTelemetry.avgClicksPerBatch }} (Всього флашів: {{ selectedUserTelemetry.totalBatches }})</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.last_click_time') }}</span>
          <strong>{{ formatDateTime(selectedUserTelemetry.lastClickTime) }}</strong>
        </div>
      </div>
    </PixelModal>
  </div>
</template>

<style scoped>
.admin-container {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  color: #3f2e21;
}

.title {
  margin: 0 0 12px;
  text-align: center;
  font-size: 22px;
  font-weight: normal;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.stat-card {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 3px 0 #3e2723;
}

.stat-label {
  font-size: 14px;
  color: #5d4037;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #3f2e21;
}

.telemetry-card {
  width: 100%;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.telemetry-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.telemetry-header {
  font-size: 16px;
  font-weight: bold;
  color: #3f2e21;
}

.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.telemetry-item {
  display: flex;
  flex-direction: column;
}

.telemetry-label {
  font-size: 13px;
  color: #5d4037;
}

.telemetry-value {
  font-size: 16px;
  font-weight: bold;
}

.text-danger { color: #c62828; }
.text-gold { color: #d97706; }
.text-success { color: #2e7d32; }

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sort-label {
  font-size: 15px;
  color: #5d4037;
}

.pixel-select {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: 'Crumbline', sans-serif;
  font-size: 15px;
  color: #3f2e21;
  outline: none;
  cursor: pointer;
}

.pixel-input {
  flex: 1;
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'Crumbline', sans-serif;
  font-size: 16px;
  color: #3f2e21;
  outline: none;
  box-sizing: border-box;
}

.pixel-input:focus {
  border-color: #2e7d32;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 16px;
  font-size: 16px;
}

.users-card {
  width: 100%;
}

.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.user-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 6px;
}

.user-row + .user-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.user-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #5d4037;
  object-fit: cover;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-name {
  font-size: 18px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-online-line {
  font-size: 13px;
  margin: 1px 0;
}

.online-indicator {
  color: #7c624d;
}

.online-indicator.is-online {
  color: #2e7d32;
  font-weight: bold;
}

.tag {
  font-family: var(--font-pixel);
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  font-weight: bold;
}

.tag-premium { background-color: #2e7d32; }
.tag-admin { background-color: #d97706; }
.tag-banned { background-color: #c62828; }

.user-meta {
  font-size: 14px;
  color: #5d4037;
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-res {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.res-icon-inline {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  object-fit: contain;
}

.user-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Modal styles */
.modal-body, .telemetry-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
  font-family: 'Crumbline', sans-serif;
}

.user-telemetry-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #3f2e21;
}

.telemetry-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}

.mode-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}

.input-field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-field-row label {
  font-size: 16px;
  color: #5d4037;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
