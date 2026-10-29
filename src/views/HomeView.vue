<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWebApp } from "vue-tg"
import { useAuthStore } from "@/stores/auth.ts"
import { useUserStore } from "@/stores/user.ts"
import { useToastStore } from "@/stores/toast.ts"
import { playPluckSound, playItemGetSound, playSuccessSound, playSnapSound } from "@/services/sound.ts"
import Toolbar from "@/components/Toolbar.vue"
import PlayersSection from '@/components/PlayersSection.vue'
import ClickerSection from '@/components/ClickerSection.vue'
import InventorySection from '@/components/InventorySection.vue'
import DebugSection from '@/components/DebugSection.vue'
import BottomNavigation, { type TabType } from '@/components/BottomNavigation.vue'
import BussinesSection from "@/components/BussinesSection.vue"
import MarketSection from "@/components/MarketSection.vue"
import SettingsSection from "@/components/SettingsSection.vue"
import AdminNavigation, { type AdminTabType } from '@/components/admin/AdminNavigation.vue'
import AdminTelemetrySection from '@/components/admin/AdminTelemetrySection.vue'
import AdminChatsSection from '@/components/admin/AdminChatsSection.vue'
import AdminBusinessesSection from '@/components/admin/AdminBusinessesSection.vue'
import AdminItemsSection from '@/components/admin/AdminItemsSection.vue'
import AdminUsersSection from '@/components/admin/AdminUsersSection.vue'
import DailyRewardsModal from "@/components/DailyRewardsModal.vue"
import WebLoginModal from "@/components/WebLoginModal.vue"
import ProfileModal from "@/components/ProfileModal.vue"
import {Image, PixelToastContainer} from "@/components/pixel"
import api from "@/services/api.ts"

const { t } = useI18n()
const isLoading = ref(true)
const showDailyRewards = ref(false)
const showWebLogin = ref(false)
const showProfileModal = ref(false)
const userStore = useUserStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { initDataUnsafe } = useWebApp()

// 33% шанс, що павучок тримає цукерку при вході в гру
const hasCandy = ref(false)
const tugCount = ref(0) // Лічильник дьоргань павутинки (до 5)

const isRealTelegramWebApp = computed(() => {
  if (typeof window === 'undefined') return false
  const tg = (window as any).Telegram?.WebApp
  return !!(tg && tg.initData && typeof tg.initData === 'string' && tg.initData.trim().length > 0)
})

const tgUser = computed(() => {
  return isRealTelegramWebApp.value ? initDataUnsafe?.user : null
})

const user = computed(() => {
  if (tgUser.value) {
    return tgUser.value
  }
  return {
    id: userStore.user?.telegramId || 1,
    first_name: userStore.user?.firstName || "Гравець",
    last_name: userStore.user?.lastName || "",
    username: userStore.user?.username || "player",
    language_code: userStore.user?.lang || null,
    photo_url: userStore.user?.photoUrl || "https://api.dangerous.pp.ua/image/null.png"
  }
})

const activeTab = ref<TabType>('clicker')
const isAdminMode = computed(() => activeTab.value.startsWith('admin'))

watch(activeTab, () => {
  if (authStore.token) {
    userStore.fetchUser()
  }
})

async function handleWebLoginSuccess() {
  showWebLogin.value = false
  await userStore.fetchUser()
  if (userStore.canClaimDaily) {
    showDailyRewards.value = true
  }
}

async function collectCandy() {
  if (!hasCandy.value) return
  hasCandy.value = false

  userStore.addItemToSlot('candy', 1)
  playItemGetSound()
  playSuccessSound()
  toastStore.showToast('Ви забрали цукерку у павучка!', 'success')

  try {
    await api.post('/slots/take', { name: 'candy', count: 1 })
  } catch (err) {
    console.warn('Error syncing candy with API:', err)
  }
}

