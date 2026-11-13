<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, Card, ButtonText, PixelModal, ItemIcon } from '@/components/pixel'
import { playClickSound } from '@/services/sound'
import { useToastStore } from '@/stores/toast.ts'
import FlatCard from '@/components/pixel/FlatCard.vue'

const { t } = useI18n()
const toastStore = useToastStore()

interface ChatSummary {
  chatId: number
  chatTitle: string
  totalMessages: number
  totalCommands: number
  avgMessagesPerDay: number
  avgCommandsPerDay: number
  activeUsersCount: number
  firstActivity: string
  lastActivity: string
}

interface TelegramChatInfo {
  chatId: number
  title?: string
  username?: string
  chatLink?: string
  type?: string
  addedByUserId?: number
  rewardClaimed?: boolean
  addedAt?: string
}

interface ChatStatusCheckDto {
  chatId: number
  active: boolean
  status: string
  title: string
  memberCount: number
  message: string
}

interface ChatDailyStats {
  date: string
  messageCount: number
  commandCount: number
  activeUsersCount: number
}

interface UserCount {
  userId: number
  count: number
}

interface ChatDetail {
  chatId: number
  chatTitle: string
  totalMessages: number
  totalCommands: number
  avgMessagesPerDay: number
  avgCommandsPerDay: number
  activeUsersCount: number
  firstActivity: string
  lastActivity: string
  dailyStats: ChatDailyStats[]
  topUsers: UserCount[]
}

const chats = ref<ChatSummary[]>([])
const telegramChats = ref<Map<number, TelegramChatInfo>>(new Map())
const chatStatusMap = ref<Record<number, ChatStatusCheckDto>>({})
const isLoading = ref(true)

const search = ref('')
type SortOption = 'messages_desc' | 'commands_desc' | 'online_desc' | 'name_asc'
const sortBy = ref<SortOption>('messages_desc')
const filterRole = ref<'all' | 'rewarded' | 'active' | 'inactive'>('all')

const actionLoadingMap = ref<Record<string, boolean>>({})

// Modal state
const isDetailModalOpen = ref(false)
const selectedChatDetail = ref<ChatDetail | null>(null)
const isLoadingDetail = ref(false)

