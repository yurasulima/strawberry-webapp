<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, Card, ButtonText, ItemIcon, PixelPieChart } from '@/components/pixel'
import type { PieItem } from '@/components/pixel/PixelPieChart.vue'
import FlatCard from "@/components/pixel/FlatCard.vue"

const { t } = useI18n()
const router = useRouter()

interface AdminStats {
  totalUsers: number
  bannedUsers: number
  totalMoney: number
  totalStrawberries: number
  totalBusinesses: number
}

interface ItemYield {
  itemName: string
  totalAmount: number
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

  totalCoinsEarned?: number
  totalCoinsEarnedDiff?: number
  totalBusinessItemsYielded?: number
  totalBusinessItemsYieldedDiff?: number
  totalStrawberriesFromDrops?: number
  totalStrawberriesFromDropsDiff?: number
  totalStrawberriesFromDailyRewards?: number
  totalStrawberriesFromDailyRewardsDiff?: number
  totalStrawberriesFromTransfers?: number
  totalStrawberriesFromTransfersDiff?: number
  totalSpiderCandiesLooted?: number
  totalSpiderCandiesLootedDiff?: number
  totalCatPets?: number
  totalCatPetsDiff?: number

  // Розіграші
  totalGiveawayAttempts?: number
  totalGiveawayAttemptsDiff?: number
  successfulGiveaways?: number
  successfulGiveawaysDiff?: number
  failedGiveaways?: number
  failedGiveawaysDiff?: number
  cancelledGiveaways?: number
  cancelledGiveawaysDiff?: number
  totalGiveawayPrizeCirculated?: number
  totalGiveawayPrizeCirculatedDiff?: number
  totalGiveawayRefundedCoins?: number
  totalGiveawayRefundedCoinsDiff?: number
  blockedSpamMessagesCount?: number
  blockedSpamMessagesCountDiff?: number

  // Інвайти
  totalInvitesCount?: number
  totalInvitesCountDiff?: number
  totalInviteRewardsCoins?: number
  totalInviteRewardsCoinsDiff?: number

  // Чати
  totalTelegramChats?: number
  totalTelegramChatsDiff?: number
  botAddRewardsClaimed?: number
  botAddRewardsClaimedDiff?: number

  businessYieldBreakdown?: ItemYield[]
}

interface CatPetStat {
  userId: number
  telegramId: number
  userName: string
  pets: number
}

const catPets = ref<CatPetStat[]>([])
const stats = ref<AdminStats | null>(null)
const telemetry = ref<GlobalTelemetry | null>(null)
const isLoading = ref(true)

const selectedDate = ref<string>(new Date().toISOString().split('T')[0])

