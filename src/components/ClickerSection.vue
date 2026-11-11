<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from "@/services/api.ts"
import { useI18n } from 'vue-i18n'
import { playHarvestSound, playCoinSound, playClickSound } from '@/services/sound'
import { ButtonText, Card, ItemIcon } from '@/components/pixel'
import { useUserStore } from "@/stores/user.ts"
import { useAuthStore } from "@/stores/auth.ts"
import { useToastStore } from "@/stores/toast.ts"
import GiftButton from "./pixel/GiftButton.vue"
import { dpr, snapContain } from '@/services/pixelSnap'

const { t } = useI18n()
const userStore = useUserStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'openDailyRewards'): void
}>()

function handleOpenDaily() {
  playClickSound()
  emit('openDailyRewards')
}

interface FlyingParticle {
  id: number
  startX: number
  startY: number
  dx: number
  dy: number
}

let particleId = 0
const count = ref(0)
const isClicking = ref(false)
const isSelling = ref(false)
const particles = ref<FlyingParticle[]>([])
let pendingClicks = 0

// ── Динаміка ─────────────────────────────────────────────
// Усі зсуви кратні текселю / фізичному пікселю, щоб піксель-арт не розмивався.
const texel = computed(() => snapContain(200, 200, 16, 16, dpr.value).width / 16)
const unitStyle = computed(() => ({
  '--d': `${1 / dpr.value}px`,
  '--t': `${texel.value}px`,
  '--o': `${4 / dpr.value}px`
}))
const snapPx = (v: number) => Math.round(v * dpr.value) / dpr.value

// чергуємо два клас-імені з однаковими keyframes, щоб анімація перезапускалась на кожен клік
const bumpClass = ref<'bump-a' | 'bump-b'>('bump-a')
const badgeClass = computed(() => bumpClass.value.replace('bump', 'badge'))
const flashClass = computed(() => bumpClass.value.replace('bump', 'flash'))
const shakeClass = computed(() => bumpClass.value.replace('bump', 'shake'))

const combo = ref(0)
const tier = computed(() => (combo.value >= 50 ? 3 : combo.value >= 25 ? 2 : combo.value >= 10 ? 1 : 0))
let comboTimer: ReturnType<typeof setTimeout> | null = null

interface Splat { id: number; x: number; y: number; pts: number[][]; color: string; size: number }
const splats = ref<Splat[]>([])
let splatId = 0
const SPLAT_COLORS = ['#e53935', '#ff6b6b', '#b71c1c', '#4caf50', '#fff3c4']

function haptic(kind: 'light' | 'medium' | 'heavy' = 'light') {
  try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(kind) } catch {}
}

function bumpCombo() {
  combo.value++
  if (comboTimer) clearTimeout(comboTimer)
  comboTimer = setTimeout(() => (combo.value = 0), 900)
}

function spawnSplats(x: number, y: number, n: number) {
  const fresh: Splat[] = []
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI * (0.1 + Math.random() * 0.8)
    const dist = 70 + Math.random() * 90
    const pts = [0.25, 0.5, 0.75, 1].map(t => [
      snapPx(Math.cos(ang) * dist * t),
      snapPx(Math.sin(ang) * dist * t + 110 * t * t)
    ])
    fresh.push({
      id: splatId++,
      x: snapPx(x),
      y: snapPx(y),
      pts,
      color: SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)],
      size: [8, 8, 12, 16][Math.floor(Math.random() * 4)]
    })
  }
  splats.value = [...splats.value, ...fresh].slice(-120)
  const ids = new Set(fresh.map(f => f.id))
  setTimeout(() => {
    splats.value = splats.value.filter(sp => !ids.has(sp.id))
  }, 560)
}

function splatStyle(sp: Splat) {
  const st: Record<string, string> = { left: `${sp.x}px`, top: `${sp.y}px`, background: sp.color, '--s': String(sp.size) }
  sp.pts.forEach((pt, i) => {
    st[`--x${i + 1}`] = `${pt[0]}px`
    st[`--y${i + 1}`] = `${pt[1]}px`
  })
  return st
}

