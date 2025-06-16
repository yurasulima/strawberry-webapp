
<template>
  <div class="app-container">

    <p v-if="isBanned && banExpiresAt" class="ban-message">
      🚫 Ви забанені за автоклік до {{ new Date(banExpiresAt).toLocaleTimeString() }}
    </p>

    <div class="main-content">
      <div v-if="activeTab === 'clicker'" class="clicker-section">
        <div class="click-area">
          <button class="strawberry-button" @click="handleClick" :disabled="isBanned">
            <img
                src="/strawberry.png"
                alt="Strawberry" oncontextmenu="return false;"
                class="strawberry-icon"
                :class="{ 'pop-animation': isClicking }"
            />
          </button>
          <div class="particles-container">
            <span
                v-for="p in particles"
                :key="p.id"
                class="particle-text"
                :style="{ left: `${p.offsetX}px`, top: `${p.offsetY}px` }"
            >
              +1
            </span>
          </div>
        </div>
        <p class="strawberry-count">Полуничок: {{ count }}</p>
      </div>

      <div v-if="activeTab === 'profile'" class="profile-section">
        <h2>👤 Профіль Користувача</h2>
        <pre class="user-data">{{ JSON.stringify(user, null, 2) }}</pre>
      </div>
    </div>

    <div class="bottom-navigation">
      <button :class="{ active: activeTab === 'clicker' }" @click="activeTab = 'clicker'">Гра</button>
      <button :class="{ active: activeTab === 'profile' }" @click="activeTab = 'profile'">Профіль</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWebApp, useWebAppViewport } from "vue-tg"

const { initDataUnsafe } = useWebApp()
const user = initDataUnsafe.user || { id: 0 }
const count = ref(0)
const activeTab = ref<'clicker' | 'profile'>('clicker')
const isClicking = ref(false)
const isBanned = ref(false)
const banExpiresAt = ref<number | null>(null)

const particles = ref<{ id: number; offsetX: number; offsetY: number }[]>([]) // Додано offsetY
let particleId = 0

const clickSound = new Audio("/click.mp3")
const clickTimestamps: number[] = []

const checkAutoClicker = () => {
  const now = Date.now()

  // Залишаємо тільки кліки за останні 5 секунд
  while (clickTimestamps.length && now - clickTimestamps[0] > 5000) {
    clickTimestamps.shift()
  }

  // Якщо більше 50 кліків за 5 секунд — бан на 15 хвилин
  if (clickTimestamps.length > 100) {
    const banUntil = now + 15 * 60 * 1000
    localStorage.setItem("clicker-ban", banUntil.toString())
    banExpiresAt.value = banUntil
    isBanned.value = true
  }
}


const handleClick = () => {
  if (isBanned.value) return

  const now = Date.now()
  clickTimestamps.push(now)
  checkAutoClicker()

  count.value++
  localStorage.setItem("clicker-count", count.value.toString())

  clickSound.currentTime = 0
  clickSound.play()

  isClicking.value = true

  // Генерація випадкових позицій X та Y в межах кнопки
  const button = document.querySelector('.strawberry-button') as HTMLElement;
  if (button) {
    const buttonRect = button.getBoundingClientRect();
    // Генеруємо позиції від 0 до ширини/висоти кнопки
    const randomOffsetX = Math.random() * buttonRect.width;
    const randomOffsetY = Math.random() * buttonRect.height;
    particles.value.push({ id: particleId++, offsetX: randomOffsetX, offsetY: randomOffsetY });
  }


  setTimeout(() => {
    particles.value.shift()
  }, 1000)

  setTimeout(() => (isClicking.value = false), 150)
}