async function load() {
  isLoading.value = true
  try {
    const [s, tm, cp] = await Promise.allSettled([
      api.get<AdminStats>('/admin/stats'),
      api.get<GlobalTelemetry>('/admin/telemetry', {
        params: { date: selectedDate.value }
      }),
      api.get<CatPetStat[]>('/admin/telemetry/cat-pets', {
        params: { date: selectedDate.value }
      }),
    ])
    if (s.status === 'fulfilled') stats.value = s.value.data
    else console.error('Error fetching admin stats:', s.reason)
    if (tm.status === 'fulfilled') telemetry.value = tm.value.data
    else console.error('Error fetching telemetry:', tm.reason)
    if (cp.status === 'fulfilled') catPets.value = cp.value.data
    else console.error('Error fetching cat pets:', cp.reason)
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

function getCandyCount(tm: GlobalTelemetry | null): number {
  if (!tm) return 0
  if (tm.totalSpiderCandiesLooted !== undefined) return tm.totalSpiderCandiesLooted
  const found = tm.businessYieldBreakdown?.find(b => b.itemName?.toLowerCase() === 'candy')
  return found?.totalAmount ?? 0
}

const giveawayChartData = computed<PieItem[]>(() => {
  if (!telemetry.value) return []
  const tm = telemetry.value
  return [
    { label: 'Успішні', value: tm.successfulGiveaways || 0, color: '#2e7d32' },
    { label: 'Відхилені', value: tm.failedGiveaways || 0, color: '#ff7043' },
    { label: 'Скасовані 24г', value: tm.cancelledGiveaways || 0, color: '#ab47bc' },
    { label: 'Спам відхилено', value: tm.blockedSpamMessagesCount || 0, color: '#c62828' }
  ]
})

const economyChartData = computed<PieItem[]>(() => {
  if (!telemetry.value) return []
  const tm = telemetry.value
  return [
    { label: 'Обіг розіграшів', value: tm.totalGiveawayPrizeCirculated || 0, color: '#1e88e5' },
    { label: 'Перекази монет', value: tm.totalCoinsTransferred || 0, color: '#2e7d32' },
    { label: 'Украдено монет', value: tm.totalCoinsStolen || 0, color: '#c62828' },
    { label: 'Зароблено з продажів', value: tm.totalCoinsEarned || 0, color: '#fbc02d' },
    { label: 'Виплати за інвайти', value: tm.totalInviteRewardsCoins || 0, color: '#26a69a' }
  ]
})

const chatEngagementChartData = computed<PieItem[]>(() => {
  if (!telemetry.value) return []
  const tm = telemetry.value
  return [
    { label: 'Групові чати', value: tm.totalTelegramChats || 0, color: '#1e88e5' },
    { label: 'Реферальні інвайти', value: tm.totalInvitesCount || 0, color: '#2e7d32' }
  ]
})

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
        <div class="header-actions">
          <ButtonText @click="router.push('/cats')">Котики</ButtonText>
          <ButtonText :loading="isLoading" @click="load">
            {{ t('players.refresh') }}
          </ButtonText>
        </div>
      </div>

      <h3 class="telemetry-header">{{ t('admin.stats_title') }}</h3>
      <div v-if="stats" class="stats-grid">
        <FlatCard width="100%" height="auto" padding="8px 10px">
          <div class="stat-card">
            <span class="stat-label">{{ t('admin.total_users') }}</span>
            <span class="stat-value">{{ formatNumber(stats.totalUsers) }}</span>
          </div>
        </FlatCard>

        <FlatCard width="100%" height="auto" padding="8px 10px">
          <div class="stat-card">
            <span class="stat-label">{{ t('admin.banned_users') }}</span>
            <span class="stat-value text-danger">{{ formatNumber(stats.bannedUsers) }}</span>
          </div>
        </FlatCard>

        <FlatCard width="100%" height="auto" padding="8px 10px">
          <div class="stat-card">
            <span class="stat-label">{{ t('admin.total_money') }}</span>
            <span class="stat-value text-gold">{{ formatNumber(stats.totalMoney) }}</span>
          </div>
        </FlatCard>

        <FlatCard width="100%" height="auto" padding="8px 10px">
          <div class="stat-card">
            <span class="stat-label">{{ t('admin.total_strawberries') }}</span>
            <span class="stat-value text-success">{{ formatNumber(stats.totalStrawberries) }}</span>
          </div>
        </FlatCard>

        <FlatCard width="100%" height="auto" padding="8px 10px">
          <div class="stat-card">
            <span class="stat-label">{{ t('admin.total_businesses') }}</span>
            <span class="stat-value">{{ formatNumber(stats.totalBusinesses) }}</span>
          </div>
        </FlatCard>
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

          <!-- ── Секція справжніх піксельних кругових графіків ── -->
          <h4 class="sub-header">Піксельна Аналітика та Розподіл</h4>
          <div class="charts-row">
            <FlatCard width="100%" height="auto" padding="10px">
              <PixelPieChart
                title="Статуси Розіграшів"
                :items="giveawayChartData"
                :display-size="200"
              />
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <PixelPieChart
                title="Обіг Економіки"
                :items="economyChartData"
                :display-size="200"
              />
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <PixelPieChart
                title="Залученість Чатив"
                :items="chatEngagementChartData"
                :display-size="200"
              />
            </FlatCard>
          </div>

          <h4 class="sub-header" style="margin-top: 16px;">Показники та Метрики</h4>
          <div class="telemetry-grid">
            <!-- Розіграші -->
            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Всього спроб розіграшів</span>
                <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalGiveawayAttempts) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Успішних розіграшів</span>
                <span class="telemetry-value text-success">{{ formatNumber(telemetry.successfulGiveaways) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Скасованих (24г без 10 людей)</span>
                <span class="telemetry-value text-danger">{{ formatNumber(telemetry.cancelledGiveaways) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Обіг розіграшів (монет)</span>
                <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalGiveawayPrizeCirculated) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Відфільтровано спам-повідомлень</span>
                <span class="telemetry-value text-danger">{{ formatNumber(telemetry.blockedSpamMessagesCount) }}</span>
              </div>
            </FlatCard>

            <!-- Інвайти та чати -->
            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Всього реферальних інвайтів</span>
                <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalInvitesCount) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Збережених Telegram-чатів</span>
                <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalTelegramChats) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
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
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Всього зароблено монет</span>
                <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalCoinsEarned) }}</span>
                <span
                  v-if="telemetry.totalCoinsEarnedDiff !== undefined"
                  class="diff-tag"
                  :class="diffClass(telemetry.totalCoinsEarnedDiff)"
                >
                  {{ formatDiff(telemetry.totalCoinsEarnedDiff) }}
                </span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Предметів з бізнесів</span>
                <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalBusinessItemsYielded) }}</span>
                <span
                  v-if="telemetry.totalBusinessItemsYieldedDiff !== undefined"
                  class="diff-tag"
                  :class="diffClass(telemetry.totalBusinessItemsYieldedDiff)"
                >
                  {{ formatDiff(telemetry.totalBusinessItemsYieldedDiff) }}
                </span>

                <div v-if="telemetry.businessYieldBreakdown && telemetry.businessYieldBreakdown.length" class="yield-breakdown-box">
                  <div v-for="b in telemetry.businessYieldBreakdown" :key="b.itemName" class="yield-breakdown-row">
                    <ItemIcon :item="b.itemName" size="18" />
                    <span class="breakdown-name">{{ b.itemName }}:</span>
                    <strong class="breakdown-val">{{ formatNumber(b.totalAmount) }}</strong>
                  </div>
                </div>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="8px 10px">
              <div class="telemetry-item">
                <span class="telemetry-label">Погладжувань котиків</span>
                <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalCatPets) }}</span>
                <span
                  v-if="telemetry.totalCatPetsDiff !== undefined"
                  class="diff-tag"
                  :class="diffClass(telemetry.totalCatPetsDiff)"
                >
                  {{ formatDiff(telemetry.totalCatPetsDiff) }}
                </span>

                <div v-if="catPets.length" class="yield-breakdown-box">
                  <div v-for="c in catPets" :key="c.userId" class="yield-breakdown-row">
                    <span class="breakdown-name">{{ c.userName }}:</span>
                    <strong class="breakdown-val">{{ formatNumber(c.pets) }}</strong>
                  </div>
                </div>
                <span v-else class="diff-tag diff-muted">за цей день ніхто не гладив</span>
              </div>
            </FlatCard>
          </div>
        </div>
      </Card>
    </CardPrimary>
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
  gap: 8px;
  margin-bottom: 10px;
}

.section-header .title {
  margin: 0;
  text-align: left;
}

.title {
  margin: 0 0 12px;
  text-align: center;
  font-size: 22px;
  font-weight: normal;
}

.telemetry-header {
  font-size: 16px;
  font-weight: bold;
  color: #3f2e21;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
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

.text-danger { color: #c62828; }
.text-gold { color: #d97706; }
.text-success { color: #2e7d32; }

.empty-state {
  text-align: center;
  padding: 16px;
  font-size: 16px;
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

.telemetry-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-label {
  font-size: 14px;
  color: #5d4037;
}

.pixel-input-date {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: var(--font-pixel);
  font-size: 14px;
  color: #3f2e21;
  outline: none;
  cursor: pointer;
}

.pixel-input-date:focus {
  border-color: #2e7d32;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-header {
  font-size: 14px;
  font-weight: bold;
  color: #fbc02d;
  margin: 12px 0 8px 0;
  text-shadow: 1px 1px 0 #000;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  width: 100%;
  margin-bottom: 12px;
}

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

.yield-breakdown-box {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(63, 46, 33, 0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.yield-breakdown-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.breakdown-name {
  color: #5d4037;
  flex: 1;
}

.breakdown-val {
  color: #2e7d32;
}
</style>