onMounted(async () => {
  // 33% шанс роз розіграшу цукерки при вході гравця в гру
  hasCandy.value = Math.random() < 0.33

  if (isRealTelegramWebApp.value && tgUser.value) {
    try {
      const response = await api.post('/auth/telegram', {
        telegram_id: tgUser.value.id,
        photo_url: tgUser.value.photo_url,
        last_name: tgUser.value.last_name,
        first_name: tgUser.value.first_name,
        username: tgUser.value.username,
        language_code: tgUser.value.language_code,
        inviter_telegram_id: initDataUnsafe.start_param,
      })
      if (tgUser.value.language_code) {
        localStorage.setItem('lang', tgUser.value.language_code)
      }

      if (response.status === 200) {
        authStore.login(response.data)
        userStore.setUser(response.data)
        if (userStore.canClaimDaily) {
          showDailyRewards.value = true
        }
      }
    } catch (error) {
      console.error('Telegram WebApp auth error:', error)
    } finally {
      isLoading.value = false
    }
  } else if (authStore.token) {
    try {
      const res = await userStore.fetchUser()
      if (!res) {
        authStore.logout()
        showWebLogin.value = true
      } else if (userStore.canClaimDaily) {
        showDailyRewards.value = true
      }
    } catch (e) {
      console.error('Token invalid or expired, showing web login:', e)
      authStore.logout()
      showWebLogin.value = true
    } finally {
      isLoading.value = false
    }
  } else {
    showWebLogin.value = true
    isLoading.value = false
  }
})

/* ============================================================
 *  Фізика павучка: маятник + пружна павутинка + 5 дьоргань = обрив
 * ============================================================ */

const spiderPivot = ref<HTMLElement | null>(null)
const spiderEl = ref<HTMLElement | null>(null)
const threadEl = ref<HTMLElement | null>(null)

// Стан маятника (кут у радіанах; 0 = висить вертикально, + = за годинниковою)
let angle = 0.12
let angVel = 0
let yOff = 0       // розтягування/стиснення пружини-павутинки
let yVel = 0
let tiltTarget = 0 // куди "тягне гравітація" згідно з нахилом телефону

const isBroken = ref(false)
const isRespawning = ref(false)

// Параметри фізики
const GRAVITY_K = 14       // жорсткість маятника
const DAMPING = 0.9        // тертя маятника об повітря
const SPRING_K = 180       // пружність резинки-нитки
const Y_DAMPING = 5.5      // затухання коливань нитки
const TILT_GAIN = 1.0      // вплив нахилу
const MAX_TILT = 0.9       // макс. кут нахилу, рад (~52°)
const SHAKE_GAIN = 0.35    // реакція на різкі рухи телефону
const MAX_ANGLE = 1.45     // фізичний ліміт відхилення (~83°)

let rafId = 0
let lastT = 0
let idleTime = 0

// drag
let dragging = false
let dragPointerId = -1
let lastDragAngle = 0
let lastDragYOff = 0
let lastDragT = 0

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function applyTransform() {
  if (isBroken.value) {
    if (threadEl.value) {
      threadEl.value.style.height = '15px'
      threadEl.value.style.opacity = '0.3'
    }
    if (spiderEl.value) {
      spiderEl.value.style.transform = `translateY(${yOff.toFixed(1)}px) rotate(${angle.toFixed(4)}rad)`
    }
  } else {
    const currentLen = Math.max(30, 150 + yOff)
    const stretchFactor = yOff / 150
    const width = clamp(4 - stretchFactor * 1.5, 2, 8)

    if (threadEl.value) {
      threadEl.value.style.height = `${currentLen.toFixed(1)}px`
      threadEl.value.style.width = `${width.toFixed(1)}px`
      threadEl.value.style.opacity = '1'
    }
    if (spiderEl.value) {
      spiderEl.value.style.transform = `rotate(${angle.toFixed(4)}rad)`
    }
  }
}

function snapWeb() {
  if (isBroken.value) return
  isBroken.value = true
  dragging = false

  playSnapSound()

  if (hasCandy.value) {
    collectCandy()
  }

  // Сила запуску вгору прямо пропорційна величині відтягування (yOff)
  const launchSpeed = -1300 - Math.max(0, yOff) * 6
  yVel = clamp(launchSpeed, -2200, -1000)
  angVel = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 10)
}

function respawnSpider() {
  yOff = -280
  yVel = 350
  angle = 0.05
  angVel = 0
  tugCount.value = 0
  isBroken.value = false
  isRespawning.value = false

  hasCandy.value = Math.random() < 0.33
}

