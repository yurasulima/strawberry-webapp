<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api'
import type { Slot } from '@/types/Slot'
import { CardPrimary, Card, ButtonText, Selected, ItemIcon } from '@/components/pixel'
import { playClickSound, playCoinSound } from '@/services/sound'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'

const { t, te } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

interface FlyingCoin {
  id: number
  startX: number
  startY: number
  dx: number
  dy: number
  arcX: number
  arcY: number
  delay: number
  val: number
}

const selectedSlotId = ref<number | null>(null)
const sellAmount = ref<number>(1)
const isSelling = ref<boolean>(false)
const flyingCoins = ref<FlyingCoin[]>([])
let coinParticleId = 0

const slots = computed<Slot[]>(() => {
  if (!userStore.user?.slots) return []
  return userStore.user.slots.filter(s => s.count > 0 && s.item?.name)
})

const selectedSlot = computed<Slot | null>(() => {
  if (selectedSlotId.value === null) return null
  return slots.value.find(s => s.id === selectedSlotId.value) || null
})

// Утримуємо слот для збереження DOM під час анімації згортання (320мс)
const displaySlot = ref<Slot | null>(null)

watch(selectedSlot, (newVal) => {
  if (newVal && !isMoney(newVal.item.name)) {
    displaySlot.value = newVal
  } else {
    setTimeout(() => {
      if (!selectedSlot.value) {
        displaySlot.value = null
      }
    }, 320)
  }
}, { immediate: true })

watch(slots, (newSlots) => {
  if (selectedSlotId.value !== null) {
    const exists = newSlots.some(s => s.id === selectedSlotId.value)
    if (!exists) {
      selectedSlotId.value = null
    }
  }
})

// Скидаємо кількість в 1 тільки коли користувач обрав ІНШИЙ предмет
watch(selectedSlotId, () => {
  sellAmount.value = 1
})

// Якщо дані оновились з сервера - лише підрізаємо значення, а не скидаємо
watch(
    () => selectedSlot.value?.count,
    (count) => {
      if (count === undefined) return
      if (sellAmount.value > count) sellAmount.value = count
      if (sellAmount.value < 1) sellAmount.value = 1
    }
)

function isMoney(itemName?: string): boolean {
  if (!itemName) return false
  const clean = itemName.toLowerCase().trim()
  return clean === 'money' || clean === 'money_v2'
}