onMounted(() => {
  const saved = localStorage.getItem("clicker-count")
  if (saved) count.value = parseInt(saved)

  const banUntil = localStorage.getItem("clicker-ban")
  if (banUntil) {
    const now = Date.now()
    const banTime = parseInt(banUntil)
    if (banTime > now) {
      isBanned.value = true
      banExpiresAt.value = banTime
    } else {
      localStorage.removeItem("clicker-ban")
    }
  }

  setInterval(() => {
    if (isBanned.value && banExpiresAt.value && Date.now() >= banExpiresAt.value) {
      isBanned.value = false
      banExpiresAt.value = null
      localStorage.removeItem("clicker-ban")
    }
  }, 1000)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  max-width: 420px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #333446; /* Найтемніший фон */
  color: #EAEFEF; /* Світлий текст */
  font-family: "Pixel", "Segoe UI", sans-serif;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 70px;
}

h1 {
  text-align: center;
  color: #7F8CAA; /* Середній сіро-синій для заголовків */
  font-size: 28px;
  margin-bottom: 20px;
  text-shadow: 2px 2px #1c1d2e; /* Тінь темніша, щоб виділялась */
}

h2 {
  color: #7F8CAA; /* Середній сіро-синій */
  font-size: 24px;
  margin-bottom: 15px;
  text-shadow: 1px 1px #1c1d2e;
}

.ban-message {
  color: #DC143C; /* Яскраво-червоний для повідомлення про бан */
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
  font-size: 18px;
  padding: 8px;
  background-color: #B8CFCE; /* Світлий сіро-блакитний фон бану */
  border: 2px solid #A30F2C; /* Темніший червоний рамка */
  border-radius: 5px;
}

.clicker-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.click-area {
  position: relative;
  display: inline-block;
}

.strawberry-button {
  background-color: #B8CFCE; /* Світлий сіро-блакитний фон кнопки */
  border: 4px solid #7F8CAA; /* Середній сіро-синій рамка */
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 6px 0 0 #5E6D8A, /* Тінь кнопки, трохи темніше середнього */
  0 0 0 2px #333446 inset; /* Внутрішня тінь, колір фону */
  cursor: pointer;
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  display: flex;
  justify-content: center;
  align-items: center;
}

.strawberry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: 0 4px 0 0 #5E6D8A,
  0 0 0 2px #333446 inset;
}

.strawberry-button:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 3px 0 0 #5E6D8A,
  0 0 0 2px #333446 inset;
}

.strawberry-icon {
  width: 200px;
  height: 200px;
  image-rendering: pixelated;
  transition: transform 0.1s ease-in-out;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  -webkit-touch-callout: none; /* Safari */
  -webkit-user-drag: none;     /* Safari */
  touch-action: manipulation;
}

.strawberry-icon.pop-animation {
  transform: scale(1.15);
}

.strawberry-count {
  font-size: 28px;
  font-weight: bold;
  color: #FFD700; /* Золотий для лічильника */
  text-shadow: 2px 2px #1c1d2e; /* Темна тінь для контрасту */
  margin-top: 15px;
}

.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible; /* Дозволяє частинкам виходити за межі */
}

.particle-text {
  position: absolute; /* Позиціонуємо абсолютно відносно particles-container */
  font-size: 24px;
  font-weight: bold;
  color: #FFA07A; /* Світло-оранжевий для частинок */
  animation: float-up-fade 1s ease-out forwards;
  text-shadow: 0 0 5px #000;
  white-space: nowrap;
  /* transform: translateX(-50%);  Видалено, оскільки left/top тепер абсолютні */
}

@keyframes float-up-fade {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-70px) scale(1.2);
  }
}

.bottom-navigation {
  display: flex;
  justify-content: space-around;
  background-color: #B8CFCE; /* Світлий сіро-блакитний */
  padding: 10px 0;
  border-top: 3px solid #7F8CAA; /* Середній сіро-синій */
  width: 100%;
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 420px;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.3);
}

.bottom-navigation button {
  /* Заборонити виділення тексту */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  background: none;
  border: none;
  color: #333446; /* Темний текст на світлому фоні кнопок */
  font-size: 18px;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease, color 0.2s ease;
  flex-grow: 1;
  margin: 0 5px;
}

.bottom-navigation button:hover:not(.active) {
  background-color: #A0BFC0; /* Трохи темніший світлий для ховеру */
}

.bottom-navigation button.active {
  background-color: #7F8CAA; /* Середній сіро-синій */
  color: #EAEFEF; /* Світлий текст */
  font-weight: bold;
  box-shadow: 0 0 10px rgba(127, 140, 170, 0.7);
}

.profile-section {
  padding: 20px;
  background-color: #B8CFCE; /* Світлий сіро-блакитний */
  border-radius: 10px;
  margin-top: 20px;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
  text-align: left;
}

.user-data {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', Courier, monospace;
  background-color: #333446; /* Темний фон для коду */
  color: #EAEFEF; /* Світлий текст для коду */
  padding: 10px;
  border-radius: 5px;
  font-size: 14px;
  border: 1px solid #7F8CAA; /* Середній сіро-синій рамка */
  max-height: 250px;
  overflow-y: auto;
}
</style>