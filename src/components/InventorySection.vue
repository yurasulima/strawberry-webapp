<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api'
import type { Slot } from '@/types/Slot'
import { CardPrimary, Card, ButtonText, Selected, ItemIcon, SlideFade } from '@/components/pixel'
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
  delay: number
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

function getItemTitle(itemName?: string): string {
  if (!itemName) return 'Предмет'
  const key = `inventory.items.${itemName.toLowerCase().trim()}`
  if (te(key)) {
    return t(key)
  }
  return itemName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getItemUnitPrice(itemName?: string): number {
  if (!itemName) return 1
  const clean = itemName.toLowerCase().trim()
  if (clean === 'strawberry') return 1
  if (clean === 'strawberry_juice') return 5
  if (clean === 'blueberry') return 3
  if (clean === 'water') return 2
  return 1
}

const totalCoinsEarned = computed(() => {
  if (!selectedSlot.value) return 0
  return sellAmount.value * getItemUnitPrice(selectedSlot.value.item.name)
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
  if (!selectedSlot.value) return
  playClickSound()
  const next = sellAmount.value + delta
  sellAmount.value = Math.max(1, Math.min(selectedSlot.value.count, next))
}

function clampAmount() {
  if (!selectedSlot.value) return
  if (!sellAmount.value || isNaN(sellAmount.value) || sellAmount.value < 1) {
    sellAmount.value = 1
  } else if (sellAmount.value > selectedSlot.value.count) {
    sellAmount.value = selectedSlot.value.count
  }
}

function setPreset(percent: number) {
  if (!selectedSlot.value) return
  playClickSound()
  sellAmount.value = Math.max(1, Math.min(selectedSlot.value.count, Math.ceil(selectedSlot.value.count * percent)))
}

function setMaxAmount() {
  playClickSound()
  if (!selectedSlot.value) return
  sellAmount.value = selectedSlot.value.count
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

  const coinCount = Math.max(0, Math.min(coinsEarned, 8))

  for (let i = 0; i < coinCount; i++) {
    const id = coinParticleId++
    const offsetX = (Math.random() - 0.5) * 36
    const offsetY = (Math.random() - 0.5) * 18
    const delay = i * 55

    flyingCoins.value.push({
      id,
      startX: startX + offsetX,
      startY: startY + offsetY,
      dx: dx - offsetX,
      dy: dy - offsetY,
      delay
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
    const coinsEarned = res.data?.coinsEarned ?? res.data?.coins ?? totalCoinsEarned.value
    spawnFlyingCoins(coinsEarned, e)

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
        <!-- Сітка предметів інвентарю z квадратних div -->
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

        <!-- Анімована картка продажу для обраного предмета -->
        <SlideFade>
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
                  <ItemIcon :item="selectedSlot.item.name" size="36" />
                </div>
                <div class="detail-info">
                  <span class="detail-title">{{ getItemTitle(selectedSlot.item.name) }}</span>
                  <span class="detail-owned">{{ t('inventory.owned', { count: selectedSlot.count }) }}</span>
                  <span class="detail-price">Ціна: <strong>{{ getItemUnitPrice(selectedSlot.item.name) }}</strong></span>
                </div>
              </div>

              <!-- Зручні контроли кількості для продажу -->
              <div class="sell-controls">

                <!-- Покрокові кнопки та поля інпуту -->
                <div class="stepper-row">
                  <div class="step-group">
                    <button
                      v-if="selectedSlot.count >= 100"
                      type="button"
                      class="step-btn"
                      @click="adjustAmount(-100)"
                    >-100</button>
                    <button
                      v-if="selectedSlot.count >= 10"
                      type="button"
                      class="step-btn"
                      @click="adjustAmount(-10)"
                    >-10</button>
                    <button
                      type="button"
                      class="step-btn"
                      @click="adjustAmount(-1)"
                    >-1</button>
                  </div>

                  <div class="step-group">
                    <button
                      type="button"
                      class="step-btn"
                      @click="adjustAmount(1)"
                    >+1</button>
                    <button
                      v-if="selectedSlot.count >= 10"
                      type="button"
                      class="step-btn"
                      @click="adjustAmount(10)"
                    >+10</button>
                    <button
                      v-if="selectedSlot.count >= 100"
                      type="button"
                      class="step-btn"
                      @click="adjustAmount(100)"
                    >+100</button>
                  </div>
                </div>

                <!-- Кнопка Продати -->
                <div class="sell-action">
                  <ButtonText
                    :loading="isSelling"
                    @click="handleSell"
                  >
                    {{ t('inventory.sell') }} {{ sellAmount }} шт. (+{{ totalCoinsEarned }})
                  </ButtonText>
                </div>
              </div>
            </div>
          </Card>
        </SlideFade>

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
                '--delay': `${c.delay}ms`
              }"
            >
              <img src="/items/money.png" class="coin-img" alt="" />
            </div>
          </div>
        </Teleport>
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

/* Slide-Fade Анімація появи панелі продажу */
.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-fade-leave-active {
  transition: all 0.18s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
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

.detail-price {
  font-size: 14px;
  color: #5d4037;
  margin-top: 2px;
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

/* Новий рядок з покроковими кнопками та інпутом */
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
  font-family: 'Crumbline', sans-serif;
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

.max-btn {
  background-color: #d97706;
  color: #fff;
  border-color: #b45309;
}

.max-btn:hover {
  background-color: #b45309;
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
  justify-content: center;
  user-select: none;
  pointer-events: none;
  animation: fly-coin 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  animation-delay: var(--delay);
  opacity: 0;
  will-change: transform, opacity;
}

.coin-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

@keyframes fly-coin {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.55), calc(var(--dy) * 0.55 - 25px)) scale(1.2) rotate(180deg);
  }
  100% {
    opacity: 0.1;
    transform: translate(var(--dx), var(--dy)) scale(0.6) rotate(360deg);
  }
}
</style>
