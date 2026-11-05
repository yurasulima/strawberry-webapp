<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import type { UserBusiness } from '@/types/UserBusiness.ts'
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText, SlideFade, ItemIcon, PixelModal } from '@/components/pixel'
import { playClickSound, playCoinSound } from '@/services/sound'
import { useUserStore } from '@/stores/user.ts'
import { useToastStore } from '@/stores/toast.ts'
import { formatBizName as formatBizNameUtil, translateError as translateErrorUtil } from '@/utils/business'
import InfoButton from "@/components/pixel/InfoButton.vue"
import FlatCard from "@/components/pixel/FlatCard.vue";

const props = defineProps<{ user?: any }>()
const { t, te } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const myBusinesses = computed<UserBusiness[]>(() => userStore.user?.businesses || [])
const isLoading = computed(() => !userStore.user && userStore.isLoading)

const showGuideModal = ref(false)
const collectingName = ref<string | null>(null)
const wateringName = ref<string | null>(null)
const isRefreshing = ref(false)

const waterCount = computed(() => {
  const slots = userStore.user?.slots || []
  const slot = slots.find(s => s.item?.name?.toLowerCase() === 'water')
  return slot?.count || 0
})

function isWaterableBiz(userBiz: UserBusiness): boolean {
  return Boolean((userBiz.business as any)?.waterable)
}

async function refreshUser() {
  playClickSound()
  isRefreshing.value = true
  try {
    await userStore.fetchUser()
  } catch (err) {
    console.error('Error refreshing user:', err)
  } finally {
    isRefreshing.value = false
  }
}

const timerMap = ref<Record<number, number>>({})
let timerInterval: any = null

function formatBizName(rawName?: string): string {
  return formatBizNameUtil(rawName, t, te)
}

function translateError(err: any): string {
  const raw = err.response?.data?.message || err.response?.data || err.message || ''
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw)
  const lower = str.toLowerCase()

  if (lower.includes('wait') || lower.includes('have to wait') || lower.includes('collecting exception')) {
    return t('clicker.daily_limit_reached')
  }
  return translateErrorUtil(err, t)
}

const countOf = (biz: UserBusiness) => biz.count || 1
const yieldOf = (biz: UserBusiness) => (biz.business?.yieldCount || 10) * countOf(biz)

function getBizItemName(biz: UserBusiness): string {
  if (biz.business?.item && typeof biz.business.item === 'object' && (biz.business.item as any).name) {
    return (biz.business.item as any).name
  }
  if (typeof (biz.business as any)?.item === 'string') {
    return (biz.business as any).item
  }
  return 'strawberry'
}

const sortedMyBusinesses = computed(() => {
  const list = [...myBusinesses.value]
  return list.sort((a, b) => {
    const yieldTotalA = yieldOf(a)
    const yieldTotalB = yieldOf(b)
    if (yieldTotalA !== yieldTotalB) return yieldTotalB - yieldTotalA

    const priceA = (a.business as any)?.price ?? 0
    const priceB = (b.business as any)?.price ?? 0
    if (priceA !== priceB) return priceB - priceA

    const yieldBaseA = a.business?.yieldCount ?? 0
    const yieldBaseB = b.business?.yieldCount ?? 0
    if (yieldBaseA !== yieldBaseB) return yieldBaseB - yieldBaseA

    return b.id - a.id
  })
})

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

interface FlyingItemParticle {
  id: number
  item: string
  startX: number
  startY: number
  dx: number
  dy: number
  delay: number
}

const flyingItems = ref<FlyingItemParticle[]>([])
let itemParticleId = 0