const filteredChats = computed(() => {
  const q = search.value.toLowerCase().trim()
  const list = chats.value.filter(c => {
    if (q) {
      const name = `${c.chatTitle} ${c.chatId}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    const tg = telegramChats.value.get(c.chatId)
    const checkStatus = chatStatusMap.value[c.chatId]
    switch (filterRole.value) {
      case 'rewarded': return tg?.rewardClaimed === true
      case 'active': return checkStatus ? checkStatus.active : true
      case 'inactive': return checkStatus ? !checkStatus.active : false
      default: return true
    }
  })

  return list.sort((a, b) => {
    if (sortBy.value === 'messages_desc') return b.totalMessages - a.totalMessages
    if (sortBy.value === 'commands_desc') return b.totalCommands - a.totalCommands
    if (sortBy.value === 'name_asc') return a.chatTitle.localeCompare(b.chatTitle)
    if (sortBy.value === 'online_desc') {
      const timeA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
      const timeB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
      return timeB - timeA
    }
    return 0
  })
})

async function loadChats() {
  isLoading.value = true
  try {
    const [resSummary, resTg] = await Promise.allSettled([
      api.get<ChatSummary[]>('/admin/chats'),
      api.get<TelegramChatInfo[]>('/admin/telegram-chats')
    ])
    if (resSummary.status === 'fulfilled') {
      chats.value = resSummary.value.data
    }
    if (resTg.status === 'fulfilled') {
      const map = new Map<number, TelegramChatInfo>()
      resTg.value.data.forEach(tc => map.set(tc.chatId, tc))
      telegramChats.value = map
    }
  } catch (err) {
    console.error('Error fetching chats:', err)
  } finally {
    isLoading.value = false
  }
}

async function checkChatStatus(c: ChatSummary) {
  playClickSound()
  actionLoadingMap.value[`check_${c.chatId}`] = true
  try {
    const res = await api.post<ChatStatusCheckDto>(`/admin/chats/${c.chatId}/check-status`)
    chatStatusMap.value[c.chatId] = res.data
    if (res.data.active) {
      toastStore.showToast(res.data.message, 'success')
    } else {
      toastStore.showToast(res.data.message, 'warning')
    }
  } catch (err: any) {
    toastStore.showToast(err.response?.data?.message || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`check_${c.chatId}`] = false
  }
}

async function dropBoxAt(c: ChatSummary) {
  playClickSound()
  actionLoadingMap.value[`dropbox_${c.chatId}`] = true
  try {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/chats/${c.chatId}/drop-box`)
    toastStore.showToast(res.data.message || 'Таємничу коробку успішно відправлено у чат!', 'success')
  } catch (err: any) {
    toastStore.showToast(err.response?.data?.message || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`dropbox_${c.chatId}`] = false
  }
}

async function dropCatBoxAt(c: ChatSummary) {
  playClickSound()
  actionLoadingMap.value[`dropcat_${c.chatId}`] = true
  try {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/chats/${c.chatId}/drop-cat`)
    toastStore.showToast(res.data.message || 'Коробку з котиком успішно відправлено у чат!', 'success')
  } catch (err: any) {
    toastStore.showToast(err.response?.data?.message || t('business.operation_error'), 'error')
  } finally {
    actionLoadingMap.value[`dropcat_${c.chatId}`] = false
  }
}

async function openChatDetail(c: ChatSummary) {
  playClickSound()
  isDetailModalOpen.value = true
  isLoadingDetail.value = true
  try {
    const res = await api.get<ChatDetail>(`/admin/chats/${c.chatId}`)
    selectedChatDetail.value = res.data
  } catch (err) {
    console.error('Error fetching chat detail:', err)
  } finally {
    isLoadingDetail.value = false
  }
}

function getChatLink(chatId: number): string | null {
  const tg = telegramChats.value.get(chatId)
  if (tg && tg.chatLink) return tg.chatLink
  return null
}

function isRewardClaimed(chatId: number): boolean {
  const tg = telegramChats.value.get(chatId)
  return tg?.rewardClaimed === true
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('uk-UA')
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString('uk-UA')
}

onMounted(loadChats)
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <!-- Section Header -->
      <div class="section-header">
        <div class="title-group">
          <h2 class="title">{{ t('admin.chats_title') }}</h2>
          <span class="count-badge">{{ chats.length }}</span>
        </div>
        <div class="header-actions">
          <ButtonText :loading="isLoading" @click="loadChats">
            {{ t('players.refresh') }}
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
            placeholder="Пошук назви чату чи Telegram ID..."
          />
          <button v-if="search" class="clear-btn" @click="search = ''">×</button>
        </div>

        <div class="filter-group">
          <div class="select-wrapper">
            <span class="select-label">Фільтр:</span>
            <select v-model="filterRole" class="pixel-select">
              <option value="all">Усі ({{ chats.length }})</option>
              <option value="rewarded">Виплата 5000 монет</option>
              <option value="active">Активні у ТГ</option>
              <option value="inactive">Бота вилучено</option>
            </select>
          </div>

          <div class="select-wrapper">
            <span class="select-label">Сортування:</span>
            <select v-model="sortBy" class="pixel-select">
              <option value="messages_desc">За повідомленнями</option>
              <option value="commands_desc">За командами</option>
              <option value="online_desc">За активністю</option>
              <option value="name_asc">За назвою</option>
            </select>
          </div>
        </div>
      </div>

      <!-- State Views -->
      <div v-if="isLoading" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <Card v-else-if="filteredChats.length" width="100%" height="auto" :padding="6" class="chats-card">
        <ul class="chat-list">
          <li v-for="c in filteredChats" :key="c.chatId" class="chat-row">
            <!-- Left Info Column -->
            <div class="chat-row__main">
              <div class="chat-info-box">
                <div class="chat-title-line">
                  <strong class="chat-title">{{ c.chatTitle }}</strong>
                  <a
                    v-if="getChatLink(c.chatId)"
                    :href="getChatLink(c.chatId)!"
                    target="_blank"
                    class="link-button"
                  >
                    Перейти
                  </a>
                </div>

                <div class="chat-badges-line">
                  <span class="badge badge-id">ID: {{ c.chatId }}</span>
                  <span v-if="isRewardClaimed(c.chatId)" class="badge badge-reward">
                    5 000 <ItemIcon item="money" size="12" style="vertical-align: middle;" />
                  </span>

                  <!-- TG Status Badge if checked -->
                  <span
                    v-if="chatStatusMap[c.chatId]"
                    class="badge"
                    :class="chatStatusMap[c.chatId].active ? 'badge-active' : 'badge-inactive'"
                  >
                    {{ chatStatusMap[c.chatId].active ? 'Активний (ТГ)' : 'Бота вилучено' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Stats Column -->
            <div class="chat-row__stats">
              <div class="stat-item">
                <span class="stat-lbl">Повідомлень:</span>
                <strong class="text-success">{{ formatNumber(c.totalMessages) }}</strong>
              </div>
              <div class="stat-item">
                <span class="stat-lbl">Команд:</span>
                <strong class="text-gold">{{ formatNumber(c.totalCommands) }}</strong>
              </div>
              <div class="stat-item">
                <span class="stat-lbl">Учасників:</span>
                <strong>{{ formatNumber(c.activeUsersCount) }}</strong>
              </div>
              <div class="stat-item">
                <span class="stat-lbl">Остання активність:</span>
                <span class="date-text">{{ formatDate(c.lastActivity) }}</span>
              </div>
            </div>

            <!-- Actions Buttons -->
            <div class="chat-row__actions">
              <ButtonText padding="4px 8px" @click="openChatDetail(c)">Деталі</ButtonText>
              <ButtonText
                padding="4px 8px"
                :loading="actionLoadingMap[`check_${c.chatId}`]"
                @click="checkChatStatus(c)"
              >
                Перевірити ТГ
              </ButtonText>
              <ButtonText
                padding="4px 8px"
                :loading="actionLoadingMap[`dropbox_${c.chatId}`]"
                @click="dropBoxAt(c)"
              >
                Дроп Коробки
              </ButtonText>
              <ButtonText
                padding="4px 8px"
                :loading="actionLoadingMap[`dropcat_${c.chatId}`]"
                @click="dropCatBoxAt(c)"
              >
                Дроп Котика
              </ButtonText>
            </div>
          </li>
        </ul>
      </Card>

      <div v-else class="empty-state">
        <span>{{ t('admin.no_data') }}</span>
      </div>
    </CardPrimary>

    <!-- Modal for Detailed Chat Stats -->
    <PixelModal
      v-model="isDetailModalOpen"
      :title="t('admin.chat_detail_modal')"
      width="380px"
      @close="isDetailModalOpen = false"
    >
      <div v-if="isLoadingDetail" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <div v-else-if="selectedChatDetail" class="telemetry-modal-body">
        <div class="user-telemetry-title">{{ selectedChatDetail.chatTitle }}</div>

        <div v-if="getChatLink(selectedChatDetail.chatId)" class="telemetry-info-row">
          <span>Посилання:</span>
          <a :href="getChatLink(selectedChatDetail.chatId)!" target="_blank" class="chat-url-link">
            {{ getChatLink(selectedChatDetail.chatId) }}
          </a>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.total_messages') }}:</span>
          <strong class="text-success">{{ formatNumber(selectedChatDetail.totalMessages) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.total_commands') }}:</span>
          <strong class="text-gold">{{ formatNumber(selectedChatDetail.totalCommands) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.avg_messages_per_day') }}:</span>
          <strong>{{ selectedChatDetail.avgMessagesPerDay }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.avg_commands_per_day') }}:</span>
          <strong>{{ selectedChatDetail.avgCommandsPerDay }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.active_users') }}:</span>
          <strong>{{ formatNumber(selectedChatDetail.activeUsersCount) }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.last_activity') }}:</span>
          <strong>{{ formatDate(selectedChatDetail.lastActivity) }}</strong>
        </div>

        <!-- Daily Breakdown Table -->
        <h4 style="margin: 12px 0 4px; font-size: 14px;">{{ t('admin.daily_stats') }}</h4>
        <div style="max-height: 200px; overflow-y: auto;">
          <table class="daily-table">
            <thead>
              <tr>
                <th>{{ t('admin.date') }}</th>
                <th>Повідомлення</th>
                <th>Команди</th>
                <th>Учасники</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in selectedChatDetail.dailyStats" :key="d.date">
                <td>{{ d.date }}</td>
                <td class="text-success">{{ formatNumber(d.messageCount) }}</td>
                <td class="text-gold">{{ formatNumber(d.commandCount) }}</td>
                <td>{{ formatNumber(d.activeUsersCount) }}</td>
              </tr>
            </tbody>
          </table>
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

/* Chats Table (Full Width List) */
.chats-card {
  width: 100%;
}

.chat-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  flex-wrap: wrap;
}

.chat-row + .chat-row {
  border-top: 1px solid rgba(63, 46, 33, 0.15);
}

.chat-row__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 240px;
  min-width: 0;
}

.chat-info-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.chat-title-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.chat-title {
  font-size: 16px;
  color: #3f2e21;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-badges-line {
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
.badge-reward { color: #d97706; background: rgba(217, 119, 6, 0.1); }
.badge-active { color: #2e7d32; background: rgba(46, 125, 50, 0.1); }
.badge-inactive { color: #c62828; background: rgba(198, 40, 40, 0.1); }

.link-button {
  font-size: 11px;
  background: #2e7d32;
  color: #fff;
  padding: 1px 6px;
  border-radius: 3px;
  text-decoration: none;
  font-weight: bold;
  flex-shrink: 0;
}

.link-button:hover {
  background: #388e3c;
}

/* Chat Stats */
.chat-row__stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-lbl {
  color: #7c624d;
}

.date-text {
  color: #5d4037;
}

.text-danger { color: #c62828; }
.text-gold { color: #d97706; }
.text-success { color: #2e7d32; }

/* Chat Actions */
.chat-row__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

/* Modal Styles */
.telemetry-modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--font-pixel);
}

.user-telemetry-title {
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  color: #3f2e21;
}

.telemetry-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.chat-url-link {
  color: #1565c0;
  text-decoration: underline;
  word-break: break-all;
  font-size: 12px;
}

.daily-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 4px;
}

.daily-table th, .daily-table td {
  border: 1px solid #5d4037;
  padding: 4px 6px;
  text-align: center;
}

.daily-table th {
  background: #f0e2cd;
  font-weight: bold;
  color: #3f2e21;
}

.daily-table tr:nth-child(even) {
  background: #fff8eb;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 24px;
  font-size: 15px;
}

@media (min-width: 1100px) {
  .telemetry-modal-body { zoom: 1.1; }
}
</style>
