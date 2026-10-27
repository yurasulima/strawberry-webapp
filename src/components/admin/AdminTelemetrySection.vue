<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, Card, ButtonText } from '@/components/pixel'

const { t } = useI18n()

interface AdminStats {
  totalUsers: number
  bannedUsers: number
  totalMoney: number
  totalStrawberries: number
  totalBusinesses: number
}

interface GlobalTelemetry {
  totalClicksAllTime: number
  totalClicksAllTimeDiff?: number
  totalClicksToday: number
  totalClicksTodayDiff?: number
  totalClickBatches: number
  totalClickBatchesDiff?: number
  uniqueClickersCount: number
  uniqueClickersCountDiff?: number
  avgClicksPerClicker: number
  avgClicksPerClickerDiff?: number
  avgClicksPerBatch: number
  avgClicksPerBatchDiff?: number

  totalStealAttempts?: number
  totalStealAttemptsDiff?: number
  failedStealAttempts?: number
  failedStealAttemptsDiff?: number
  totalCoinsStolen?: number
  totalCoinsStolenDiff?: number
  totalCoinsTransferred?: number
  totalCoinsTransferredDiff?: number
}

const stats = ref<AdminStats | null>(null)
const telemetry = ref<GlobalTelemetry | null>(null)
const isLoading = ref(true)

const selectedDate = ref<string>(new Date().toISOString().split('T')[0])

async function load() {
  isLoading.value = true
  try {
    const [s, tm] = await Promise.allSettled([
      api.get<AdminStats>('/admin/stats'),
      api.get<GlobalTelemetry>('/admin/telemetry', {
        params: { date: selectedDate.value }
      }),
    ])
    if (s.status === 'fulfilled') stats.value = s.value.data
    else console.error('Error fetching admin stats:', s.reason)
    if (tm.status === 'fulfilled') telemetry.value = tm.value.data
    else console.error('Error fetching telemetry:', tm.reason)
  } finally {
    isLoading.value = false
  }
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('uk-UA')
}

function formatDiff(diff?: number): string {
  if (diff === undefined || diff === null) return ''
  if (diff > 0) return `▲ +${diff.toLocaleString('uk-UA')}`
  if (diff < 0) return `▼ ${Math.abs(diff).toLocaleString('uk-UA')}`
  return `— 0`
}

function diffClass(diff?: number): string {
  if (diff === undefined || diff === null || diff === 0) return 'diff-muted'
  return diff > 0 ? 'diff-success' : 'diff-danger'
}

watch(selectedDate, () => {
  load()
})

onMounted(load)
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <div class="section-header">
        <h2 class="title">{{ t('admin.nav.telemetry') }}</h2>
        <ButtonText padding="6px 14px" :loading="isLoading" @click="load">
          {{ t('players.refresh') }}
        </ButtonText>
      </div>

      <h3 class="telemetry-header">{{ t('admin.stats_title') }}</h3>
      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_users') }}</span>
          <span class="stat-value">{{ formatNumber(stats.totalUsers) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.banned_users') }}</span>
          <span class="stat-value text-danger">{{ formatNumber(stats.bannedUsers) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_money') }}</span>
          <span class="stat-value text-gold">{{ formatNumber(stats.totalMoney) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_strawberries') }}</span>
          <span class="stat-value text-success">{{ formatNumber(stats.totalStrawberries) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_businesses') }}</span>
          <span class="stat-value">{{ formatNumber(stats.totalBusinesses) }}</span>
        </div>
      </div>
      <div v-else-if="!isLoading" class="empty-state">{{ t('admin.no_data') }}</div>

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
              <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalClicksAllTime) }}</span>
              <span
                v-if="telemetry.totalClicksAllTimeDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.totalClicksAllTimeDiff)"
              >
                {{ formatDiff(telemetry.totalClicksAllTimeDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.clicks_today') }}</span>
              <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalClicksToday) }}</span>
              <span
                v-if="telemetry.totalClicksTodayDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.totalClicksTodayDiff)"
              >
                {{ formatDiff(telemetry.totalClicksTodayDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.unique_clickers') }}</span>
              <span class="telemetry-value">{{ formatNumber(telemetry.uniqueClickersCount) }}</span>
              <span
                v-if="telemetry.uniqueClickersCountDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.uniqueClickersCountDiff)"
              >
                {{ formatDiff(telemetry.uniqueClickersCountDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.total_batches') }}</span>
              <span class="telemetry-value">{{ formatNumber(telemetry.totalClickBatches) }}</span>
              <span
                v-if="telemetry.totalClickBatchesDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.totalClickBatchesDiff)"
              >
                {{ formatDiff(telemetry.totalClickBatchesDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.avg_per_user') }}</span>
              <span class="telemetry-value">{{ telemetry.avgClicksPerClicker }}</span>
              <span
                v-if="telemetry.avgClicksPerClickerDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.avgClicksPerClickerDiff)"
              >
                {{ formatDiff(telemetry.avgClicksPerClickerDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.avg_per_batch') }}</span>
              <span class="telemetry-value">{{ telemetry.avgClicksPerBatch }}</span>
              <span
                v-if="telemetry.avgClicksPerBatchDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.avgClicksPerBatchDiff)"
              >
                {{ formatDiff(telemetry.avgClicksPerBatchDiff) }}
              </span>
            </div>

            <!-- Телеметрія крадіжок та переказів -->
            <div class="telemetry-item">
              <span class="telemetry-label">Спроб крадіжок</span>
              <span class="telemetry-value">{{ formatNumber(telemetry.totalStealAttempts) }}</span>
              <span
                v-if="telemetry.totalStealAttemptsDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.totalStealAttemptsDiff)"
              >
                {{ formatDiff(telemetry.totalStealAttemptsDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">Неуспішних крадіжок</span>
              <span class="telemetry-value text-danger">{{ formatNumber(telemetry.failedStealAttempts) }}</span>
              <span
                v-if="telemetry.failedStealAttemptsDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.failedStealAttemptsDiff)"
              >
                {{ formatDiff(telemetry.failedStealAttemptsDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">Украдено монет</span>
              <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalCoinsStolen) }}</span>
              <span
                v-if="telemetry.totalCoinsStolenDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.totalCoinsStolenDiff)"
              >
                {{ formatDiff(telemetry.totalCoinsStolenDiff) }}
              </span>
            </div>

            <div class="telemetry-item">
              <span class="telemetry-label">Передано монет</span>
              <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalCoinsTransferred) }}</span>
              <span
                v-if="telemetry.totalCoinsTransferredDiff !== undefined"
                class="diff-tag"
                :class="diffClass(telemetry.totalCoinsTransferredDiff)"
              >
                {{ formatDiff(telemetry.totalCoinsTransferredDiff) }}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </CardPrimary>
  </div>
</template>

<style scoped src="./admin.css"></style>
<style scoped>
.diff-tag {
  font-size: 11px;
  font-weight: bold;
  margin-top: 2px;
  display: block;
}

.diff-success {
  color: #2e7d32;
}

.diff-danger {
  color: #c62828;
}

.diff-muted {
  color: #757575;
}
</style>
