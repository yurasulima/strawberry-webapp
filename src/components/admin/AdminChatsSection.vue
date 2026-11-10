<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, Card, ButtonText, PixelModal } from '@/components/pixel'
import { playClickSound } from '@/services/sound'

const { t } = useI18n()

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
const isLoading = ref(true)

// Modal state
const isDetailModalOpen = ref(false)
const selectedChatDetail = ref<ChatDetail | null>(null)
const isLoadingDetail = ref(false)

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

function formatDate(isoStr?: string): string {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString()
}

onMounted(loadChats)
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <div class="section-header">
        <h2 class="title">{{ t('admin.chats_title') }}</h2>
        <ButtonText :loading="isLoading" @click="loadChats">
          {{ t('players.refresh') }}
        </ButtonText>
      </div>

      <div v-if="isLoading" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <div v-else-if="chats.length === 0" class="empty-state">
        {{ t('admin.no_data') }}
      </div>

      <Card v-else width="100%" height="auto" :padding="6" class="list-card">
        <ul class="entity-list">
          <li v-for="c in chats" :key="c.chatId" class="chat-row" @click="openChatDetail(c)">
            <div class="chat-header-line">
              <span class="chat-title">{{ c.chatTitle }}</span>
              <div class="chat-badges">
                <span v-if="isRewardClaimed(c.chatId)" class="reward-badge">5000 монет</span>
                <a
                  v-if="getChatLink(c.chatId)"
                  :href="getChatLink(c.chatId)!"
                  target="_blank"
                  class="link-button"
                  @click.stop
                >
                  Перейти до чату
                </a>
                <span class="chat-id-badge">ID: {{ c.chatId }}</span>
              </div>
            </div>

            <div class="chat-stats-grid">
              <div class="chat-stat-item">
                <span class="chat-stat-label">{{ t('admin.total_messages') }}:</span>
                <span class="chat-stat-val text-success">{{ c.totalMessages }}</span>
              </div>
              <div class="chat-stat-item">
                <span class="chat-stat-label">{{ t('admin.total_commands') }}:</span>
                <span class="chat-stat-val text-gold">{{ c.totalCommands }}</span>
              </div>
              <div class="chat-stat-item">
                <span class="chat-stat-label">{{ t('admin.avg_messages_per_day') }}:</span>
                <span class="chat-stat-val">{{ c.avgMessagesPerDay }}</span>
              </div>
              <div class="chat-stat-item">
                <span class="chat-stat-label">{{ t('admin.avg_commands_per_day') }}:</span>
                <span class="chat-stat-val">{{ c.avgCommandsPerDay }}</span>
              </div>
            </div>
          </li>
        </ul>
      </Card>
    </CardPrimary>

    <!-- Modal for Detailed Chat Stats -->
    <PixelModal
      v-model="isDetailModalOpen"
      :title="t('admin.chat_detail_modal')"
      width="360px"
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
          <strong class="text-success">{{ selectedChatDetail.totalMessages }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.total_commands') }}:</span>
          <strong class="text-gold">{{ selectedChatDetail.totalCommands }}</strong>
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
          <strong>{{ selectedChatDetail.activeUsersCount }}</strong>
        </div>

        <div class="telemetry-info-row">
          <span>{{ t('admin.last_activity') }}:</span>
          <strong>{{ formatDate(selectedChatDetail.lastActivity) }}</strong>
        </div>

        <!-- Daily Breakdown Table -->
        <h4 style="margin: 12px 0 4px; font-size: 15px;">{{ t('admin.daily_stats') }}</h4>
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
                <td class="text-success">{{ d.messageCount }}</td>
                <td class="text-gold">{{ d.commandCount }}</td>
                <td>{{ d.activeUsersCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PixelModal>
  </div>
</template>

<style scoped src="./admin.css"></style>
<style scoped>
.chat-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-badge {
  font-size: 10px;
  background: rgba(251, 192, 45, 0.2);
  color: #fbc02d;
  border: 1px solid #fbc02d;
  padding: 2px 6px;
  border-radius: 4px;
}

.link-button {
  font-size: 11px;
  background: #2e7d32;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}

.link-button:hover {
  background: #388e3c;
}

.chat-url-link {
  color: #1e88e5;
  text-decoration: underline;
  word-break: break-all;
}
</style>
