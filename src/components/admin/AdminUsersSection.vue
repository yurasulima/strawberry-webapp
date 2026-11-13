<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import type { User } from '@/types/User.ts'
import { CardPrimary, Card, ButtonText, PixelModal, Switch, ItemIcon } from '@/components/pixel'
import { playClickSound } from '@/services/sound'
import { useToastStore } from '@/stores/toast.ts'
import FlatCard from '@/components/pixel/FlatCard.vue'

const { t } = useI18n()
const toastStore = useToastStore()

interface ItemYield {
  itemName: string
  totalAmount: number
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
  coinsStolenByPlayer?: number
  coinsTransferredByPlayer?: number
  coinsStolenFromPlayer?: number
  totalStealAttemptsByPlayer?: number
  failedStealAttemptsByPlayer?: number
  totalCoinsEarnedByUser?: number
  totalBusinessItemsYieldedByUser?: number
  totalStrawberriesFromDropsByUser?: number
  totalStrawberriesFromDailyRewardsByUser?: number
  totalStrawberriesFromTransfersByUser?: number
  totalCatPetsByUser?: number
  businessYieldBreakdownByUser?: ItemYield[]
  dropBreakdownByUser?: ItemYield[]
}

const users = ref<User[]>([])
const search = ref('')
const isLoadingUsers = ref(true)

type SortOption = 'online_desc' | 'id_desc' | 'id_asc' | 'money_desc' | 'strawberries_desc' | 'name_asc'
const sortBy = ref<SortOption>('online_desc')
const filterRole = ref<'all' | 'online' | 'admin' | 'premium' | 'banned'>('all')