function getItemTitle(itemName?: string): string {
  if (!itemName) return 'Предмет'
  const key = `inventory.items.${itemName.toLowerCase().trim()}`
  if (te(key)) {
    return t(key)
  }
  return itemName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getItemUnitPrice(itemName?: string): number {
  const slot = selectedSlot.value || displaySlot.value
  if (slot?.item?.sellPrice !== undefined && slot?.item?.sellPrice !== null) {
    return slot.item.sellPrice
  }
  return 1
}

const totalCoinsEarned = computed(() => {
  const slot = selectedSlot.value || displaySlot.value
  if (!slot) return 0
  return sellAmount.value * getItemUnitPrice(slot.item.name)
})

function selectSlot(slot: Slot) {
  playClickSound()
  if (selectedSlotId.value === slot.id) {
    selectedSlotId.value = null
  } else {
    selectedSlotId.value = slot.id
  }
}

function adjustAmount(delta: number) {
  const slot = selectedSlot.value || displaySlot.value
  if (!slot) return
  playClickSound()
  const next = sellAmount.value + delta
  sellAmount.value = Math.max(1, Math.min(slot.count, next))
}

function setMaxAmount() {
  const slot = selectedSlot.value || displaySlot.value
  if (!slot) return
  playClickSound()
  sellAmount.value = slot.count
}

function calculateCoinCount(coins: number): number {
  if (coins <= 0) return 0
  if (coins === 1) return 1
  if (coins <= 5) return coins
  if (coins <= 20) return 5 + Math.floor((coins - 5) / 3)
  if (coins <= 100) return 10 + Math.floor((coins - 20) / 16)
  if (coins <= 500) return 15 + Math.floor((coins - 100) / 80)
  return 20 + Math.min(10, Math.floor((coins - 500) / 500))
}

function spawnFlyingCoins(coinsEarned: number, e?: MouseEvent) {
  const targetEl = document.querySelector('.toolbar-money-card') || document.querySelector('.toolbar-money-icon')
  const btnEl = document.querySelector('.sell-action') as HTMLElement

  let startX = 0
  let startY = 0

  if (e && e.clientX && e.clientY) {
    startX = e.clientX
    startY = e.clientY
  } else if (btnEl) {
    const rect = btnEl.getBoundingClientRect()
    startX = rect.left + rect.width / 2
    startY = rect.top + rect.height / 2
  } else {
    startX = window.innerWidth / 2
    startY = window.innerHeight / 2
  }

  let dx = 0
  let dy = -300

  if (targetEl) {
    const targetRect = targetEl.getBoundingClientRect()
    dx = (targetRect.left + targetRect.width / 2) - startX
    dy = (targetRect.top + targetRect.height / 2) - startY
  }

  const coinCount = calculateCoinCount(coinsEarned)
  if (coinCount <= 0) return

  const baseVal = Math.floor(coinsEarned / coinCount)
  const remainder = coinsEarned % coinCount

  for (let i = 0; i < coinCount; i++) {
    const id = coinParticleId++
    const offsetX = (Math.random() - 0.5) * 110
    const offsetY = (Math.random() - 0.5) * 50
    const arcX = (Math.random() - 0.5) * 60
    const arcY = (Math.random() - 0.5) * 35
    const delay = i * 38
    const val = baseVal + (i < remainder ? 1 : 0)

    flyingCoins.value.push({
      id,
      startX: startX + offsetX,
      startY: startY + offsetY,
      dx: dx - offsetX,
      dy: dy - offsetY,
      arcX,
      arcY,
      delay,
      val
    })

    setTimeout(() => {
      if (targetEl) {
        targetEl.classList.add('toolbar-money-bump')
        setTimeout(() => targetEl.classList.remove('toolbar-money-bump'), 280)
      }
    }, 500 + delay)

    setTimeout(() => {
      flyingCoins.value = flyingCoins.value.filter(c => c.id !== id)
    }, 650 + delay)
  }
}

async function handleSell(e?: MouseEvent) {
  const slot = selectedSlot.value || displaySlot.value
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
    const coinsEarned = res.data?.coinsEarned ?? res.data?.coins ?? totalCoinsEarned.value
    spawnFlyingCoins(coinsEarned, e)

    toastStore.showToast(
        t('inventory.sell_success', { count: countToSell, coins: coinsEarned }),
        'success'
    )

    await userStore.fetchUser()

    // Якщо предмети даного типу закінчилися — знімаємо виділення та закриваємо панельку
    const remainingSlot = slots.value.find(s => s.id === slot.id)
    if (!remainingSlot || remainingSlot.count <= 0) {
      selectedSlotId.value = null
    } else {
      // Якщо предмета ще декілька — залишаємо панельку відкритою та підганяємо кількість для наступного продажу
      sellAmount.value = Math.max(1, Math.min(remainingSlot.count, sellAmount.value))
    }
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
                  <ItemIcon :item="s.item.name" size="44" class="slot-img" />
                  <span class="slot-count">x{{ s.count }}</span>
                  <span class="slot-name">{{ getItemTitle(s.item.name) }}</span>
                </div>
              </Selected>
            </div>
          </div>
        </Card>

        <!-- Анімована картка продажу для обраного предмета з плавною зміною висоти -->
        <div class="detail-wrapper" :class="{ 'is-expanded': selectedSlot && !isMoney(selectedSlot.item.name) }">
          <div class="detail-inner">
            <Card
                v-if="displaySlot"
                width="100%"
                height="auto"
                :padding="12"
                class="detail-card"
            >
              <div class="detail-content">
                <div class="detail-header">
                  <div class="detail-icon-wrap">
                    <ItemIcon :item="displaySlot.item.name" size="36" />
                  </div>
                  <div class="detail-info">
                    <span class="detail-title">{{ getItemTitle(displaySlot.item.name) }}</span>
                    <span class="detail-owned">{{ t('inventory.owned', { count: displaySlot.count }) }}</span>
                    <div class="detail-price-row">
                      <span>Ціна:</span>
                      <strong>{{ getItemUnitPrice(displaySlot.item.name) }}</strong>
                      <ItemIcon item="money" size="18" />
                    </div>
                  </div>
                </div>

                <!-- Зручні контроли кількості для продажу -->
                <div class="sell-controls">

                  <!-- Покрокові кнопки + кнопка ALL посередині -->
                  <div class="stepper-row">
                    <div class="step-group">
                      <button
                          v-if="displaySlot.count >= 100"
                          type="button"
                          class="step-btn"
                          @click="adjustAmount(-100)"
                      >-100</button>

                      <button
                          type="button"
                          class="step-btn"
                          @click="adjustAmount(-1)"
                      >-1</button>
                    </div>

                    <button
                        type="button"
                        class="step-btn"
                        @click="setMaxAmount"
                    >ВСЕ</button>

                    <div class="step-group">
                      <button
                          type="button"
                          class="step-btn"
                          @click="adjustAmount(1)"
                      >+1</button>

                      <button
                          v-if="displaySlot.count >= 100"
                          type="button"
                          class="step-btn"
                          @click="adjustAmount(100)"
                      >+100</button>
                    </div>
                  </div>

                  <!-- Кнопка Продати -->
                  <div class="sell-action">
                    <ButtonText
                        width="100%"
                        :loading="isSelling"
                        @click="handleSell"
                    >
                      <span class="btn-sell-content">
                        {{ t('inventory.sell') }} {{ sellAmount }} шт. (+{{ totalCoinsEarned }}
                        <ItemIcon item="money" size="20" />)
                      </span>
                    </ButtonText>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <!-- Летючі монетки до тулбару -->
        <Teleport to="body">
          <div class="flying-coins-layer">
            <div
                v-for="c in flyingCoins"
                :key="c.id"
                class="flying-coin"
                :style="{
                left: `${c.startX}px`,
                top: `${c.startY}px`,
                '--dx': `${c.dx}px`,
                '--dy': `${c.dy}px`,
                '--arc-x': `${c.arcX}px`,
                '--arc-y': `${c.arcY}px`,
                '--delay': `${c.delay}ms`
              }"
            >
              <img src="/items/money.png" class="coin-img" alt="" />
              <span class="coin-val">+{{ c.val }}</span>
            </div>
          </div>
        </Teleport>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.inventory-container {
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

/* Плавне розгортання/згортання висоти картки продажу без телепортацій макету */
.detail-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transition: grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.32s cubic-bezier(0.4, 0, 0.2, 1),
              margin-top 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  margin-top: 0;
}

.detail-wrapper.is-expanded {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
  margin-top: 10px;
}

.detail-inner {
  overflow: hidden;
  min-height: 0;
}

.detail-card {
  margin-top: 0;
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
  font-size: 15px;
  color: #666;
}

.detail-price-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  color: #5d4037;
  margin-top: 2px;
}