function spawnFlyingItems(itemName: string, e?: MouseEvent) {
  const targetEl = document.querySelector('.nav-inventory-btn') || document.querySelector('.bottom-navigation-bar')

  let startX = window.innerWidth / 2
  let startY = window.innerHeight / 2

  if (e && e.clientX && e.clientY) {
    startX = e.clientX
    startY = e.clientY
  } else {
    const collectingBtn = document.querySelector('.biz-row .button-text-container') as HTMLElement
    if (collectingBtn) {
      const rect = collectingBtn.getBoundingClientRect()
      startX = rect.left + rect.width / 2
      startY = rect.top + rect.height / 2
    }
  }

  let dx = 0
  let dy = 300

  if (targetEl) {
    const targetRect = targetEl.getBoundingClientRect()
    dx = (targetRect.left + targetRect.width / 2) - startX
    dy = (targetRect.top + targetRect.height / 2) - startY
  }

  const particleCount = 4

  for (let i = 0; i < particleCount; i++) {
    const id = itemParticleId++
    const offsetX = (Math.random() - 0.5) * 36
    const offsetY = (Math.random() - 0.5) * 18
    const delay = i * 65

    flyingItems.value.push({
      id,
      item: itemName,
      startX: startX + offsetX,
      startY: startY + offsetY,
      dx: dx - offsetX,
      dy: dy - offsetY,
      delay
    })

    setTimeout(() => {
      if (targetEl) {
        targetEl.classList.add('nav-inventory-bump')
        setTimeout(() => targetEl.classList.remove('nav-inventory-bump'), 280)
      }
    }, 500 + delay)

    setTimeout(() => {
      flyingItems.value = flyingItems.value.filter(item => item.id !== id)
    }, 650 + delay)
  }
}

async function directCollect(userBiz: UserBusiness, e?: MouseEvent) {
  if (timerMap.value[userBiz.id] > 0) return

  playClickSound()
  const rawName = userBiz.business?.name || ''
  const itemName = userBiz.business?.item?.name || (userBiz.business as any)?.item || 'strawberry'
  collectingName.value = rawName

  try {
    await api.post('/business/collect', { name: rawName })
    playCoinSound()
    spawnFlyingItems(itemName, e)
    toastStore.showToast(t('business.collected_success', { name: formatBizName(rawName) }), 'success')
    await userStore.fetchUser()
  } catch (err: any) {
    toastStore.showToast(translateError(err), 'error')
  } finally {
    collectingName.value = null
  }
}

async function directWater(userBiz: UserBusiness) {
  const rawName = userBiz.business?.name || ''
  if (waterCount.value < 20) {
    toastStore.showToast(t('business.not_enough_water'), 'error')
    return
  }
  if (timerMap.value[userBiz.id] <= 0) {
    return
  }

  playClickSound()
  wateringName.value = rawName

  try {
    await api.post('/business/water', { name: rawName })
    toastStore.showToast(t('business.watered_success', { name: formatBizName(rawName) }), 'success')
    await userStore.fetchUser()
  } catch (err: any) {
    toastStore.showToast(translateError(err), 'error')
  } finally {
    wateringName.value = null
  }
}
</script>

