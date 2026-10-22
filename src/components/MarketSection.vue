<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts"
import type { Business } from "@/types/Business.ts"
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from "@/services/sound"
import { useUserStore } from "@/stores/user.ts"
import { useToastStore } from "@/stores/toast.ts"

const props = defineProps<{ user?: any }>()
const userStore = useUserStore()
const toastStore = useToastStore()

const businessesForSale = ref<Business[]>([])
const isLoading = ref(true)
const buyingName = ref<string | null>(null)

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
    return 'Зачекайте трохи перед наступною дією!'
  }
  if (lower.includes('not enough money') || lower.includes('no money')) {
    return 'Недостатньо монет!'
  }
  if (lower.includes('not found')) {
    return 'Бізнес не знайдено'
  }
  return str || 'Виникла помилка під час виконання операції'
}

async function loadData() {
  isLoading.value = true
  try {
    const marketRes = await api.get<Business[]>('/business')
    businessesForSale.value = marketRes.data || []
  } catch (e) {
    console.error('Помилка завантаження магазину бізнесів:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

async function directBuy(biz: Business) {
  playClickSound()
  buyingName.value = biz.name
  const displayName = formatBizName(biz.name)

  try {
    await api.post('/business/buy', { name: biz.name })
    playPurchaseSound()
    toastStore.showToast(`Придбано: ${displayName}`, 'success')
    await loadData()
    await userStore.fetchUser()
  } catch (err: any) {
    toastStore.showToast(translateError(err), 'error')
  } finally {
    buyingName.value = null
  }
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
</script>

<template>
  <div class="market-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <h2 class="title">Магазин бізнесів</h2>

      <!-- Стан завантаження -->
      <div v-if="isLoading" class="loading-state">
        <span>Завантаження...</span>
      </div>

      <template v-else>
        <!-- Список доступних бізнесів у єдиній картці -->
        <Card v-if="businessesForSale.length" width="100%" height="auto" :padding="6">
          <ul class="biz-list">
            <li v-for="biz in businessesForSale" :key="biz.id" class="biz-row">
              <img :src="getBizIcon(biz.name)" class="biz-icon" alt="" />

              <div class="biz-info">
                <span class="biz-name">{{ formatBizName(biz.name) }}</span>
                <span class="biz-meta">
                  Ціна: {{ biz.price || 100 }} · <strong class="yield-val">+{{ biz.yieldCount || 10 }}</strong>
                </span>
              </div>

              <ButtonText
                :loading="buyingName === biz.name"
                @click="directBuy(biz)"
              >
                Купити
              </ButtonText>
            </li>
          </ul>
        </Card>

        <!-- Порожній стан -->
        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p class="empty-title">Наразі немає доступних бізнесів</p>
        </div>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.market-container {
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

.yield-val {
  font-weight: normal;
  color: #2e7d32;
}

/* Порожній стан */
.empty-state { text-align: center; padding: 16px 8px; }
.empty-icon { font-size: 32px; color: #5d4037; margin-bottom: 6px; }
.empty-title { margin: 0 0 4px; font-size: 20px; }
</style>
