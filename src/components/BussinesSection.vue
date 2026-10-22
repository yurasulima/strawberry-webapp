<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import api from '@/services/api.ts'
import type { UserBusiness } from '@/types/UserBusiness.ts'
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, Message, ButtonText } from '@/components/pixel'
import { playClickSound, playCoinSound } from '@/services/sound'
import { useUserStore } from '@/stores/user.ts'

const props = defineProps<{ user?: any }>()
const userStore = useUserStore()

const myBusinesses = computed<UserBusiness[]>(() => userStore.user?.businesses || [])
const isLoading = computed(() => !userStore.user && userStore.isLoading)

const collectingName = ref<string | null>(null)
const statusMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const timerMap = ref<Record<number, number>>({})
let timerInterval: any = null

function formatBizName(rawName?: string): string {
  if (!rawName) return 'Бізнес'
  const clean = rawName.toLowerCase().trim()
  if (clean === 'garden_bussines' || clean.includes('garden')) return 'Сад'
  if (clean.includes('strawberry') || clean.includes('полуниц')) return 'Полунична ферма'
  if (clean.includes('bakery') || clean.includes('пекар')) return 'Пекарня'
  if (clean.includes('factory') || clean.includes('фабрик')) return 'Фабрика'
  return rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function translateError(err: any): string {
  const raw = err.response?.data?.message || err.response?.data || err.message || ''
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
  const lower = str.toLowerCase()

  if (lower.includes('wait') || lower.includes('have to wait') || lower.includes('collecting exception')) {
    return 'Зачекайте трохи перед наступним збором прибутку!'
  }
  if (lower.includes('not enough money') || lower.includes('no money')) return 'Недостатньо монет!'
  if (lower.includes('not found')) return 'Бізнес не знайдено'
  return str || 'Виникла помилка під час виконання операції'
}

function getBizIcon(name?: string) {
  const n = (name || '').toLowerCase()
  if (n.includes('garden') || n.includes('ферма') || n.includes('поле') || n.includes('полуниц')) {
    return '/honeywood/icons/nature/sprout.png'
  }
  if (n.includes('пекарня') || n.includes('хліб') || n.includes('їжа')) {
    return '/honeywood/icons/food/bread.png'
  }
  return '/honeywood/icons/home/chest.png'
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
  statusMessage.value = null
  const rawName = userBiz.business?.name || ''
  collectingName.value = rawName

  try {
    await api.post('/business/collect', { name: rawName })
    playCoinSound()
    statusMessage.value = {
      type: 'success',
      text: `Зібрано: ${formatBizName(rawName)}`
    }
    await userStore.fetchUser()
  } catch (err: any) {
    statusMessage.value = { type: 'error', text: translateError(err) }
  } finally {
    collectingName.value = null
  }
}
</script>

<template>
  <div class="business-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <h2 class="title">Мої бізнеси</h2>

      <Message
          v-if="statusMessage"
          closable
          class="status-msg"
          @close="statusMessage = null"
      >
        <div class="status-content" :class="statusMessage.type">{{ statusMessage.text }}</div>
      </Message>

      <div v-if="isLoading" class="loading-state">
        <Icon icon="pixelarticons:reload" class="spin" />
        <span>Завантаження...</span>
      </div>

      <template v-else>
        <!-- Один Card на весь список: рядки розділені лінією -->
        <Card v-if="myBusinesses.length" width="100%" height="auto" :padding="6">
          <ul class="biz-list">
            <li v-for="biz in myBusinesses" :key="biz.id" class="biz-row">
              <img :src="getBizIcon(biz.business?.name)" class="biz-icon" alt="" />

              <div class="biz-info">
                <span class="biz-name">{{ formatBizName(biz.business?.name) }}</span>
                <span class="biz-meta">
                  {{ countOf(biz) }} шт. · <strong class="yield-val">+{{ yieldOf(biz) }}</strong>
                </span>
                <span v-if="timerMap[biz.id] > 0" class="biz-timer">
                  Збір через {{ formatRemainingTime(timerMap[biz.id]) }}
                </span>
              </div>

              <ButtonText
                  :disabled="timerMap[biz.id] > 0"
                  :loading="collectingName === biz.business?.name"
                  @click="directCollect(biz)"
              >
                {{ timerMap[biz.id] > 0 ? formatRemainingTime(timerMap[biz.id]) : 'Зібрати' }}
              </ButtonText>
            </li>
          </ul>
        </Card>

        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p class="empty-title">У вас ще немає бізнесів</p>
          <p class="empty-subtitle">Придбайте перший у вкладці <strong>Магазин</strong></p>
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

.status-msg { margin-bottom: 10px; }
.status-content { font-size: 18px; line-height: 1.2; }
.status-content.success { color: #1b5e20; }
.status-content.error { color: #b71c1c; }

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
}
.spin { animation: spin 1s linear infinite; font-size: 20px; }
@keyframes spin { to { transform: rotate(360deg); } }

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
  padding: 2px 4px;
}

.biz-row + .biz-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.biz-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
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
