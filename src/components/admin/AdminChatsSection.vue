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
const isLoading = ref(true)

// Modal state
const isDetailModalOpen = ref(false)
const selectedChatDetail = ref<ChatDetail | null>(null)
const isLoadingDetail = ref(false)

async function loadChats() {
  isLoading.value = true
  try {
    const res = await api.get<ChatSummary[]>('/admin/chats')
    chats.value = res.data
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
        <ButtonText padding="6px 14px" :loading="isLoading" @click="loadChats">
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
              <span class="chat-title">💬 {{ c.chatTitle }}</span>
              <span class="chat-id-badge">ID: {{ c.chatId }}</span>
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
        <div class="user-telemetry-title">💬 {{ selectedChatDetail.chatTitle }}</div>

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
                <th>💬</th>
                <th>🤖</th>
                <th>👥</th>
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
