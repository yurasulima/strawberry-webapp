<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api'
import type { Slot } from '@/types/Slot'
import { CardPrimary, Card, ButtonText, Selected } from '@/components/pixel'
import { playClickSound, playCoinSound } from '@/services/sound'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'

const { t, te } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const selectedSlotId = ref<number | null>(null)
const sellAmount = ref<number>(1)
const isSelling = ref<boolean>(false)

const slots = computed<Slot[]>(() => {
  if (!userStore.user?.slots) return []
  return userStore.user.slots.filter(s => s.count > 0 && s.item?.name)
})

const selectedSlot = computed<Slot | null>(() => {
  if (selectedSlotId.value === null) return null
  return slots.value.find(s => s.id === selectedSlotId.value) || null
})

watch(slots, (newSlots) => {
  if (selectedSlotId.value !== null) {
    const exists = newSlots.some(s => s.id === selectedSlotId.value)
    if (!exists) {
      selectedSlotId.value = null
    }
  }
})

watch(selectedSlot, (slot) => {
  if (slot) {
    sellAmount.value = Math.min(1, slot.count)
  } else {
    sellAmount.value = 1
  }
})

function isMoney(itemName?: string): boolean {
  if (!itemName) return false
  const clean = itemName.toLowerCase().trim()
  return clean === 'money' || clean === 'money_v2'
}

function getItemIcon(itemName?: string): string {
  if (!itemName) return '/ui/strawberry.png'
  const clean = itemName.toLowerCase().trim()
  if (clean === 'strawberry') return '/ui/strawberry.png'
  if (clean === 'money') return '/ui/money.png'
  if (clean === 'money_v2') return '/ui/money_v2.png'
  if (clean === 'strawberry_jam') return '/ui/button_inventory.png'
  if (clean.includes('chest')) return '/ui/button_shop.png'
  return '/ui/strawberry.png'
}