const activeMenuUserId = ref<number | null>(null)

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase().trim()
  const list = users.value.filter(u => {
    if (q) {
      const name = `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.username ?? ''} ${u.telegramId ?? ''} ${u.userId ?? ''}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    switch (filterRole.value) {
      case 'online': return formatLastOnline(u.lastOnlineAt).isOnline
      case 'admin': return !!u.admin
      case 'premium': return !!u.premium
      case 'banned': return !!u.banned
      default: return true
    }
  })

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

// Modal states
const isModalOpen = ref(false)
const selectedUser = ref<User | null>(null)
const editMoney = ref<number | null>(null)
const editStrawberries = ref<number | null>(null)
const editLevel = ref<number | null>(null)
const isAddMode = ref(false)
const isSavingResources = ref(false)

// Telemetry Modal state
const isUserTelemetryModalOpen = ref(false)
const selectedUserTelemetry = ref<UserTelemetry | null>(null)
const isLoadingUserTelemetry = ref(false)
const selectedUserTelemetryDate = ref<string>(new Date().toISOString().split('T')[0])

const actionLoadingMap = ref<Record<string, boolean>>({})
const isRecalculating = ref(false)

onMounted(async () => {
  await fetchUsers()
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

function toggleUserMenu(userId: number) {
  playClickSound()
  if (activeMenuUserId.value === userId) {
    activeMenuUserId.value = null
  } else {
    activeMenuUserId.value = userId
  }
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
  } catch (err: any) {
    toastStore.showToast(err.response?.data || t('business.operation_error'), 'error')
  } finally {
    isSavingResources.value = false
  }
}

async function recalculateLevels() {
  playClickSound()
  isRecalculating.value = true
  try {
    const res = await api.post<{ message: string; count: number }>('/admin/recalculate-levels')
    toastStore.showToast(res.data?.message || 'Рівні успішно перераховано!', 'success')
    await fetchUsers()
  } catch (err: any) {
    toastStore.showToast(err.response?.data?.message || err.response?.data || t('business.operation_error'), 'error')
  } finally {
    isRecalculating.value = false
  }
}

function getUserMoney(u: User): number {
  return u.slots?.find(s => s.item?.name === 'money')?.count ?? 0
}

function getUserStrawberries(u: User): number {
  return u.slots?.find(s => s.item?.name === 'strawberry')?.count ?? 0
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('uk-UA')
}

function formatLastOnline(lastOnlineAt?: string | null): { text: string; isOnline: boolean } {
  if (!lastOnlineAt) return { text: 'Ніколи', isOnline: false }
  const onlineDate = new Date(lastOnlineAt)
  if (isNaN(onlineDate.getTime())) return { text: 'Невідомо', isOnline: false }
  const diffSec = Math.floor((Date.now() - onlineDate.getTime()) / 1000)

  if (diffSec < 120) return { text: 'Онлайн', isOnline: true }
  if (diffSec < 3600) return { text: `${Math.floor(diffSec / 60)} хв тому`, isOnline: false }
  if (diffSec < 86400) return { text: `${Math.floor(diffSec / 3600)} год тому`, isOnline: false }
  return { text: `${Math.floor(diffSec / 86400)} дн тому`, isOnline: false }
}

function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return 'Ніколи'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return 'Невідомо'
  return d.toLocaleString('uk-UA')
}
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <!-- Section Header -->
      <div class="section-header">
        <div class="title-group">
          <h2 class="title">{{ t('admin.nav.users') }}</h2>
          <span class="count-badge">{{ users.length }}</span>
        </div>
        <div class="header-actions">
          <ButtonText :loading="isRecalculating" @click="recalculateLevels">
            Перерахувати рівні
          </ButtonText>
        </div>
      </div>

      <!-- Toolbar (Search, Filter, Sort) -->
      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon-text">Q</span>
          <input
            v-model="search"
            type="text"
            class="pixel-input search-input"
            placeholder="Пошук ім'я, @username чи Telegram ID..."
            @keyup.enter="handleSearch"
          />
          <button v-if="search" class="clear-btn" @click="search = ''; handleSearch()">×</button>
        </div>

        <div class="filter-group">
          <div class="select-wrapper">
            <span class="select-label">Фільтр:</span>
            <select v-model="filterRole" class="pixel-select">
              <option value="all">Усі ({{ users.length }})</option>
              <option value="online">Онлайн</option>
              <option value="admin">Адміни</option>
              <option value="premium">Premium</option>
              <option value="banned">Забанені</option>
            </select>
          </div>

          <div class="select-wrapper">
            <span class="select-label">Сортування:</span>
            <select v-model="sortBy" class="pixel-select">
              <option value="online_desc">За онлайном</option>
              <option value="id_desc">ID (спочатку нові)</option>
              <option value="id_asc">ID (спочатку старі)</option>
              <option value="money_desc">За монетами</option>
              <option value="strawberries_desc">За полуницями</option>
              <option value="name_asc">За іменем</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Список користувачів -->
      <div v-if="isLoadingUsers" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <Card v-else-if="filteredUsers.length" width="100%" height="auto" :padding="6" class="users-card">
        <ul class="user-list">
          <li
            v-for="u in filteredUsers"
            :key="u.userId"
            class="user-row"
            :class="{ 'is-banned': u.banned }"
          >
            <!-- User Left Info -->
            <div class="user-row__main">
              <div class="user-avatar-box">
                <img :src="u.photoUrl ?? '/default-avatar.png'" alt="Avatar" class="user-avatar" />
                <span
                  class="online-dot"
                  :class="{ 'is-online': formatLastOnline(u.lastOnlineAt).isOnline }"
                  :title="formatLastOnline(u.lastOnlineAt).text"
                />
              </div>

              <div class="user-info-box">
                <div class="user-name-line">
                  <strong class="user-name">
                    {{ u.firstName || u.lastName ? (u.firstName ?? '') + ' ' + (u.lastName ?? '') : t('profile.no_name') }}
                  </strong>
                  <span v-if="u.username" class="user-username">@{{ u.username }}</span>
                </div>

                <div class="user-badges-line">
                  <span class="badge badge-id">id: {{ u.telegramId || u.userId }}</span>
                  <span v-if="(u as any).level" class="badge badge-lvl">Lvl {{ (u as any).level }}</span>
                  <span v-if="u.premium" class="badge badge-premium">Premium</span>
                  <span v-if="u.admin" class="badge badge-admin">ADMIN</span>
                  <span v-if="u.banned" class="badge badge-banned">BANNED</span>
                </div>
              </div>
            </div>

            <!-- User Stats Column -->
            <div class="user-row__stats">
              <div class="res-item">
                <ItemIcon item="money" size="18" />
                <strong class="text-gold">{{ formatNumber(getUserMoney(u)) }}</strong>
              </div>
              <div class="res-item">
                <ItemIcon item="strawberry" size="18" />
                <strong class="text-success">{{ formatNumber(getUserStrawberries(u)) }}</strong>
              </div>
              <div class="online-item">
                <span class="online-text" :class="{ 'text-online': formatLastOnline(u.lastOnlineAt).isOnline }">
                  {{ formatLastOnline(u.lastOnlineAt).text }}
                </span>
              </div>
            </div>

            <!-- User Action Buttons -->
            <div class="user-row__actions">
              <ButtonText padding="4px 10px" @click="openEditModal(u)">Ресурси</ButtonText>
              <ButtonText padding="4px 10px" @click="openUserTelemetry(u)">Телеметрія</ButtonText>
              <ButtonText
                padding="4px 10px"
                :class="{ active: activeMenuUserId === u.userId }"
                @click="toggleUserMenu(u.userId)"
              >
                Модерація {{ activeMenuUserId === u.userId ? '▲' : '▼' }}
              </ButtonText>
            </div>

            <!-- Expandable Moderation Drawer -->
            <div v-if="activeMenuUserId === u.userId" class="user-row__drawer">
              <ButtonText
                padding="4px 10px"
                :loading="actionLoadingMap[`ban_${u.userId}`]"
                @click="toggleBan(u)"
              >
                {{ u.banned ? 'Розбанити' : 'Забанити' }}
              </ButtonText>

              <ButtonText
                padding="4px 10px"
                :loading="actionLoadingMap[`limit_${u.userId}`]"
                @click="resetLimit(u)"
              >
                Скинути ліміт
              </ButtonText>

              <ButtonText
                padding="4px 10px"
                :loading="actionLoadingMap[`admin_${u.userId}`]"
                @click="toggleAdmin(u)"
              >
                {{ u.admin ? 'Забрати адміна' : 'Зробити адміном' }}
              </ButtonText>

              <ButtonText
                padding="4px 10px"
                :loading="actionLoadingMap[`premium_${u.userId}`]"
                @click="togglePremium(u)"
              >
                {{ u.premium ? 'Забрати Premium' : 'Дати Premium' }}
              </ButtonText>
            </div>
          </li>
        </ul>
      </Card>

      <div v-else class="empty-state">
        <span>{{ t('players.empty') }}</span>
      </div>
    </CardPrimary>

    <!-- Modal Edit Resources -->
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
          <ButtonText :loading="isSavingResources" @click="saveResources">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Modal User Telemetry -->
    <PixelModal
      v-model="isUserTelemetryModalOpen"
      :title="t('admin.user_telemetry_modal')"
      width="360px"
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
          <strong class="text-success">{{ formatNumber(selectedUserTelemetry.totalClicks) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.clicks_today') }}:</span>
          <strong class="text-gold">{{ formatNumber(selectedUserTelemetry.clicksToday) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.avg_per_batch') }}:</span>
          <strong>{{ selectedUserTelemetry.avgClicksPerBatch }} ({{ t('admin.total_batches') }}: {{ formatNumber(selectedUserTelemetry.totalBatches) }})</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.last_click_time') }}</span>
          <strong>{{ formatDateTime(selectedUserTelemetry.lastClickTime) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Украдено монет:</span>
          <strong class="text-gold">{{ formatNumber(selectedUserTelemetry.coinsStolenByPlayer ?? 0) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Передано монет:</span>
          <strong class="text-success">{{ formatNumber(selectedUserTelemetry.coinsTransferredByPlayer ?? 0) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>В нього украли:</span>
          <strong class="text-danger">{{ formatNumber(selectedUserTelemetry.coinsStolenFromPlayer ?? 0) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Спроб крадіжок:</span>
          <strong>{{ formatNumber(selectedUserTelemetry.totalStealAttemptsByPlayer ?? 0) }} (невдалих: {{ formatNumber(selectedUserTelemetry.failedStealAttemptsByPlayer ?? 0) }})</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Зароблено монет:</span>
          <strong class="text-gold">{{ formatNumber(selectedUserTelemetry.totalCoinsEarnedByUser ?? 0) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Зібрано предметів з бізнесів:</span>
          <strong class="text-success">{{ formatNumber(selectedUserTelemetry.totalBusinessItemsYieldedByUser ?? 0) }}</strong>
        </div>

        <!-- Деталізація предметів юзера -->
        <div v-if="selectedUserTelemetry.businessYieldBreakdownByUser && selectedUserTelemetry.businessYieldBreakdownByUser.length" class="user-yield-box">
          <div v-for="b in selectedUserTelemetry.businessYieldBreakdownByUser" :key="b.itemName" class="user-yield-row">
            <ItemIcon :item="b.itemName" size="18" />
            <span class="breakdown-name">{{ b.itemName }}:</span>
            <strong class="breakdown-val">{{ formatNumber(b.totalAmount) }}</strong>
          </div>
        </div>

        <div class="telemetry-info-row">
          <span>Зібрано з коробок-дропів:</span>
          <strong class="text-gold">{{ formatNumber(selectedUserTelemetry.totalStrawberriesFromDropsByUser ?? 0) }}</strong>
        </div>

        <!-- Деталізація предметів з дропів юзера -->
        <div v-if="selectedUserTelemetry.dropBreakdownByUser && selectedUserTelemetry.dropBreakdownByUser.length" class="user-yield-box">
          <div v-for="d in selectedUserTelemetry.dropBreakdownByUser" :key="d.itemName" class="user-yield-row">
            <ItemIcon :item="d.itemName" size="18" />
            <span class="breakdown-name">{{ d.itemName }}:</span>
            <strong class="breakdown-val">{{ formatNumber(d.totalAmount) }}</strong>
          </div>
        </div>

        <div class="telemetry-info-row">
          <span>З Daily Rewards:</span>
          <strong class="text-gold">{{ formatNumber(selectedUserTelemetry.totalStrawberriesFromDailyRewardsByUser ?? 0) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Отримано з переказів:</span>
          <strong class="text-success">{{ formatNumber(selectedUserTelemetry.totalStrawberriesFromTransfersByUser ?? 0) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>Погладжувань котика:</span>
          <strong class="text-gold">{{ formatNumber(selectedUserTelemetry.totalCatPetsByUser ?? 0) }}</strong>
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
  font-family: var(--font-pixel);
  color: #3f2e21;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: normal;
}

.count-badge {
  background: rgba(63, 46, 33, 0.12);
  border: 1px solid #5d4037;
  padding: 2px 8px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  background: rgba(63, 46, 33, 0.05);
  padding: 8px 10px;
  border: 2px solid rgba(63, 46, 33, 0.15);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 240px;
}

.search-icon-text {
  position: absolute;
  left: 10px;
  font-size: 13px;
  font-weight: bold;
  color: #7c624d;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 28px;
  padding-right: 28px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #7c624d;
  font-size: 16px;
  font-weight: bold;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.select-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.select-label {
  font-size: 13px;
  color: #5d4037;
  white-space: nowrap;
}

/* User List (Full Width Table Style) */
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  flex-wrap: wrap;
}

.user-row + .user-row {
  border-top: 1px solid rgba(63, 46, 33, 0.15);
}

.user-row.is-banned {
  background: rgba(198, 40, 40, 0.04);
}

.user-row__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 260px;
  min-width: 0;
}

.user-avatar-box {
  position: relative;
  flex-shrink: 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #5d4037;
  object-fit: cover;
  display: block;
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9e9e9e;
  border: 2px solid #fff8eb;
}

.online-dot.is-online {
  background: #2e7d32;
}

.user-info-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.user-name {
  font-size: 15px;
  color: #3f2e21;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-username {
  font-size: 12px;
  color: #7c624d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-badges-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.badge {
  padding: 1px 5px;
  font-size: 10px;
  font-weight: bold;
  border: 1px solid currentColor;
}

.badge-id { color: #7c624d; background: rgba(124, 98, 77, 0.1); }
.badge-lvl { color: #2e7d32; background: rgba(46, 125, 50, 0.1); }
.badge-premium { color: #d97706; background: rgba(217, 119, 6, 0.1); }
.badge-admin { color: #b45309; background: rgba(180, 83, 9, 0.1); }
.badge-banned { color: #c62828; background: rgba(198, 40, 40, 0.1); }

/* User Stats */
.user-row__stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.res-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.online-item {
  font-size: 12px;
  color: #7c624d;
}

.text-online {
  color: #2e7d32;
  font-weight: bold;
}

/* User Actions */
.user-row__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.user-row__drawer {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  margin-top: 4px;
  background: rgba(63, 46, 33, 0.08);
  border: 1px solid rgba(63, 46, 33, 0.2);
}

/* Modal Styles */
.modal-body, .telemetry-modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--font-pixel);
}

.mode-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.input-field-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.input-field-row label {
  font-size: 13px;
  color: #5d4037;
}

.pixel-input {
  width: 100%;
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 14px;
  color: #3f2e21;
  outline: none;
  box-sizing: border-box;
}

.pixel-input:focus {
  border-color: #2e7d32;
}

.pixel-select {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 14px;
  color: #3f2e21;
  outline: none;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.user-telemetry-title {
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  color: #3f2e21;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-label {
  font-size: 13px;
  color: #5d4037;
}

.pixel-input-date {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: var(--font-pixel);
  font-size: 13px;
  color: #3f2e21;
  outline: none;
  cursor: pointer;
}

.telemetry-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.user-yield-box {
  margin: -2px 0 4px 8px;
  padding: 4px 8px;
  background: rgba(63, 46, 33, 0.05);
  border-left: 3px solid #2e7d32;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-yield-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.breakdown-name {
  color: #5d4037;
  flex: 1;
}

.breakdown-val {
  color: #2e7d32;
}

.text-danger { color: #c62828; }
.text-gold { color: #d97706; }
.text-success { color: #2e7d32; }

.loading-state, .empty-state {
  text-align: center;
  padding: 24px;
  font-size: 15px;
}

@media (min-width: 1100px) {
  .modal-body, .telemetry-modal-body { zoom: 1.1; }
}
</style>
