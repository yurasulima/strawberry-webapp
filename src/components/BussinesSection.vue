<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import type { UserBusiness } from '@/types/UserBusiness.ts'
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText } from '@/components/pixel'
import { playClickSound, playCoinSound } from '@/services/sound'
import { useUserStore } from '@/stores/user.ts'
import { useToastStore } from '@/stores/toast.ts'

const props = defineProps<{ user?: any }>()
const { t, te } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const myBusinesses = computed<UserBusiness[]>(() => userStore.user?.businesses || [])
const isLoading = computed(() => !userStore.user && userStore.isLoading)

const collectingName = ref<string | null>(null)

const timerMap = ref<Record<number, number>>({})
let timerInterval: any = null

function formatBizName(rawName?: string): string {
  if (!rawName) return 'Бізнес'
  const key = `business.names.${rawName.toLowerCase().trim()}`
  if (te(key)) {
    return t(key)
  }
  return rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function translateError(err: any): string {
  const raw = err.response?.data?.message || err.response?.data || err.message || ''
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
  const lower = str.toLowerCase()

  if (lower.includes('wait') || lower.includes('have to wait') || lower.includes('collecting exception')) {
    return t('clicker.daily_limit_reached')
  }
  if (lower.includes('not enough money') || lower.includes('no money')) return 'Недостатньо монет!'
  if (lower.includes('not found')) return 'Бізнес не знайдено'
  return str || 'Виникла помилка під час виконання операції'
}

const countOf = (biz: UserBusiness) => biz.count || 1
const yieldOf = (biz: UserBusiness) => (biz.business?.yieldCount || 10) * countOf(biz)

function formatRemainingTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

function updateTimers() {
  myBusinesses.value.forEach(biz => {
    if (biz.nextCollectInSeconds !== undefined) {
      timerMap.value[biz.id] = Math.max(0, biz.nextCollectInSeconds)
    } else if (biz.usedAt && biz.business?.yieldInterval?.seconds) {
      const usedAtDate = new Date(biz.usedAt).getTime()
      const nextDate = usedAtDate + (biz.business.yieldInterval.seconds * 1000)
      const diff = Math.max(0, Math.floor((nextDate - Date.now()) / 1000))
      timerMap.value[biz.id] = diff
    } else {
      timerMap.value[biz.id] = 0
    }
  })
}

function startTimer() {
  stopTimer()
  updateTimers()
  timerInterval = setInterval(() => {
    Object.keys(timerMap.value).forEach(idKey => {
      const id = Number(idKey)
      if (timerMap.value[id] > 0) {
        timerMap.value[id]--
      }
    })
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

watch(myBusinesses, () => {
  startTimer()
}, { immediate: true, deep: true })

onMounted(async () => {
  if (!userStore.user) {
    await userStore.fetchUser()
  }
  startTimer()
})

onUnmounted(() => {
  stopTimer()
})

async function directCollect(userBiz: UserBusiness) {
  if (timerMap.value[userBiz.id] > 0) return

  playClickSound()
  const rawName = userBiz.business?.name || ''
  collectingName.value = rawName

  try {
    await api.post('/business/collect', { name: rawName })
    playCoinSound()
    toastStore.showToast(t('business.collected_success', { name: formatBizName(rawName) }), 'success')
    await userStore.fetchUser()
  } catch (err: any) {
    toastStore.showToast(translateError(err), 'error')
  } finally {
    collectingName.value = null
  }
}
</script>

<template>
  <div class="business-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <h2 class="title">{{ t('business.title') }}</h2>

      <div v-if="isLoading" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <template v-else>
        <!-- Один Card на весь список: рядки розділені лінією -->
        <Card v-if="myBusinesses.length" width="100%" height="auto" :padding="6">
          <ul class="biz-list">
            <li v-for="biz in myBusinesses" :key="biz.id" class="biz-row">
              <div class="biz-info">
                <span class="biz-name">{{ formatBizName(biz.business?.name) }}</span>
                <span class="biz-meta">
                  {{ countOf(biz) }} {{ t('business.count_pcs') }} · <strong class="yield-val">+{{ yieldOf(biz) }}</strong>
                </span>
                <span v-if="timerMap[biz.id] > 0" class="biz-timer">
                  {{ t('business.collect_in', { time: formatRemainingTime(timerMap[biz.id]) }) }}
                </span>
              </div>

              <ButtonText
                  :disabled="timerMap[biz.id] > 0"
                  :loading="collectingName === biz.business?.name"
                  @click="directCollect(biz)"
              >
                {{ timerMap[biz.id] > 0 ? formatRemainingTime(timerMap[biz.id]) : t('business.collect') }}
              </ButtonText>
            </li>
          </ul>
        </Card>

        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p class="empty-title">{{ t('business.empty_businesses') }}</p>
          <p class="empty-subtitle">{{ t('business.buy_first_in_shop') }}</p>
        </div>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.business-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  line-height: 1.1;
  color: #3f2e21;
}

.title {
  margin: 0 0 10px;
  text-align: center;
  font-family: inherit;
  font-size: 22px;
  font-weight: normal;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Список */
.biz-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.biz-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 4px 6px;
}

.biz-row + .biz-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.biz-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.biz-name {
  font-size: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.biz-meta {
  font-size: 16px;
  color: #5d4037;
}

.biz-timer {
  font-size: 14px;
  color: #b71c1c;
}

.yield-val {
  font-weight: normal;
  color: #2e7d32;
}

/* Порожній стан */
.empty-state { text-align: center; padding: 16px 8px; }
.empty-icon { font-size: 32px; color: #5d4037; margin-bottom: 6px; }
.empty-title { margin: 0 0 4px; font-size: 20px; }
.empty-subtitle { margin: 0; font-size: 16px; color: #5d4037; }
</style>