.btn-sell-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sell-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(63, 46, 33, 0.3);
}

.price-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  background: #fff8eb;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #5d4037;
}

.text-gold {
  color: #d97706;
}

.control-label {
  font-size: 15px;
  font-weight: bold;
  color: #3f2e21;
}

/* Рядок з покроковими кнопками та кнопкою ALL посередині */
.stepper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

.step-group {
  display: flex;
  gap: 4px;
}

.step-btn {
  background-color: #e2d3be;
  border: 1px solid #5d4037;
  color: #3f2e21;
  font-family: inherit;
  font-size: 13px;
  font-weight: bold;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.1s ease;
  min-width: 32px;
}

.step-btn:hover {
  background-color: #d2c0a8;
}

.step-btn:active {
  transform: scale(0.94);
  background-color: #c4b096;
}

.input-wrap {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 90px;
}

.pixel-num-input {
  width: 100%;
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 4px 6px;
  font-family: var(--font-pixel), sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: #3f2e21;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}

.pixel-num-input:focus {
  border-color: #2e7d32;
}

/* Відсоткові пресети */
.quick-presets {
  display: flex;
  gap: 6px;
  width: 100%;
}

.preset-btn {
  flex: 1;
  background-color: #e2d3be;
  border: 1px solid #5d4037;
  color: #3f2e21;
  font-family: inherit;
  font-size: 13px;
  font-weight: bold;
  padding: 5px 0;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  text-align: center;
  transition: all 0.1s ease;
}

.preset-btn:hover {
  background-color: #d2c0a8;
}

.preset-btn.active {
  background-color: #4f8b55;
  color: #fff;
  border-color: #2e7d32;
}

/* Кнопка ALL */
.max-btn {
  background-color: #d97706;
  color: #fff;
  border-color: #b45309;
}

.max-btn:hover {
  background-color: #b45309;
}

.max-btn:active {
  background-color: #92400e;
}

.sell-action {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

/* Летючі монети до тулбару */
.flying-coins-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.flying-coin {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 3px;
  user-select: none;
  pointer-events: none;
  animation: fly-coin 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  animation-delay: var(--delay);
  opacity: 0;
  will-change: transform, opacity;
}

.coin-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.coin-val {
  font-family: var(--font-pixel), sans-serif;
  font-size: 20px;
  font-weight: bold;
  color: #ffca28;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  white-space: nowrap;
}

@keyframes fly-coin {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.6);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3);
  }
  55% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.55 + var(--arc-x)), calc(var(--dy) * 0.55 - 30px + var(--arc-y))) scale(1.2);
  }
  100% {
    opacity: 0.1;
    transform: translate(var(--dx), var(--dy)) scale(0.6);
  }
}
</style>