function step(now: number) {
  rafId = requestAnimationFrame(step)
  if (!lastT) lastT = now
  let dt = (now - lastT) / 1000
  lastT = now
  dt = Math.min(dt, 0.05)
  if (dt <= 0) return

  idleTime += dt

  if (isBroken.value) {
    // Політ вгору після обриву
    yOff += yVel * dt
    yVel += 500 * dt
    angle += angVel * dt
    angVel *= 0.985

    if (yOff < -650 && !isRespawning.value) {
      isRespawning.value = true
      setTimeout(respawnSpider, 1200)
    }
  } else if (!dragging) {
    const sub = 4
    const h = dt / sub
    for (let i = 0; i < sub; i++) {
      const idle = Math.sin(idleTime * 1.3) * 0.25 + Math.sin(idleTime * 0.7 + 1.2) * 0.15
      const acc =
          -GRAVITY_K * Math.sin(angle - tiltTarget * TILT_GAIN) -
          DAMPING * angVel +
          idle
      angVel += acc * h
      angle += angVel * h

      if (angle > MAX_ANGLE) { angle = MAX_ANGLE; angVel *= -0.4 }
      if (angle < -MAX_ANGLE) { angle = -MAX_ANGLE; angVel *= -0.4 }

      // Пружна резинка Гука
      const yAcc = -SPRING_K * yOff - Y_DAMPING * yVel
      yVel += yAcc * h
      yOff += yVel * h
    }
  }

  applyTransform()
}

/* ---------- Нахил телефону ---------- */

function setTiltFromGammaRad(gammaRad: number) {
  tiltTarget = clamp(-gammaRad, -MAX_TILT, MAX_TILT)
}

function onDeviceOrientation(e: DeviceOrientationEvent) {
  if (e.gamma == null) return
  let gamma = (e.gamma * Math.PI) / 180
  const rot = (screen.orientation?.angle ?? 0)
  if (rot === 90) gamma = (((e.beta ?? 0) * Math.PI) / 180) * -1
  else if (rot === 270 || rot === -90) gamma = ((e.beta ?? 0) * Math.PI) / 180
  setTiltFromGammaRad(gamma)
}

function onDeviceMotion(e: DeviceMotionEvent) {
  const a = e.acceleration
  if (!a || a.x == null || a.y == null) return
  angVel += clamp(a.x, -25, 25) * SHAKE_GAIN * 0.1
  yVel += clamp(a.y ?? 0, -25, 25) * 6
}

function onTgOrientation() {
  const tg = (window as any).Telegram?.WebApp
  const o = tg?.DeviceOrientation
  if (o && typeof o.gamma === 'number') {
    setTiltFromGammaRad(o.gamma)
  }
}

let sensorsStarted = false

async function startSensors() {
  if (sensorsStarted) return
  sensorsStarted = true

  try {
    const DOE: any = (window as any).DeviceOrientationEvent
    if (DOE && typeof DOE.requestPermission === 'function') {
      const res = await DOE.requestPermission()
      if (res !== 'granted') return
    }
    const DME: any = (window as any).DeviceMotionEvent
    if (DME && typeof DME.requestPermission === 'function') {
      await DME.requestPermission().catch(() => {})
    }
  } catch (err) {
    console.warn('Sensor permission error:', err)
  }

  window.addEventListener('deviceorientation', onDeviceOrientation)
  window.addEventListener('devicemotion', onDeviceMotion)

  const tg = (window as any).Telegram?.WebApp
  if (tg?.DeviceOrientation?.start) {
    try {
      tg.onEvent('deviceOrientationChanged', onTgOrientation)
      tg.DeviceOrientation.start({ refresh_rate: 60, need_absolute: false })
    } catch (err) {
      console.warn('Telegram DeviceOrientation error:', err)
    }
  }
}

/* ---------- Дьоргання та розтягування павутинки пальцем ---------- */

function pointerPos(e: PointerEvent) {
  const p = spiderPivot.value?.getBoundingClientRect()
  if (!p) return { a: 0, y: 0 }
  const dx = e.clientX - p.left
  const dy = e.clientY - p.top
  const dist = Math.sqrt(dx * dx + dy * dy)
  const y = clamp(dist - 150, -110, 150)
  const a = clamp(Math.atan2(-dx, Math.max(dy, 15)), -MAX_ANGLE, MAX_ANGLE)
  return { a, y }
}

function onSpiderDown(e: PointerEvent) {
  if (isBroken.value) return
  dragging = true
  dragPointerId = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  angVel = 0
  yVel = 0
  const { a, y } = pointerPos(e)
  angle = a
  yOff = y
  lastDragAngle = a
  lastDragYOff = y
  lastDragT = performance.now()
  e.preventDefault()
}