<template>
  <div class="business-container">
    <CardPrimary width="100%" height="auto" :padding="12">

      <div class="title-row">
        <h2 class="title">{{ t('business.title') }}</h2>
        <InfoButton @click="showGuideModal = true" />
      </div>

      <div v-if="isLoading" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <template v-else>
        <!-- Один Card на весь список з анімацією SlideFade -->
        <SlideFade>
          <Card v-if="sortedMyBusinesses.length" width="100%" height="auto" :padding="6">
            <ul class="biz-list">
              <li v-for="biz in sortedMyBusinesses" :key="biz.id" class="biz-row">
                <div class="biz-info">
                  <span class="biz-name">
                    {{ formatBizName(biz.business?.name) }}
                    <span v-if="biz.accumulatedYield && biz.maxAccumulatedYield && biz.accumulatedYield >= biz.maxAccumulatedYield" class="tag-max">MAX (7d)</span>
                    <span>[{{ countOf(biz) }} {{ t('business.count_pcs') }}]</span>
                  </span>

                  <div class="biz-meta">
                    <strong class="yield-val">
                      Прибуток: {{ yieldOf(biz) }}
                      <ItemIcon :item="getBizItemName(biz)" size="16" />
                    </strong>
                  </div>
                </div>

                <div class="biz-actions">
                  <ButtonText
                    v-if="isWaterableBiz(biz) && timerMap[biz.id] > 0"
                    width="42px"
                    padding="0 2px"
                    class="biz-water-btn"
                    :disabled="waterCount < 20 || wateringName === biz.business?.name"
                    :loading="wateringName === biz.business?.name"
                    @click="directWater(biz)"
                  >
                    💧
                  </ButtonText>

                  <ButtonText
                    width="100px"
                    padding="0 4px"
                    class="biz-collect-btn"
                    :disabled="timerMap[biz.id] > 0"
                    :loading="collectingName === biz.business?.name"
                    @click="directCollect(biz, $event)"
                  >
                    {{ timerMap[biz.id] > 1 ? formatRemainingTime(timerMap[biz.id]) : (biz.accumulatedYield && biz.accumulatedYield > yieldOf(biz) ? `+${biz.accumulatedYield}` : t('business.collect')) }}
                  </ButtonText>
                </div>
              </li>
            </ul>
          </Card>

          <div v-else class="empty-state">
            <Icon icon="pixelarticons:info-box" class="empty-icon" />
            <p class="empty-title">{{ t('business.empty_businesses') }}</p>
            <p class="empty-subtitle">{{ t('business.buy_first_in_shop') }}</p>
            <div class="empty-action">
              <ButtonText :loading="isRefreshing" @click="refreshUser">
                {{ t('players.refresh') }}
              </ButtonText>
            </div>
          </div>
        </SlideFade>

        <!-- Летючі предмети до кнопки інвентаря -->
        <Teleport to="body">
          <div class="flying-items-layer">
            <div
              v-for="p in flyingItems"
              :key="p.id"
              class="flying-item"
              :style="{
                left: `${p.startX}px`,
                top: `${p.startY}px`,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--delay': `${p.delay}ms`
              }"
            >
              <ItemIcon :item="p.item" size="28" />
            </div>
          </div>
        </Teleport>

        <!-- Модальне вікно з гайдом по бізнесах -->
        <PixelModal v-model="showGuideModal" title="Гайд по бізнесах">
          <div class="biz-guide-content">
            <FlatCard height="100%" width="100%">
              <p>🌾 <strong>Рослинні бізнеси:</strong> Грядки, сади, ферми, гаї можна поливати!</p>
              <p>💧 <strong>Полив:</strong> Коштує <strong>20 💧 Води</strong> і зменшує час до наступного збору на <strong>2 години</strong>.</p>
              <p>🏭 <strong>Промислові будівлі:</strong> Фабрики та варильні збираються за графіком і не потребують поливу.</p>
            </FlatCard>
          </div>
        </PixelModal>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.business-container {
  padding: 16px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: var(--font-pixel), sans-serif;
  font-size: 18px;
  line-height: 1.1;
  color: #3f2e21;
}

.title-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.title {
  margin: 0;
  text-align: left;
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
  justify-content: space-between;
  gap: 8px;
  min-height: 64px;
  padding: 6px 4px;
}

.biz-row + .biz-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.biz-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}

.biz-name {
  font-size: 17px;
  line-height: 1.15;
  color: #3f2e21;
  word-break: break-word;
  overflow-wrap: break-word;
}

.biz-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.biz-water-btn {
  flex-shrink: 0;
  width: 42px;
}

.biz-collect-btn {
  flex-shrink: 0;
  width: 100px;
}

.tag-max {
  font-family: var(--font-pixel), sans-serif;
  font-size: 9px;
  background-color: #d97706;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

.biz-meta {
  font-size: 15px;
  color: #5d4037;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
}

.acc-val {
  color: #2e7d32;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.biz-timer {
  font-size: 14px;
  color: #b71c1c;
}

.yield-val {
  font-weight: normal;
  color: #2e7d32;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* Порожній стан */
.empty-state { text-align: center; padding: 16px 8px; }
.empty-icon { font-size: 32px; color: #5d4037; margin-bottom: 6px; }
.empty-title { margin: 0 0 4px; font-size: 20px; }
.empty-subtitle { margin: 0; font-size: 16px; color: #5d4037; }
.empty-action { margin-top: 12px; display: flex; justify-content: center; }

/* Гайд модалка */
.biz-guide-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: var(--font-pixel), sans-serif;
  font-size: 15px;
  color: #3f2e21;
}

.guide-intro {
  margin: 0;
  line-height: 1.3;
}

.guide-placeholder-card {
  background: #fff8eb;
  border: 2px dashed #5d4037;
  border-radius: 6px;
  padding: 10px;
  font-size: 14px;
  color: #7c624d;
}

/* Летючі предмети до кнопки інвентарю */
.flying-items-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.flying-item {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  pointer-events: none;
  animation: fly-to-inventory 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  animation-delay: var(--delay);
  opacity: 0;
  will-change: transform, opacity;
}

@keyframes fly-to-inventory {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.55), calc(var(--dy) * 0.55 + 20px)) scale(1.2) rotate(180deg);
  }
  100% {
    opacity: 0.1;
    transform: translate(var(--dx), var(--dy)) scale(0.6) rotate(360deg);
  }
}
</style>