const formattedResetTime = ref('00:00:00')
let timerInterval: ReturnType<typeof setInterval> | null = null
let flushInterval: ReturnType<typeof setInterval> | null = null

const maxClicks = computed(() => userStore.maxDailyClicks)
const remainingClicks = computed(() => userStore.remainingDailyClicks)
const isLimitReached = computed(() => remainingClicks.value <= 0)
const usedClicks = computed(() => Math.min(maxClicks.value, Math.max(0, maxClicks.value - remainingClicks.value)))
const progressPercent = computed(() => Math.min(100, (usedClicks.value / maxClicks.value) * 100))

const getTargetResetDate = (): Date => {
  if (userStore.nextClickResetTime) {
    const parsed = new Date(userStore.nextClickResetTime)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }
  const now = new Date()
  const currentHour = now.getHours()
  const nextHour = (Math.floor(currentHour / 6) + 1) * 6
  const target = new Date(now)
  if (nextHour >= 24) {
    target.setDate(target.getDate() + 1)
    target.setHours(0, 0, 0, 0)
  } else {
    target.setHours(nextHour, 0, 0, 0)
  }
  return target
}

const updateTimer = () => {
  const target = getTargetResetDate()
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (diffMs <= 0) {
    formattedResetTime.value = '00:00:00'
    userStore.fetchUser()
    return
  }

  const diffSec = Math.floor(diffMs / 1000)
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  const seconds = diffSec % 60

  const pad = (n: number) => n.toString().padStart(2, '0')
  formattedResetTime.value = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const handleBeforeUnload = () => {
  if (pendingClicks > 0) {
    const body = JSON.stringify({ name: "strawberry", count: pendingClicks })
    const token = authStore.token
    const baseUrl = api.defaults.baseURL || 'https://sapi.memories-app.org'

    fetch(`${baseUrl}/slots/take`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body,
      keepalive: true
    }).catch(() => {})
  }
}

onMounted(async () => {
  localStorage.removeItem("clicker-ban")

  try {
    const response = await api.get('/slots/count', { params: { name: 'strawberry' } })
    count.value = response.data.count ?? 0
  } catch {}

  await userStore.fetchUser()

  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
  flushInterval = setInterval(flushClicks, 2000)

  window.addEventListener("beforeunload", handleBeforeUnload)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (flushInterval) clearInterval(flushInterval)
  if (comboTimer) clearTimeout(comboTimer)
  window.removeEventListener("beforeunload", handleBeforeUnload)
})

const flushClicks = async () => {
  if (pendingClicks === 0) return

  const countToSend = pendingClicks
  try {
    const response = await api.post('/slots/take', { name: 'strawberry', count: countToSend })
    if (typeof response.data === 'object' && response.data !== null) {
      count.value = response.data.count ?? count.value
      if (response.data.remainingDailyClicks !== undefined) {
        userStore.setRemainingClicks(response.data.remainingDailyClicks, response.data.nextClickResetTime)
      }
    } else {
      count.value = response.data
    }
    pendingClicks = Math.max(0, pendingClicks - countToSend)
  } catch (error: any) {
    console.error("Помилка при відправці кліків:", error)
    pendingClicks = 0
    userStore.setRemainingClicks(0)
    await userStore.fetchUser()
    const errText = error.response?.data?.message || error.response?.data || t('clicker.daily_limit_reached')
    const messageStr = typeof errText === 'string' ? errText : JSON.stringify(errText)
    toastStore.showToast(messageStr, 'error')
  }
}