function onSpiderMove(e: PointerEvent) {
  if (!dragging || e.pointerId !== dragPointerId) return
  if (isBroken.value) return

  const now = performance.now()
  const { a, y } = pointerPos(e)

  const dt = (now - lastDragT) / 1000
  if (dt > 0) {
    const vA = (a - lastDragAngle) / dt
    const vY = (y - lastDragYOff) / dt
    angVel = angVel * 0.4 + clamp(vA, -20, 20) * 0.6
    yVel = yVel * 0.4 + clamp(vY, -600, 600) * 0.6
  }
  angle = a
  yOff = y
  lastDragAngle = a
  lastDragYOff = y
  lastDragT = now
}

function onSpiderUp(e: PointerEvent) {
  if (!dragging || e.pointerId !== dragPointerId) return
  dragging = false
  if (isBroken.value) return

  const pulledDist = Math.max(Math.abs(yOff), Math.abs(lastDragYOff))

  // Рахуємо дьоргання при відчутному натягу (> 12px)
  if (pulledDist > 12) {
    tugCount.value++

    // На 5-й раз павутинка рветься!
    if (tugCount.value >= 5) {
      snapWeb()
      return
    }
  }

  const dt = performance.now() - lastDragT
  if (dt > 80) {
    angVel *= 0.2
    yVel *= 0.2
  } else {
    if (pulledDist > 5) {
      // Фізика: сила пружного відскоку прямо пропорційна величині відтягування (yOff)
      yVel += clamp(-yOff * 5.0, -480, 480)
    }
  }
  playPluckSound()
}

function onFirstGesture() {
  startSensors()
}

