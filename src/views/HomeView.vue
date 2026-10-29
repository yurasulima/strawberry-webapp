<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWebApp } from "vue-tg"
import { useAuthStore } from "@/stores/auth.ts"
import { useUserStore } from "@/stores/user.ts"
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
const { initDataUnsafe } = useWebApp()

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

onMounted(async () => {
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
 *  Фізика павучка: маятник + інерція + нахил телефону + drag
 * ============================================================ */

const spiderPivot = ref<HTMLElement | null>(null)
const spiderEl = ref<HTMLElement | null>(null)

// Стан маятника (кут у радіанах; 0 = висить вертикально, + = за годинниковою)
let angle = 0.12
let angVel = 0
let yOff = 0       // вертикальне "підстрибування" на нитці
let yVel = 0
let tiltTarget = 0 // куди "тягне гравітація" згідно з нахилом телефону

// Параметри (можна підкрутити під смак)
const GRAVITY_K = 14       // жорсткість маятника (більше = швидше хитається)
const DAMPING = 0.9        // тертя об повітря
const TILT_GAIN = 1.0      // наскільки сильно нахил впливає на павука
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
let lastDragT = 0

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function applyTransform() {
  if (!spiderEl.value) return
  spiderEl.value.style.transform = `translateY(${yOff.toFixed(2)}px) rotate(${angle.toFixed(4)}rad)`
}

function step(now: number) {
  rafId = requestAnimationFrame(step)
  if (!lastT) lastT = now
  let dt = (now - lastT) / 1000
  lastT = now
  dt = Math.min(dt, 0.05) // захист від стрибків після паузи/вкладки у фоні
  if (dt <= 0) return

  idleTime += dt

  if (!dragging) {
    // кілька підкроків для стабільності
    const sub = 3
    const h = dt / sub
    for (let i = 0; i < sub; i++) {
      // ледь помітне "дихання", щоб павук не завмирав зовсім
      const idle = Math.sin(idleTime * 1.3) * 0.25 + Math.sin(idleTime * 0.7 + 1.2) * 0.15
      const acc =
          -GRAVITY_K * Math.sin(angle - tiltTarget * TILT_GAIN) -
          DAMPING * angVel +
          idle
      angVel += acc * h
      angle += angVel * h

      // м'який відскок від ліміту
      if (angle > MAX_ANGLE) { angle = MAX_ANGLE; angVel *= -0.4 }
      if (angle < -MAX_ANGLE) { angle = -MAX_ANGLE; angVel *= -0.4 }

      // вертикальна пружина (нитка-резинка)
      const yAcc = -40 * yOff - 5 * yVel
      yVel += yAcc * h
      yOff += yVel * h
    }
  } else {
    yOff *= 0.9
    yVel = 0
  }

  applyTransform()
}

/* ---------- Нахил телефону ---------- */

function setTiltFromGammaRad(gammaRad: number) {
  // Правий бік телефону вниз (gamma > 0) -> гравітація тягне вправо ->
  // павук відхиляється вправо = проти годинникової = від'ємний кут
  tiltTarget = clamp(-gammaRad, -MAX_TILT, MAX_TILT)
}

function onDeviceOrientation(e: DeviceOrientationEvent) {
  if (e.gamma == null) return
  let gamma = (e.gamma * Math.PI) / 180
  // враховуємо поворот екрана (на випадок landscape)
  const rot = (screen.orientation?.angle ?? 0)
  if (rot === 90) gamma = (((e.beta ?? 0) * Math.PI) / 180) * -1
  else if (rot === 270 || rot === -90) gamma = ((e.beta ?? 0) * Math.PI) / 180
  setTiltFromGammaRad(gamma)
}

function onDeviceMotion(e: DeviceMotionEvent) {
  const a = e.acceleration // без гравітації
  if (!a || a.x == null || a.y == null) return
  // Телефон різко їде вправо -> павук "відстає" вліво = за годинниковою (+)
  angVel += clamp(a.x, -25, 25) * SHAKE_GAIN * 0.1
  // Вертикальний струс -> підстрибування на нитці
  yVel += clamp(a.y ?? 0, -25, 25) * 6
}

// Telegram Mini App API (Bot API 8.0+)
function onTgOrientation() {
  const tg = (window as any).Telegram?.WebApp
  const o = tg?.DeviceOrientation
  if (o && typeof o.gamma === 'number') {
    setTiltFromGammaRad(o.gamma) // Telegram віддає радіани
  }
}

let sensorsStarted = false

async function startSensors() {
  if (sensorsStarted) return
  sensorsStarted = true

  // iOS 13+ вимагає дозвіл, який можна запитати тільки з жесту користувача
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

  // Telegram-датчики (якщо клієнт підтримує)
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

/* ---------- Перетягування павучка пальцем ---------- */

function pointerAngle(e: PointerEvent) {
  const p = spiderPivot.value?.getBoundingClientRect()
  if (!p) return 0
  const dx = e.clientX - p.left
  const dy = e.clientY - p.top
  return clamp(Math.atan2(-dx, Math.max(dy, 20)), -MAX_ANGLE, MAX_ANGLE)
}

function onSpiderDown(e: PointerEvent) {
  dragging = true
  dragPointerId = e.pointerId
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  angVel = 0
  lastDragAngle = angle
  lastDragT = performance.now()
  e.preventDefault()
}

function onSpiderMove(e: PointerEvent) {
  if (!dragging || e.pointerId !== dragPointerId) return
  const now = performance.now()
  const a = pointerAngle(e)
  const dt = (now - lastDragT) / 1000
  if (dt > 0) {
    // згладжена кутова швидкість -> інерція при відпусканні
    const v = (a - lastDragAngle) / dt
    angVel = angVel * 0.5 + clamp(v, -14, 14) * 0.5
  }
  angle = a
  lastDragAngle = a
  lastDragT = now
}

function onSpiderUp(e: PointerEvent) {
  if (!dragging || e.pointerId !== dragPointerId) return
  dragging = false
  // якщо палець перед відпусканням стояв — гасимо швидкість
  if (performance.now() - lastDragT > 80) angVel *= 0.2
  // маленький "бонус" підстрибування
  yVel += 40
}

function onFirstGesture() {
  startSensors()
}

onMounted(() => {
  lastT = 0
  rafId = requestAnimationFrame(step)

  // Android / десктоп — слухаємо одразу
  const DOE: any = (window as any).DeviceOrientationEvent
  if (!(DOE && typeof DOE.requestPermission === 'function')) {
    startSensors()
  }
  // iOS — потрібен жест
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
      <Image   src="/ui/web.png" size="200" class="card__web" alt="Web" />
      <div ref="spiderPivot" class="card__spider-pivot">
        <div ref="spiderEl" class="card__spider-assembly">
          <div class="card__spider-thread"></div>
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

/* Точка кріплення нитки до павутини (14px + 150px зверху, 13px + 32px зліва) */
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

  /* обертання навколо точки кріплення; рух керується з JS */
  transform-origin: top center;
  will-change: transform;
}

.card__spider-thread {
  width: 4px;
  height: 150px;
  background-color: rgba(255, 255, 255, 0.7);
  box-shadow: 1px 0 0 rgba(0, 0, 0, 0.2);
}

.card__spider-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  image-rendering: pixelated;
  margin-top: -10px;

  /* павука можна хапати пальцем / мишкою */
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

.card__spider-img:active {
  cursor: grabbing;
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