const registerClick = (clientX?: number, clientY?: number) => {
  playHarvestSound()

  userStore.decrementRemainingClicks(1)
  userStore.addStrawberries(1)
  count.value++

  if (userStore.remainingDailyClicks <= 0) {
    flushClicks()
  }

  let startX = clientX ?? 0
  let startY = clientY ?? 0

  if (!clientX || !clientY) {
    const button = document.querySelector('.strawberry-button') as HTMLElement
    if (button) {
      const rect = button.getBoundingClientRect()
      startX = rect.left + rect.width / 2 + (Math.random() * 40 - 20)
      startY = rect.top + rect.height / 2 + (Math.random() * 40 - 20)
    }
  }

  bumpClass.value = bumpClass.value === 'bump-a' ? 'bump-b' : 'bump-a'
  bumpCombo()
  haptic('light')
  spawnSplats(startX, startY, 9 + tier.value * 3)
  if (combo.value === 10 || combo.value === 25 || combo.value === 50) {
    const btn = document.querySelector('.strawberry-button') as HTMLElement | null
    if (btn) {
      const rc = btn.getBoundingClientRect()
      spawnSplats(rc.left + rc.width / 2, rc.top + rc.height / 2, 28)
    }
    haptic('heavy')
  }

  const targetEl = document.querySelector('.toolbar-strawberry-card') || document.querySelector('.toolbar-strawberry-icon')
  let dx = 0
  let dy = -280

  if (targetEl) {
    const targetRect = targetEl.getBoundingClientRect()
    dx = (targetRect.left + targetRect.width / 2) - startX
    dy = (targetRect.top + targetRect.height / 2) - startY
  }

  const currentId = particleId++
  particles.value.push({ id: currentId, startX, startY, dx, dy })

  // Влучання в тулбарний лічильник через 500мс
  setTimeout(() => {
    if (targetEl) {
      targetEl.classList.add('toolbar-strawberry-bump')
      setTimeout(() => targetEl.classList.remove('toolbar-strawberry-bump'), 280)
    }
  }, 500)

  // Видалення частинки
  setTimeout(() => {
    particles.value = particles.value.filter(p => p.id !== currentId)
  }, 620)

  pendingClicks++
  isClicking.value = true
  setTimeout(() => (isClicking.value = false), 150)
}

const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault()
  if (isLimitReached.value) {
    toastStore.showToast(t('clicker.limit_reached_toast', { time: formattedResetTime.value }), 'error')
    return
  }

  const touches = e.changedTouches
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i]
    registerClick(touch.clientX, touch.clientY)
  }
}

const handleClick = (e?: MouseEvent) => {
  if (isLimitReached.value) {
    toastStore.showToast(t('clicker.limit_reached_toast', { time: formattedResetTime.value }), 'error')
    return
  }
  registerClick(e?.clientX, e?.clientY)
}

const sellAllStrawberries = async (e: MouseEvent) => {
  e.stopPropagation()
  isSelling.value = true

  try {
    await flushClicks()
    const res = await api.post('/items/sell-all', { name: 'strawberry' })
    playCoinSound()
    count.value = 0
    const coins = res.data.coinsEarned ?? 0
    toastStore.showToast(t('clicker.sold_success', { coins }), 'success')
    await userStore.fetchUser()
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || t('clicker.no_strawberries_to_sell')
    toastStore.showToast(errorMsg, 'error')
  } finally {
    isSelling.value = false
  }
}
</script>

