<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts";
import type { Business } from "@/types/Business.ts";
import type { UserBusiness } from "@/types/UserBusiness.ts";
import { Icon } from '@iconify/vue'
import { playClickSound, playPurchaseSound, playCoinSound } from "@/services/sound";

const activeTab = ref<'owned' | 'market'>('owned')
const myBusinesses = ref<UserBusiness[]>([])
const businessesForSale = ref<Business[]>([])
const isLoading = ref(true)
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
    return '⏱️ Зачекайте трохи перед наступним збором прибутку!'
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
    const [userRes, marketRes] = await Promise.all([
      api.get('/users/me'),
      api.get<Business[]>('/business')
    ])
    myBusinesses.value = userRes.data.businesses || []
    businessesForSale.value = marketRes.data || []
  } catch (e) {
    console.error('Помилка завантаження бізнесів:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

function switchTab(tab: 'owned' | 'market') {
  playClickSound()
  activeTab.value = tab
}

function promptBuy(biz: Business) {
  playClickSound()
  selectedBizModal.value = {
    rawName: biz.name,
    displayName: formatBizName(biz.name),
    price: biz.price || 100
  }
}

async function executeBuy() {
  if (!selectedBizModal.value) return
  const modal = selectedBizModal.value
  selectedBizModal.value = null
  statusMessage.value = null

  try {
    await api.post('/business/buy', { name: modal.rawName })
    playPurchaseSound()
    statusMessage.value = {
      type: 'success',
      text: `🛒 Успішно придбано бізнес «${modal.displayName}»!`
    }
    await loadData()
  } catch (err: any) {
    statusMessage.value = { type: 'error', text: translateError(err) }
  }
}

async function directCollect(userBiz: UserBusiness) {
  playClickSound()
  statusMessage.value = null
  const rawName = userBiz.business?.name || ''

  try {
    const response = await api.post('/business/collect', { name: rawName })
    playCoinSound()
    const readableName = formatBizName(rawName)
    statusMessage.value = {
      type: 'success',
      text: `💰 Прибуток із бізнесу «${readableName}» успішно зібрано!`
    }
    await loadData()
  } catch (err: any) {
    statusMessage.value = { type: 'error', text: translateError(err) }
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
  <div class="business-container honeywood-panel-paper">
    <div class="business-header">
      <h2>💼 Управління бізнесом</h2>
    </div>

    <!-- Повідомлення про статус операції -->
    <div v-if="statusMessage" class="status-banner" :class="statusMessage.type">
      <span>{{ statusMessage.text }}</span>
      <button class="close-msg" @click="statusMessage = null">✕</button>
    </div>

    <div class="tabs">
      <button
          class="honeywood-btn tab-btn"
          :class="{ active: activeTab === 'owned' }"
          @click="switchTab('owned')">
        <Icon icon="pixelarticons:briefcase" class="tab-icon" />
        <span>Мої бізнеси ({{ myBusinesses.length }})</span>
      </button>
      <button
          class="honeywood-btn tab-btn"
          :class="{ active: activeTab === 'market' }"
          @click="switchTab('market')">
        <Icon icon="pixelarticons:store" class="tab-icon" />
        <span>Магазин</span>
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <Icon icon="pixelarticons:reload" class="loading-icon spin" />
      <span>Завантаження даних...</span>
    </div>

    <template v-else>
      <!-- Власні бізнеси -->
      <div v-if="activeTab === 'owned'" class="business-content">
        <ul v-if="myBusinesses.length" class="business-list">
          <li v-for="biz in myBusinesses" :key="biz.id" class="business-card">
            <img :src="getBizIcon(biz.business?.name)" class="biz-icon" alt="Business Icon" />
            <div class="biz-info">
              <div class="biz-name">{{ formatBizName(biz.business?.name) }}</div>
              <div class="biz-count">Кількість: {{ biz.count || 1 }} шт.</div>
              <div class="biz-yield">
                <span>Прибуток:</span>
                <strong class="yield-val">+{{ (biz.business?.yieldCount || 10) * (biz.count || 1) }} 💰</strong>
              </div>
            </div>
            <!-- Прямий збір прибутку БЕЗ підтвердження -->
            <button class="honeywood-btn action-btn collect-btn" @click="directCollect(biz)">
              Зібрати
            </button>
          </li>
        </ul>
        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p>У вас ще немає бізнесів.<br>Придбайте свій перший бізнес у магазині!</p>
        </div>
      </div>

      <!-- Магазин бізнесів -->
      <div v-if="activeTab === 'market'" class="business-content">
        <ul v-if="businessesForSale.length" class="business-list">
          <li v-for="biz in businessesForSale" :key="biz.id" class="business-card">
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
            <button class="honeywood-btn action-btn buy-btn" @click="promptBuy(biz)">
              Купити
            </button>
          </li>
        </ul>
        <div v-else class="empty-state">
          <Icon icon="pixelarticons:info-box" class="empty-icon" />
          <p>Наразі немає доступних бізнесів у магазині.</p>
        </div>
      </div>
    </template>

    <!-- Модальне вікно підтвердження Купівлі -->
    <div v-if="selectedBizModal" class="modal-overlay" @click.self="selectedBizModal = null">
      <div class="modal-card honeywood-panel">
        <h3 class="modal-title">🛒 Купівля бізнесу</h3>
        <p class="modal-desc">
          Ви впевнені, що хочете придбати <strong>«{{ selectedBizModal.displayName }}»</strong> за <strong>{{ selectedBizModal.price }} 💰</strong>?
        </p>
        <div class="modal-actions">
          <button class="honeywood-btn confirm-btn" @click="executeBuy">Підтвердити</button>
          <button class="honeywood-btn cancel-btn" @click="selectedBizModal = null">Скасувати</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.business-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.business-header h2 {
  font-size: 15px;
  margin: 0 0 16px 0;
  color: #3f2e21;
  text-align: center;
}

.status-banner {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  line-height: 1.4;
}

.status-banner.success {
  background-color: #e8f5e9;
  border: 2px solid #2e7d32;
  color: #1b5e20;
}

.status-banner.error {
  background-color: #ffebee;
  border: 2px solid #c62828;
  color: #b71c1c;
}

.close-msg {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: inherit;
  font-weight: bold;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.tab-btn {
  font-size: 11px;
  padding: 10px 12px;
  flex: 1;
}

.tab-btn.active {
  font-weight: bold;
}

.tab-icon {
  font-size: 16px;
}

.business-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.business-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background-color: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 8px;
  box-shadow: 0 3px 0 #3e2723;
  box-sizing: border-box;
}

.biz-icon {
  width: 36px;
  height: 36px;
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
  font-size: 13px;
  font-weight: bold;
  color: #3f2e21;
}

.biz-count {
  font-size: 12px;
  color: #5d4037;
}

.biz-yield, .biz-price {
  font-size: 12px;
  color: #6b523e;
  display: flex;
  gap: 4px;
  align-items: center;
}

.yield-val {
  color: #2e7d32;
}

.price-val {
  color: #d97706;
}

.action-btn {
  font-size: 11px;
  padding: 8px 12px;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 24px 12px;
  color: #6b523e;
  font-size: 13px;
  line-height: 1.6;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  font-size: 13px;
  color: #3f2e21;
}

.loading-icon.spin {
  animation: spin 1s linear infinite;
  font-size: 20px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 320px;
  padding: 16px;
  box-sizing: border-box;
  text-align: center;
}

.modal-title {
  font-size: 14px;
  margin: 0 0 12px 0;
  color: #3f2e21;
}

.modal-desc {
  font-size: 13px;
  color: #3f2e21;
  line-height: 1.5;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-btn, .cancel-btn {
  font-size: 11px;
  padding: 8px 12px;
  flex: 1;
}
</style>