onMounted(() => {
  lastT = 0
  rafId = requestAnimationFrame(step)

  const DOE: any = (window as any).DeviceOrientationEvent
  if (!(DOE && typeof DOE.requestPermission === 'function')) {
    startSensors()
  }
  window.addEventListener('pointerdown', onFirstGesture, { once: true })
  window.addEventListener('touchend', onFirstGesture, { once: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('deviceorientation', onDeviceOrientation)
  window.removeEventListener('devicemotion', onDeviceMotion)
  window.removeEventListener('pointerdown', onFirstGesture)
  window.removeEventListener('touchend', onFirstGesture)
  const tg = (window as any).Telegram?.WebApp
  try {
    tg?.offEvent?.('deviceOrientationChanged', onTgOrientation)
    tg?.DeviceOrientation?.stop?.()
  } catch { /* ignore */ }
})
</script>

<template>
  <div class="app-container">
    <div class="card__web-wrap">
      <Image src="/ui/web.png" size="200" class="card__web" alt="Web" />
      <div ref="spiderPivot" class="card__spider-pivot">
        <div ref="spiderEl" class="card__spider-assembly">
          <div
              ref="threadEl"
              class="card__spider-thread"
              title="Дьорнути павутинку"
              @pointerdown="onSpiderDown"
              @pointermove="onSpiderMove"
              @pointerup="onSpiderUp"
              @pointercancel="onSpiderUp"
          ></div>
          <div class="card__spider-body-wrap">
            <img
                src="/ui/spider.png"
                class="card__spider-img"
                alt="Spider"
                draggable="false"
                @pointerdown="onSpiderDown"
                @pointermove="onSpiderMove"
                @pointerup="onSpiderUp"
                @pointercancel="onSpiderUp"
            />
            <div
                v-if="hasCandy"
                class="card__spider-candy-wrap"
                title="Забрати цукерку"
                @click.stop="collectCandy"
                @pointerdown.stop
            >
              <img src="/items/candy.png" class="card__spider-candy" alt="Candy" />
              <span class="candy-sparkle">✦</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PixelToastContainer />

    <!-- Модальне вікно входу для вебу -->
    <WebLoginModal v-if="showWebLogin" @success="handleWebLoginSuccess" />

    <!-- Показуємо splash, поки isLoading -->
    <div v-if="isLoading" class="splash-screen">
      <div class="loader">{{ t('loading') }}</div>
    </div>

    <!-- Основний контент показуємо, якщо не завантажуємо -->
    <template v-else>
      <Toolbar
          v-if="!isAdminMode"
          :language_code="user.language_code"
          :firstName="user.first_name"
          :lastName="user.last_name"
          :avatar="user.photo_url"
          :money="userStore.money"
          :strawberry="userStore.strawberries"
          @openSettings="activeTab = activeTab === 'settings' ? 'clicker' : 'settings'"
          @openDailyRewards="showDailyRewards = true"
          @openProfile="showProfileModal = true"
      />

      <DailyRewardsModal v-model="showDailyRewards" />
      <ProfileModal v-model="showProfileModal" />

      <div class="main-content" :class="{ 'main-content--admin': isAdminMode }">
        <ClickerSection v-show="activeTab === 'clicker'" />
        <InventorySection v-show="activeTab === 'inventory'" />
        <BussinesSection v-show="activeTab === 'business'" :user="user" />
        <MarketSection v-show="activeTab === 'shop'" :user="user" />
        <PlayersSection v-show="activeTab === 'users'" />
        <SettingsSection v-show="activeTab === 'settings'" @close="activeTab = 'clicker'" />
        <template v-if="userStore.user?.admin">
          <AdminTelemetrySection v-if="activeTab === 'admin-telemetry'" />
          <AdminChatsSection v-if="activeTab === 'admin-chats'" />
          <AdminBusinessesSection v-if="activeTab === 'admin-businesses'" />
          <AdminItemsSection v-if="activeTab === 'admin-items'" />
          <AdminUsersSection v-if="activeTab === 'admin-users'" />
        </template>
        <DebugSection v-show="activeTab === 'debug'" />
      </div>

      <AdminNavigation
          v-if="isAdminMode"
          class="bott"
          :activeTab="activeTab"
          @changeTab="activeTab = $event"
          @exit="activeTab = 'clicker'"
      />
      <BottomNavigation v-else class="bott" :activeTab="activeTab" @changeTab="activeTab = $event" />
    </template>
  </div>
</template>

<style scoped>
.app-container {
  background-image: url("/new_background.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  max-width: 420px;
  margin: 0 auto;
  min-height: 100vh;
  color: #EAEFEF;
  font-family: "Pixel", "Segoe UI", sans-serif;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.card__web-wrap {
  position: absolute;
  top: 0;
  left: -5px;
  z-index: 10;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.card__web {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

/* Точка кріплення нитки до павутини */
.card__spider-pivot {
  position: absolute;
  top: 164px;
  left: 45px;
  width: 0;
  height: 0;
  pointer-events: none;
}

.card__spider-assembly {
  position: absolute;
  top: 0;
  left: -32px;
  width: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;

  transform-origin: top center;
  will-change: transform;
}

.card__spider-thread {
  width: 4px;
  height: 150px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(220, 235, 255, 0.75) 100%);
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.8), 1px 0 0 rgba(0, 0, 0, 0.25);
  border-radius: 2px;
  transform-origin: top center;
  transition: opacity 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

.card__spider-thread:active {
  cursor: grabbing;
}

.card__spider-body-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card__spider-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  image-rendering: pixelated;
  margin-top: -10px;

  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

.card__spider-img:active {
  cursor: grabbing;
}

.card__spider-candy-wrap {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  z-index: 10;
  animation: candy-bounce 1.1s ease-in-out infinite alternate;
}

.card__spider-candy {
  width: 28px;
  height: 28px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
  transition: transform 0.15s ease;
}

.card__spider-candy-wrap:hover .card__spider-candy {
  transform: scale(1.15);
}

.candy-sparkle {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 11px;
  color: #fff200;
  text-shadow: 0 0 3px #ffa200;
  pointer-events: none;
  animation: sparkle-pulse 0.7s ease-in-out infinite alternate;
}

@keyframes candy-bounce {
  0% { transform: translateX(-50%) translateY(0) scale(1); }
  100% { transform: translateX(-50%) translateY(4px) scale(1.1); }
}

@keyframes sparkle-pulse {
  0% { opacity: 0.4; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.4); }
}

.app-container::before {
  content: "";
  position: absolute;
  inset: 0;
  backdrop-filter: blur(1px);
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 0;
}

.main-content {
  z-index: 1;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 70px;
}
.main-content--admin {
  justify-content: flex-start;
  padding-top: 8px;
  padding-bottom: 110px;
}
.bott {
  z-index: 1;
}
.splash-screen {
  position: fixed;
  inset: 0;
  background-color: #222;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  z-index: 2000;
}

.loader {
}
</style>