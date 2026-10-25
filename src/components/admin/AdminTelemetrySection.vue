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
  totalClicksToday: number
  totalClickBatches: number
  uniqueClickersCount: number
  avgClicksPerClicker: number
  avgClicksPerBatch: number
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
        <div class="stat-card">
          <span class="stat-label">{{ t('admin.total_businesses') }}</span>
          <span class="stat-value">{{ stats.totalBusinesses }}</span>
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
              <span class="telemetry-value text-success">{{ telemetry.totalClicksAllTime }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.clicks_today') }}</span>
              <span class="telemetry-value text-gold">{{ telemetry.totalClicksToday }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.unique_clickers') }}</span>
              <span class="telemetry-value">{{ telemetry.uniqueClickersCount }}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">{{ t('admin.total_batches') }}</span>
              <span class="telemetry-value">{{ telemetry.totalClickBatches }}</span>
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
    </CardPrimary>
  </div>
</template>

<style scoped src="./admin.css"></style>
