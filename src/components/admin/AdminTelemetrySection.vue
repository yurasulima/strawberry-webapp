<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, ButtonText, ItemIcon } from '@/components/pixel'
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
  dropYieldBreakdown?: ItemYield[]
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

const timeMode = ref<'date' | 'all'>('date')
const selectedDate = ref<string>(new Date().toISOString().split('T')[0])

async function load() {
  isLoading.value = true
  try {
    const params = timeMode.value === 'date' ? { date: selectedDate.value } : {}
    const [s, tm, cp] = await Promise.allSettled([
      api.get<AdminStats>('/admin/stats'),
      api.get<GlobalTelemetry>('/admin/telemetry', { params }),
      api.get<CatPetStat[]>('/admin/telemetry/cat-pets', { params }),
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

watch([selectedDate, timeMode], () => {
  load()
})

onMounted(load)
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <!-- Top Section Header -->
      <div class="section-header">
        <div class="title-group">
          <h2 class="title">{{ t('admin.nav.telemetry') }}</h2>

          <!-- Mode Switcher -->
          <div class="mode-toggle">
            <button
              class="mode-btn"
              :class="{ active: timeMode === 'date' }"
              @click="timeMode = 'date'"
            >
              За дату
            </button>
            <button
              class="mode-btn"
              :class="{ active: timeMode === 'all' }"
              @click="timeMode = 'all'"
            >
              За весь час
            </button>
          </div>

          <div v-if="timeMode === 'date'" class="date-picker-box">
            <span class="date-label">{{ t('admin.telemetry_date') }}:</span>
            <input type="date" v-model="selectedDate" class="pixel-input-date" />
          </div>
        </div>
        <div class="header-actions">
          <ButtonText @click="router.push('/cats')">Котики</ButtonText>
          <ButtonText :loading="isLoading" @click="load">
            {{ t('players.refresh') }}
          </ButtonText>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">{{ t('invite_list.loading') }}</div>

      <div v-else class="telemetry-sections">
        <!-- 1. Загальна статистика системи -->
        <div v-if="stats" class="telemetry-block">
          <h3 class="block-title">Загальна статистика системи</h3>
          <div class="metrics-grid">
            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">{{ t('admin.total_users') }}</span>
                <span class="stat-value">{{ formatNumber(stats.totalUsers) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">{{ t('admin.banned_users') }}</span>
                <span class="stat-value text-danger">{{ formatNumber(stats.bannedUsers) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">{{ t('admin.total_money') }}</span>
                <span class="stat-value text-gold">
                  {{ formatNumber(stats.totalMoney) }}
                  <ItemIcon item="money" size="16" style="vertical-align: middle;" />
                </span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">{{ t('admin.total_strawberries') }}</span>
                <span class="stat-value text-success">
                  {{ formatNumber(stats.totalStrawberries) }}
                  <ItemIcon item="strawberry" size="16" style="vertical-align: middle;" />
                </span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">{{ t('admin.total_businesses') }}</span>
                <span class="stat-value">{{ formatNumber(stats.totalBusinesses) }}</span>
              </div>
            </FlatCard>
          </div>
        </div>

        <!-- 2. Телеметрія активності та економіки -->
        <template v-if="telemetry">
          <!-- Клікерна активність -->
          <div class="telemetry-block">
            <h3 class="block-title">
              Активність клікерів
              <small class="title-sub">{{ timeMode === 'all' ? '(за весь час)' : `(${selectedDate})` }}</small>
            </h3>
            <div class="metrics-grid">
              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">{{ t('admin.total_clicks_all_time') }}</span>
                  <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalClicksAllTime) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalClicksAllTimeDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalClicksAllTimeDiff)">
                    {{ formatDiff(telemetry.totalClicksAllTimeDiff) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">{{ timeMode === 'all' ? 'Кліків за обраний період' : t('admin.clicks_today') }}</span>
                  <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalClicksToday) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalClicksTodayDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalClicksTodayDiff)">
                    {{ formatDiff(telemetry.totalClicksTodayDiff) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">{{ t('admin.unique_clickers') }}</span>
                  <span class="telemetry-value">{{ formatNumber(telemetry.uniqueClickersCount) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.uniqueClickersCountDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.uniqueClickersCountDiff)">
                    {{ formatDiff(telemetry.uniqueClickersCountDiff) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">{{ t('admin.total_batches') }}</span>
                  <span class="telemetry-value">{{ formatNumber(telemetry.totalClickBatches) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalClickBatchesDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalClickBatchesDiff)">
                    {{ formatDiff(telemetry.totalClickBatchesDiff) }}
                  </span>
                </div>
              </FlatCard>
            </div>
          </div>

          <!-- Економіка, Перекази та Крадіжки -->
          <div class="telemetry-block">
            <h3 class="block-title">
              Обіг монет та крадіжки
              <small class="title-sub">{{ timeMode === 'all' ? '(за весь час)' : `(${selectedDate})` }}</small>
            </h3>
            <div class="metrics-grid">
              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Всього зароблено монет</span>
                  <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalCoinsEarned) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalCoinsEarnedDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalCoinsEarnedDiff)">
                    {{ formatDiff(telemetry.totalCoinsEarnedDiff) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Передано монет гравцями</span>
                  <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalCoinsTransferred) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalCoinsTransferredDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalCoinsTransferredDiff)">
                    {{ formatDiff(telemetry.totalCoinsTransferredDiff) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Спроб крадіжок</span>
                  <span class="telemetry-value">{{ formatNumber(telemetry.totalStealAttempts) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalStealAttemptsDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalStealAttemptsDiff)">
                    {{ formatDiff(telemetry.totalStealAttemptsDiff) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Украдено монет</span>
                  <span class="telemetry-value text-danger">{{ formatNumber(telemetry.totalCoinsStolen) }}</span>
                  <span v-if="timeMode === 'date' && telemetry.totalCoinsStolenDiff !== undefined" class="diff-tag" :class="diffClass(telemetry.totalCoinsStolenDiff)">
                    {{ formatDiff(telemetry.totalCoinsStolenDiff) }}
                  </span>
                </div>
              </FlatCard>
            </div>
          </div>

          <!-- Розіграші -->
          <div class="telemetry-block">
            <h3 class="block-title">Аналітика Розіграшів</h3>
            <div class="metrics-grid">
              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Всього спроб розіграшів</span>
                  <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalGiveawayAttempts) }}</span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Успішних розіграшів</span>
                  <span class="telemetry-value text-success">{{ formatNumber(telemetry.successfulGiveaways) }}</span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Відхилених / Скасованих</span>
                  <span class="telemetry-value text-danger">
                    {{ formatNumber((telemetry.failedGiveaways || 0) + (telemetry.cancelledGiveaways || 0)) }}
                  </span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Обіг призів розіграшів</span>
                  <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalGiveawayPrizeCirculated) }}</span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Відфільтровано спам-повідомлень</span>
                  <span class="telemetry-value text-danger">{{ formatNumber(telemetry.blockedSpamMessagesCount) }}</span>
                </div>
              </FlatCard>
            </div>
          </div>

          <!-- Соціальні метрики: Інвайти та Чати -->
          <div class="telemetry-block">
            <h3 class="block-title">Інвайти та Telegram-чати</h3>
            <div class="metrics-grid">
              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Реферальних інвайтів</span>
                  <span class="telemetry-value text-success">{{ formatNumber(telemetry.totalInvitesCount) }}</span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Виплати за інвайти (монет)</span>
                  <span class="telemetry-value text-gold">{{ formatNumber(telemetry.totalInviteRewardsCoins) }}</span>
                </div>
              </FlatCard>

              <FlatCard width="100%" height="auto" padding="10px">
                <div class="telemetry-item">
                  <span class="telemetry-label">Підключених Telegram-чатів</span>
                  <span class="telemetry-value">{{ formatNumber(telemetry.totalTelegramChats) }}</span>
                </div>
              </FlatCard>
            </div>
          </div>

          <!-- Виробництво предметів бізнесами -->
          <div class="telemetry-block">
            <h3 class="block-title">
              Виробництво предметів з бізнесів
              <small class="title-sub">{{ timeMode === 'all' ? '(за весь час)' : `(${selectedDate})` }}</small>
            </h3>
            <FlatCard width="100%" height="auto" padding="12px">
              <div class="telemetry-item" style="margin-bottom: 8px;">
                <span class="telemetry-label">Всього вироблено предметів:</span>
                <strong class="telemetry-value text-success">{{ formatNumber(telemetry.totalBusinessItemsYielded) }}</strong>
              </div>

              <div v-if="telemetry.businessYieldBreakdown && telemetry.businessYieldBreakdown.length" class="yield-grid">
                <div v-for="b in telemetry.businessYieldBreakdown" :key="b.itemName" class="yield-chip">
                  <ItemIcon :item="b.itemName" size="22" />
                  <div class="yield-chip-info">
                    <span class="yield-chip-name">{{ b.itemName }}</span>
                    <strong class="yield-chip-val">{{ formatNumber(b.totalAmount) }}</strong>
                  </div>
                </div>
              </div>
              <span v-else class="hint-text">Немає вироблених предметів за обраний період</span>
            </FlatCard>
          </div>

          <!-- Здобич з коробок-дропів -->
          <div class="telemetry-block">
            <h3 class="block-title">
              Здобич з коробок-дропів
              <small class="title-sub">{{ timeMode === 'all' ? '(за весь час)' : `(${selectedDate})` }}</small>
            </h3>
            <FlatCard width="100%" height="auto" padding="12px">
              <div class="telemetry-item" style="margin-bottom: 8px;">
                <span class="telemetry-label">Всього зібрано з коробок-дропів:</span>
                <strong class="telemetry-value text-gold">{{ formatNumber(telemetry.totalStrawberriesFromDrops) }}</strong>
              </div>

              <div v-if="telemetry.dropYieldBreakdown && telemetry.dropYieldBreakdown.length" class="yield-grid">
                <div v-for="d in telemetry.dropYieldBreakdown" :key="d.itemName" class="yield-chip">
                  <ItemIcon :item="d.itemName" size="22" />
                  <div class="yield-chip-info">
                    <span class="yield-chip-name">{{ d.itemName }}</span>
                    <strong class="yield-chip-val">{{ formatNumber(d.totalAmount) }}</strong>
                  </div>
                </div>
              </div>
              <span v-else class="hint-text">Немає випавших предметів з коробок за обраний період</span>
            </FlatCard>
          </div>

          <!-- Погладжування котиків -->
          <div class="telemetry-block">
            <h3 class="block-title">
              Погладжування котиків
              <small class="title-sub">{{ timeMode === 'all' ? '(за весь час)' : `(${selectedDate})` }}</small>
            </h3>
            <FlatCard width="100%" height="auto" padding="12px">
              <div class="telemetry-item" style="margin-bottom: 8px;">
                <span class="telemetry-label">Всього погладжувань:</span>
                <strong class="telemetry-value text-gold">{{ formatNumber(telemetry.totalCatPets) }}</strong>
              </div>

              <div v-if="catPets.length" class="cat-pets-grid">
                <div v-for="c in catPets" :key="c.userId" class="cat-pet-card">
                  <span class="cat-pet-user">{{ c.userName }}</span>
                  <strong class="cat-pet-count">+{{ formatNumber(c.pets) }}</strong>
                </div>
              </div>
              <span v-else class="hint-text">За обраний період ніхто не гладив котиків</span>
            </FlatCard>
          </div>
        </template>
      </div>
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
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: normal;
}

.mode-toggle {
  display: flex;
  gap: 4px;
  background: rgba(63, 46, 33, 0.08);
  padding: 3px;
  border: 1px solid #5d4037;
  border-radius: 4px;
}

.mode-btn {
  background: none;
  border: none;
  padding: 4px 10px;
  font-family: var(--font-pixel);
  font-size: 13px;
  color: #5d4037;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.mode-btn:hover {
  background: rgba(63, 46, 33, 0.1);
}

.mode-btn.active {
  background: #2e7d32;
  color: #fff;
  font-weight: bold;
}

.date-picker-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(63, 46, 33, 0.06);
  padding: 4px 8px;
  border: 1px solid rgba(63, 46, 33, 0.2);
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

.pixel-input-date:focus {
  border-color: #2e7d32;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.telemetry-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.telemetry-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block-title {
  margin: 0;
  font-size: 15px;
  font-weight: bold;
  color: #2e7d32;
  border-bottom: 1px solid rgba(46, 125, 50, 0.3);
  padding-bottom: 4px;
}

.title-sub {
  font-size: 12px;
  font-weight: normal;
  color: #7c624d;
  margin-left: 6px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.stat-card, .telemetry-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label, .telemetry-label {
  font-size: 12px;
  color: #5d4037;
}

.stat-value, .telemetry-value {
  font-size: 17px;
  font-weight: bold;
  color: #3f2e21;
}

.diff-tag {
  font-size: 11px;
  font-weight: bold;
  margin-top: 2px;
}

.diff-success { color: #2e7d32; }
.diff-danger { color: #c62828; }
.diff-muted { color: #757575; }

.text-danger { color: #c62828; }
.text-gold { color: #d97706; }
.text-success { color: #2e7d32; }

/* Yield Grid */
.yield-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
  margin-top: 6px;
}

.yield-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(63, 46, 33, 0.05);
  border: 1px solid rgba(63, 46, 33, 0.15);
}

.yield-chip-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.yield-chip-name {
  font-size: 11px;
  color: #7c624d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yield-chip-val {
  font-size: 13px;
  color: #2e7d32;
}

/* Cat pets grid */
.cat-pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px;
  margin-top: 6px;
}

.cat-pet-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: rgba(217, 119, 6, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.2);
  font-size: 12px;
}

.cat-pet-user {
  color: #5d4037;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-pet-count {
  color: #d97706;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 24px;
  font-size: 15px;
}

.hint-text {
  font-size: 12px;
  color: #7c624d;
}
</style>
