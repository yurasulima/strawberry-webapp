<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts"
import type { Business } from "@/types/Business.ts"
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, Message, PixelModal, ButtonText } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from "@/services/sound"

const props = defineProps<{ user?: any }>()

const businessesForSale = ref<Business[]>([])
const isLoading = ref(true)
const isExecutingBuy = ref(false)
const isModalOpen = ref(false)
const statusMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const selectedBizModal = ref<{ rawName: string; displayName: string; price?: number } | null>(null)

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
    return '⏱️ Зачекайте трохи перед наступною дією!'
  }
  if (lower.includes('not enough money') || lower.includes('no money')) {
    return '🪙 Недостатньо монет для купівлі!'
  }
  if (lower.includes('not found')) {
    return '❌ Бізнес не знайдено'
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

function promptBuy(biz: Business) {
  playClickSound()
  selectedBizModal.value = {
    rawName: biz.name,
    displayName: formatBizName(biz.name),
    price: biz.price || 100
  }
  isModalOpen.value = true
}

async function executeBuy() {
  if (!selectedBizModal.value) return
  const modal = selectedBizModal.value
  isExecutingBuy.value = true
  statusMessage.value = null

  try {
    await api.post('/business/buy', { name: modal.rawName })
    playPurchaseSound()
    statusMessage.value = {
      type: 'success',
      text: `🛒 Успішно придбано бізнес «${modal.displayName}»!`
    }
    isModalOpen.value = false
    selectedBizModal.value = null
    await loadData()
  } catch (err: any) {
    statusMessage.value = { type: 'error', text: translateError(err) }
    isModalOpen.value = false
  } finally {
    isExecutingBuy.value = false
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
    <CardPrimary width="100%" height="auto" :padding="16">
      <div class="market-header">
        <h2 class="title">🛒 Магазин бізнесів</h2>
      </div>

      <!-- Повідомлення про статус операції -->
      <Message
        v-if="statusMessage"
        closable
        class="status-msg"
        @close="statusMessage = null"
      >
        <div class="status-content" :class="statusMessage.type">
          {{ statusMessage.text }}
        </div>
      </Message>

      <!-- Стан завантаження -->
      <div v-if="isLoading" class="loading-state">
        <Icon icon="pixelarticons:reload" class="loading-icon spin" />
        <span>Завантаження магазину...</span>
      </div>

      <template v-else>
        <!-- Список доступних бізнесів -->
        <div v-if="businessesForSale.length" class="market-list">
          <Card
            v-for="biz in businessesForSale"
            :key="biz.id"
            width="100%"
            height="auto"
            :padding="12"
            class="market-card-wrapper"
          >
            <div class="market-card-content">
              <img :src="getBizIcon(biz.name)" class="biz-icon" alt="Business Icon" />
              <div class="biz-info">
                <div class="biz-name">{{ formatBizName(biz.name) }}</div>
                <div class="biz-yield">
                  <span>Базовий прибуток:</span>
                  <strong class="yield-val">+{{ biz.yieldCount || 10 }} 💰</strong>
                </div>
                <div class="biz-price">
                  <span>Ціна:</span>
                  <strong class="price-val">{{ biz.price || 100 }} 💰</strong>
                </div>
              </div>
              <ButtonText
                height="64"
                padding="12px 20px"
                @click="promptBuy(biz)"
              >
                Купити
              </ButtonText>
            </div>
          </Card>
        </div>

        <!-- Порожній стан -->
        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p class="empty-title">Наразі немає доступних бізнесів у магазині.</p>
        </div>
      </template>

      <!-- Піксельне модальне вікно підтвердження -->
      <PixelModal
        v-model="isModalOpen"
        title="🛒 Купівля бізнесу"
        :width="350"
      >
        <div class="modal-body-content">
          <p class="modal-desc">
            Ви впевнені, що хочете придбати <strong>«{{ selectedBizModal?.displayName }}»</strong> за <strong>{{ selectedBizModal?.price }} 💰</strong>?
          </p>
        </div>
        <template #footer>
          <ButtonText
            height="64"
            padding="12px 24px"
            :loading="isExecutingBuy"
            @click="executeBuy"
          >
            Підтвердити
          </ButtonText>
          <ButtonText
            height="64"
            padding="12px 24px"
            @click="isModalOpen = false"
          >
            Скасувати
          </ButtonText>
        </template>
      </PixelModal>
    </CardPrimary>
  </div>
</template>

<style scoped>
.market-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: 'Monocraft', monospace;
}

.market-header {
  text-align: center;
  margin-bottom: 16px;
}

.title {
  font-family: 'Monocraft', monospace;
  font-size: 18px;
  margin: 0;
  color: #3f2e21;
}

.status-msg {
  margin-bottom: 14px;
}

.status-content {
  font-family: 'Monocraft', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.status-content.success {
  color: #1b5e20;
}

.status-content.error {
  color: #b71c1c;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  font-family: 'Monocraft', monospace;
  font-size: 14px;
  color: #3f2e21;
}

.loading-icon.spin {
  animation: spin 1s linear infinite;
  font-size: 22px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.market-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.market-card-wrapper {
  box-sizing: border-box;
}

.market-card-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.biz-icon {
  width: 42px;
  height: 42px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.biz-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.biz-name {
  font-family: 'Monocraft', monospace;
  font-size: 15px;
  font-weight: bold;
  color: #3f2e21;
}

.biz-yield, .biz-price {
  font-family: 'Monocraft', monospace;
  font-size: 13px;
  color: #5d4037;
  display: flex;
  gap: 4px;
  align-items: center;
}

.yield-val {
  color: #2e7d32;
  font-weight: bold;
}

.price-val {
  color: #d97706;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 24px 12px;
  color: #3f2e21;
  font-family: 'Monocraft', monospace;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
  color: #5d4037;
}

.empty-title {
  font-family: 'Monocraft', monospace;
  font-size: 15px;
  margin: 0;
}

.modal-body-content {
  padding: 10px 0;
}

.modal-desc {
  font-family: 'Monocraft', monospace;
  font-size: 15px;
  color: #3f2e21;
  line-height: 1.5;
  margin: 0;
  text-align: center;
}
</style>