<template>
  <div class="clicker-container" :style="unitStyle">
    <!-- Ліва колонка кнопок (Clash Royale Style) -->
    <div class="side-actions side-actions--left">
    </div>

    <!-- Права колонка кнопок (Clash Royale Style) -->
    <div class="side-actions side-actions--right">
      <GiftButton
          size="64"
          @click="handleOpenDaily"
      />
    </div>

    <div class="clicker-section">
      <div
          class="click-area"
          :class="[shakeClass, `tier-${tier}`]"
          @touchstart.prevent.stop="handleTouchStart"
          @click="handleClick"
      >
        <div v-if="combo >= 5" class="combo-badge" :class="[badgeClass, `tier-${tier}`]">x{{ combo }}</div>
        <div
            class="strawberry-button"
            :class="[flashClass, { 'strawberry-button--disabled': isLimitReached }]"
            draggable="false"
            oncontextmenu="return false;"
            ondragstart="return false;"
            @contextmenu.prevent
        >
          <div class="berry-wrap" :class="[`tier-${tier}`, { 'berry-wrap--idle': !isLimitReached }]">
            <ItemIcon
                item="strawberry"
                size="200"
                :outline="false"
                alt="Strawberry"
                oncontextmenu="return false;"
                ondragstart="return false;"
                class="strawberry-icon"
                :class="[bumpClass, { 'disabled-icon': isLimitReached }]"
            />
          </div>
          <div v-if="isLimitReached" class="lock-overlay">
            <img src="/ui/lock.png" alt="Locked" draggable="false" class="lock-icon-img" />
          </div>
        </div>
      </div>

      <!-- Летючі частинки полуничок до тулбара -->
      <Teleport to="body">
        <div class="flying-particles-layer" :style="unitStyle">
          <div v-for="sp in splats" :key="sp.id" class="splat" :style="splatStyle(sp)" />
          <div
              v-for="p in particles"
              :key="p.id"
              class="flying-particle"
              :style="{
              left: `${p.startX}px`,
              top: `${p.startY}px`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`
            }"
          >
            <ItemIcon item="strawberry" size="22" class="particle-img" />
            <span class="particle-val">+1</span>
          </div>
        </div>
      </Teleport>

      <Card v-if="isLimitReached" width="100%" height="auto" :padding="10" class="limit-card-wrapper">
        <div class="limit-status-box">
          <div class="limit-alert-banner">
            <img src="/ui/lock.png" alt="Lock" class="limit-alert-icon" />
            <div class="limit-alert-text">
              <span class="alert-title">{{ t('clicker.limit_reached_title') }}</span>
              <span class="alert-timer">{{ t('clicker.limit_resets_in', { time: formattedResetTime }) }}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.clicker-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex-grow: 1;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Колонки кнопок по боках екрана (як у Clash Royale) */
.side-actions {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

.side-actions--left {
  left: 6px;
}

.side-actions--right {
  right: 16px;
}

.clicker-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;
  margin: auto 0;
}

/* Limit Status Box inside Card */
.limit-card-wrapper {
  width: 100%;
  box-sizing: border-box;
}

.limit-status-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--font-pixel), sans-serif;
  color: #3f2e21;
}

.limit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.limit-title {
  font-size: 18px;
  font-weight: normal;
  color: #3f2e21;
}

.limit-badge-max {
  background-color: #c62828;
  color: #ffffff;
  font-family: var(--font-pixel), sans-serif;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #8e0000;
  animation: pulse-max 1.5s infinite;
}

@keyframes pulse-max {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Pixel Progress Frame */
.pixel-progress-frame {
  width: 100%;
  height: 12px;
  background-color: #e8d8c3;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 2px;
  box-sizing: border-box;
  overflow: hidden;
}

.pixel-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #2e7d32);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.pixel-progress-fill.fill-danger {
  background: linear-gradient(90deg, #e53935, #c62828);
}

.limit-timer-sub {
  font-size: 15px;
  color: #5d4037;
  text-align: right;
}

/* Alert Banner when Limit Reached */
.limit-alert-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #ffebee;
  border: 2px solid #c62828;
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 4px;
}

.limit-alert-icon {
  width: 22px;
  height: 22px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.limit-alert-text {
  display: flex;
  flex-direction: column;
}

.alert-title {
  font-size: 16px;
  color: #c62828;
  font-weight: bold;
}

.alert-timer {
  font-size: 15px;
  color: #3f2e21;
}

/* Click Area */
.click-area {
  position: relative;
  display: inline-block;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Без рамки: клікається сама полуниця (padding - запас зони натискання) */
.strawberry-button {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.strawberry-button--disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.strawberry-icon {
  transition: transform 0.1s ease-in-out, filter 0.3s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  user-drag: none;
  pointer-events: none;
  touch-action: manipulation;
}

.disabled-icon {
  filter: grayscale(0.65) opacity(0.7);
}

.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.lock-icon-img {
  width: 56px;
  height: 56px;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}

/* Летючі частинки до тулбару */
.flying-particles-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.flying-particle {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-pixel), sans-serif;
  font-size: 22px;
  font-weight: bold;
  color: #ff6b6b;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  user-select: none;
  pointer-events: none;
  animation: fly-to-target 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  will-change: transform, opacity;
}

/* particle-img: розмір задає ItemIcon */

/* ── Динаміка кліку ───────────────────────────────── */
.berry-wrap {
  display: flex;
  --ring: #ffd54f;
}

/* ідл: плавне погойдування на 8 фізичних пікселів, кожен крок рівно 1 піксель екрана */
.berry-wrap--idle {
  animation: berry-idle 1.8s infinite;
  animation-timing-function: steps(8, end);
}
.berry-wrap--idle.tier-1,
.berry-wrap--idle.tier-2,
.berry-wrap--idle.tier-3 {
  animation-duration: 1s;
}

@keyframes berry-idle {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(calc(var(--d) * -8)); }
  100% { transform: translateY(0); }
}

/* клік: сильний "удар" - втискання, пружний переліт вгору, відскок і спокій.
   Усі кроки по цілому фізичному пікселю. Два імена - щоб анімація перезапускалась на кожен клік */
.strawberry-icon.bump-a { animation: bump-a 0.26s; }
.strawberry-icon.bump-b { animation: bump-b 0.26s; }

@keyframes bump-a {
  0%   { transform: translateY(calc(var(--d) * 24));  animation-timing-function: steps(8, end); }
  35%  { transform: translateY(calc(var(--d) * -16)); animation-timing-function: steps(11, end); }
  65%  { transform: translateY(calc(var(--d) * 6));   animation-timing-function: steps(6, end); }
  100% { transform: translateY(0); }
}
@keyframes bump-b {
  0%   { transform: translateY(calc(var(--d) * 24));  animation-timing-function: steps(8, end); }
  35%  { transform: translateY(calc(var(--d) * -16)); animation-timing-function: steps(11, end); }
  65%  { transform: translateY(calc(var(--d) * 6));   animation-timing-function: steps(6, end); }
  100% { transform: translateY(0); }
}

/* спалах при влучанні (дискретні кадри яскравості) */
.strawberry-button.flash-a { animation: flash-a 0.2s; }
.strawberry-button.flash-b { animation: flash-b 0.2s; }
@keyframes flash-a {
  0%   { filter: brightness(1.9); animation-timing-function: steps(1, end); }
  30%  { filter: brightness(1.45); animation-timing-function: steps(1, end); }
  60%  { filter: brightness(1.15); animation-timing-function: steps(1, end); }
  100% { filter: none; }
}
@keyframes flash-b {
  0%   { filter: brightness(1.9); animation-timing-function: steps(1, end); }
  30%  { filter: brightness(1.45); animation-timing-function: steps(1, end); }
  60%  { filter: brightness(1.15); animation-timing-function: steps(1, end); }
  100% { filter: none; }
}

/* тряска зони кліку; амплітуда росте з комбо (значення парні, щоб при множнику 1.5 лишались цілими) */
.click-area { --k: 1; }
.click-area.tier-1 { --k: 1.5; }
.click-area.tier-2 { --k: 2; }
.click-area.tier-3 { --k: 3; }
.click-area.shake-a { animation: shake-a 0.2s; }
.click-area.shake-b { animation: shake-b 0.2s; }
@keyframes shake-a {
  0%   { transform: translate(calc(var(--d) * 6 * var(--k)), calc(var(--d) * -4 * var(--k))); animation-timing-function: steps(1, end); }
  25%  { transform: translate(calc(var(--d) * -4 * var(--k)), calc(var(--d) * 2 * var(--k))); animation-timing-function: steps(1, end); }
  50%  { transform: translate(calc(var(--d) * 2 * var(--k)), calc(var(--d) * -2 * var(--k))); animation-timing-function: steps(1, end); }
  75%  { transform: translate(calc(var(--d) * -2 * var(--k)), 0); animation-timing-function: steps(1, end); }
  100% { transform: translate(0, 0); }
}
@keyframes shake-b {
  0%   { transform: translate(calc(var(--d) * -6 * var(--k)), calc(var(--d) * -4 * var(--k))); animation-timing-function: steps(1, end); }
  25%  { transform: translate(calc(var(--d) * 4 * var(--k)), calc(var(--d) * 2 * var(--k))); animation-timing-function: steps(1, end); }
  50%  { transform: translate(calc(var(--d) * -2 * var(--k)), calc(var(--d) * -2 * var(--k))); animation-timing-function: steps(1, end); }
  75%  { transform: translate(calc(var(--d) * 2 * var(--k)), 0); animation-timing-function: steps(1, end); }
  100% { transform: translate(0, 0); }
}

/* комбо 25+: чіткий піксельний контур, 50+: мигає */
.berry-wrap.tier-2 .strawberry-icon,
.berry-wrap.tier-3 .strawberry-icon {
  filter:
      drop-shadow(var(--o) 0 0 var(--ring))
      drop-shadow(calc(var(--o) * -1) 0 0 var(--ring))
      drop-shadow(0 var(--o) 0 var(--ring))
      drop-shadow(0 calc(var(--o) * -1) 0 var(--ring));
}
.berry-wrap.tier-3 {
  animation-name: berry-idle, ring-cycle;
  animation-duration: 1s, 0.24s;
  animation-iteration-count: infinite;
  animation-timing-function: steps(8, end), steps(1, end);
}
@keyframes ring-cycle {
  0%   { --ring: #ffd54f; }
  50%  { --ring: #ff6b6b; }
}

/* лічильник комбо */
.combo-badge {
  position: absolute;
  left: 50%;
  top: -34px;
  margin-left: -40px;
  width: 80px;
  text-align: center;
  font-family: var(--font-pixel), sans-serif;
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 2px 2px 0 #333446, -2px -2px 0 #333446, 2px -2px 0 #333446, -2px 2px 0 #333446;
  pointer-events: none;
  z-index: 5;
}
.combo-badge.tier-1 { color: #ffd54f; }
.combo-badge.tier-2 { color: #ff9800; }
.combo-badge.tier-3 { color: #ff6b6b; }
.combo-badge.badge-a { animation: badge-a 0.15s; animation-timing-function: steps(1, end); }
.combo-badge.badge-b { animation: badge-b 0.15s; animation-timing-function: steps(1, end); }
@keyframes badge-a { 0% { transform: translateY(calc(var(--d) * -16)); } 50% { transform: translateY(0); } 100% { transform: translateY(0); } }
@keyframes badge-b { 0% { transform: translateY(calc(var(--d) * -16)); } 50% { transform: translateY(0); } 100% { transform: translateY(0); } }

/* бризки соку: квадрати по 8 фізичних пікселів, 4 кадри по параболі */
.splat {
  position: fixed;
  width: calc(var(--d) * var(--s, 8));
  height: calc(var(--d) * var(--s, 8));
  margin: calc(var(--d) * var(--s, 8) / -2) 0 0 calc(var(--d) * var(--s, 8) / -2);
  pointer-events: none;
  will-change: transform;
  animation: splat 0.48s forwards;
  animation-timing-function: steps(1, end);
}
@keyframes splat {
  0%   { transform: translate(var(--x1), var(--y1)); }
  25%  { transform: translate(var(--x2), var(--y2)); }
  50%  { transform: translate(var(--x3), var(--y3)); }
  75%  { transform: translate(var(--x4), var(--y4)); }
  100% { transform: translate(var(--x4), var(--y4)); }
}

@media (prefers-reduced-motion: reduce) {
  .berry-wrap, .strawberry-icon.bump-a, .strawberry-icon.bump-b, .combo-badge,
  .strawberry-button.flash-a, .strawberry-button.flash-b, .click-area.shake-a, .click-area.shake-b { animation: none !important; }
  .splat { display: none; }
}

.particle-val {
  font-size: 20px;
}

@keyframes fly-to-target {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
  50% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.55), calc(var(--dy) * 0.55 - 20px)) scale(1.2);
  }
  100% {
    opacity: 0.1;
    transform: translate(var(--dx), var(--dy)) scale(0.6);
  }
}
</style>