function getItemTitle(itemName?: string): string {
  if (!itemName) return 'Предмет'
  const key = `inventory.items.${itemName.toLowerCase().trim()}`
  if (te(key)) {
    return t(key)
  }
  return itemName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function selectSlot(slot: Slot) {
  playClickSound()
  if (selectedSlotId.value === slot.id) {
    selectedSlotId.value = null
  } else {
    selectedSlotId.value = slot.id
  }
}

function setQuickAmount(amount: number) {
  playClickSound()
  if (!selectedSlot.value) return
  sellAmount.value = Math.min(Math.max(1, amount), selectedSlot.value.count)
}

function setMaxAmount() {
  playClickSound()
  if (!selectedSlot.value) return
  sellAmount.value = selectedSlot.value.count
}

async function handleSell() {
  const slot = selectedSlot.value
  if (!slot || sellAmount.value <= 0 || isMoney(slot.item.name)) return

  playClickSound()
  isSelling.value = true

  const isSellAll = sellAmount.value >= slot.count
  const itemName = slot.item.name
  const countToSell = sellAmount.value

  try {
    let res: any
    if (isSellAll) {
      res = await api.post('/items/sell-all', { name: itemName })
    } else {
      res = await api.post('/items/sell', { name: itemName, amount: countToSell })
    }

    playCoinSound()
    const coinsEarned = res.data?.coinsEarned ?? res.data?.coins ?? 0
    toastStore.showToast(
      t('inventory.sell_success', { count: countToSell, coins: coinsEarned }),
      'success'
    )

    selectedSlotId.value = null
    await userStore.fetchUser()
  } catch (err: any) {
    console.error('Error selling item:', err)
    const errorMsg = err.response?.data?.message || err.response?.data || t('inventory.sell_error')
    const strMsg = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
    toastStore.showToast(strMsg, 'error')
  } finally {
    isSelling.value = false
  }
}

onMounted(() => {
  userStore.fetchUser()
})
</script>

<template>
  <div class="inventory-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <h2 class="title">{{ t('inventory.title') }}</h2>

      <!-- Порожній інвентар -->
      <Card v-if="!slots.length" width="100%" height="auto" :padding="16" class="empty-card">
        <div class="empty-state">
          <img src="/ui/button_inventory.png" class="empty-icon" alt="Empty" />
          <p>{{ t('inventory.empty') }}</p>
        </div>
      </Card>

      <template v-else>
        <!-- Сітка предметів інвентарю з квадратних div -->
        <Card width="100%" height="auto" :padding="10" class="inventory-card">
          <div class="slots-grid">
            <div
              v-for="s in slots"
              :key="s.id"
              class="slot-wrapper"
              @click="selectSlot(s)"
            >
              <Selected
                :active="selectedSlotId === s.id"
                padding="3"
                width="100%"
                height="100%"
              >
                <div class="slot-square">
                  <img :src="getItemIcon(s.item.name)" :alt="s.item.name" class="slot-img" />
                  <span class="slot-count">x{{ s.count }}</span>
                  <span class="slot-name">{{ getItemTitle(s.item.name) }}</span>
                </div>
              </Selected>
            </div>
          </div>
        </Card>

        <!-- Картка продажу для обраного предмета (монети продавати не можна) -->
        <Card
          v-if="selectedSlot && !isMoney(selectedSlot.item.name)"
          width="100%"
          height="auto"
          :padding="12"
          class="detail-card"
        >
          <div class="detail-content">
            <div class="detail-header">
              <div class="detail-icon-wrap">
                <img :src="getItemIcon(selectedSlot.item.name)" :alt="selectedSlot.item.name" class="detail-img" />
              </div>
              <div class="detail-info">
                <span class="detail-title">{{ getItemTitle(selectedSlot.item.name) }}</span>
                <span class="detail-owned">{{ t('inventory.owned', { count: selectedSlot.count }) }}</span>
              </div>
            </div>

            <!-- Контроли кількості для продажу -->
            <div class="sell-controls">
              <span class="control-label">{{ t('inventory.amount_to_sell') }}</span>

              <div class="quick-buttons">
                <button
                  type="button"
                  class="quick-btn"
                  :class="{ active: sellAmount === 1 }"
                  @click="setQuickAmount(1)"
                >1</button>
                <button
                  v-if="selectedSlot.count >= 10"
                  type="button"
                  class="quick-btn"
                  :class="{ active: sellAmount === 10 }"
                  @click="setQuickAmount(10)"
                >10</button>
                <button
                  v-if="selectedSlot.count >= 100"
                  type="button"
                  class="quick-btn"
                  :class="{ active: sellAmount === 100 }"
                  @click="setQuickAmount(100)"
                >100</button>
                <button
                  type="button"
                  class="quick-btn max-btn"
                  :class="{ active: sellAmount === selectedSlot.count }"
                  @click="setMaxAmount()"
                >{{ t('inventory.sell_all') }}</button>
              </div>

              <div class="slider-row">
                <input
                  v-model.number="sellAmount"
                  type="range"
                  min="1"
                  :max="selectedSlot.count"
                  step="1"
                  class="pixel-range"
                />
                <span class="amount-badge">{{ sellAmount }} / {{ selectedSlot.count }}</span>
              </div>

              <!-- Кнопка Продати -->
              <div class="sell-action">
                <ButtonText
                  height="52"
                  padding="10px 24px"
                  :loading="isSelling"
                  @click="handleSell"
                >
                  {{ t('inventory.sell') }} ({{ sellAmount }})
                </ButtonText>
              </div>
            </div>
          </div>
        </Card>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.inventory-container {
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

.empty-card {
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: #3f2e21;
}

.empty-icon {
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
  opacity: 0.7;
}

.inventory-card {
  box-sizing: border-box;
  margin-bottom: 10px;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.slot-wrapper {
  width: 100%;
  aspect-ratio: 1;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
}

.slot-square {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  overflow: hidden;
  transition: background-color 0.1s ease;
}

.slot-square:hover {
  background-color: rgba(0, 0, 0, 0.12);
}

.slot-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
  display: block;
  margin-bottom: 2px;
}

.slot-count {
  font-size: 15px;
  font-weight: bold;
  color: #3f2e21;
  line-height: 1;
}

.slot-name {
  font-size: 13px;
  color: #555;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin-top: 1px;
}

.detail-card {
  margin-top: 10px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-icon-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  flex-shrink: 0;
}

.detail-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  image-rendering: pixelated;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-title {
  font-size: 20px;
  font-weight: bold;
  color: #3f2e21;
}

.detail-owned {
  font-size: 16px;
  color: #666;
}

.sell-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(63, 46, 33, 0.3);
}

.control-label {
  font-size: 16px;
  color: #3f2e21;
}

.quick-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.quick-btn {
  background-color: #e2d3be;
  border: 1px solid #3f2e21;
  color: #3f2e21;
  font-family: inherit;
  font-size: 14px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.05s ease;
}

.quick-btn:hover {
  background-color: #d8c5aa;
}

.quick-btn.active {
  background-color: #5977a3;
  color: #fff;
  border-color: #1b5e20;
}

.max-btn {
  margin-left: auto;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pixel-range {
  flex-grow: 1;
  accent-color: #5977a3;
  cursor: pointer;
}

.amount-badge {
  font-size: 16px;
  font-weight: bold;
  color: #3f2e21;
  min-width: 70px;
  text-align: right;
}

.sell-action {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}
</style>
