<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from "@/services/api.ts";
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { playHarvestSound } from '@/services/sound'
const { t } = useI18n()
let particleId = 0;
const count = ref(0);
const isClicking = ref(false);
const isBanned = ref(false);
const banExpiresAt = ref<number | null>(null);
const particles = ref<{ id: number; offsetX: number; offsetY: number }[]>([]);
const clickTimestamps: number[] = [];
const recentClickOffsets: { x: number; y: number }[] = [];
let pendingClicks = 0;

onMounted(async () => {
  try {
    const response = await api.get('/slots/count', { params: { name: 'strawberry' } });
    count.value = response.data.count ?? 0;
  } catch {}

  const banUntil = localStorage.getItem("clicker-ban");
  if (banUntil) {
    const now = Date.now();
    const banTime = parseInt(banUntil);
    if (banTime > now) {
      isBanned.value = true;
      banExpiresAt.value = banTime;
    } else {
      localStorage.removeItem("clicker-ban");
    }
  }

  setInterval(flushClicks, 2000);

  setInterval(() => {
    if (isBanned.value && banExpiresAt.value && Date.now() >= banExpiresAt.value) {
      isBanned.value = false;
      banExpiresAt.value = null;
      localStorage.removeItem("clicker-ban");
    }
  }, 1000);

  window.addEventListener("beforeunload", () => {
    if (pendingClicks > 0) {
      const data = JSON.stringify({ name: "strawberry", count: pendingClicks });
      navigator.sendBeacon("/api/slots/take", data);
    }
  });
});

const flushClicks = async () => {
  if (pendingClicks === 0 || isBanned.value) return;

  try {
    const response = await api.post('/slots/take', { name: 'strawberry', count: pendingClicks });
    count.value = response.data;
    pendingClicks = 0;

  } catch (error) {
    console.error("Помилка при відправці кліків:", error);
  }
};

const checkAutoClicker = () => {
  const now = Date.now();
  while (clickTimestamps.length && now - clickTimestamps[0] > 5000) {
    clickTimestamps.shift();
  }
  if (clickTimestamps.length > 80) {
    banUser(now);
  }
};

const isSameClickLocation = (): boolean => {
  if (recentClickOffsets.length < 10) return false;
  const { x: x0, y: y0 } = recentClickOffsets[0];
  return recentClickOffsets.every(({ x, y }) =>
      Math.abs(x - x0) < 3 && Math.abs(y - y0) < 3
  );
};

const banUser = (now: number) => {
  const banUntil = now + 15 * 60 * 1000;
  localStorage.setItem("clicker-ban", banUntil.toString());
  banExpiresAt.value = banUntil;
  isBanned.value = true;
};

const handleClick = () => {
  if (isBanned.value) return;

  playHarvestSound();
  const now = Date.now();
  clickTimestamps.push(now);
  checkAutoClicker();

  const button = document.querySelector('.strawberry-button') as HTMLElement;
  if (button) {
    const buttonRect = button.getBoundingClientRect();
    const offsetX = Math.random() * buttonRect.width;
    const offsetY = Math.random() * buttonRect.height;

    // 👉 Зберігаємо координати кліку
    recentClickOffsets.push({ x: offsetX, y: offsetY });
    if (recentClickOffsets.length > 10) recentClickOffsets.shift();

    if (isSameClickLocation()) {
      banUser(now);
      return;
    }

    particles.value.push({ id: particleId++, offsetX, offsetY });
  }

  pendingClicks++;
  isClicking.value = true;

  setTimeout(() => {
    particles.value.shift();
  }, 1000);

  setTimeout(() => (isClicking.value = false), 150);
};
</script>



<template>
  <div class="clicker-container">
    <p v-if="isBanned && banExpiresAt" class="ban-message">
      <Icon icon="pixelarticons:close-box" class="ban-icon" />
      <span>{{ t('clicker.banned_until', { time: new Date(banExpiresAt).toLocaleTimeString() }) }}</span>
    </p>

    <div @click="handleClick" class="clicker-section">
      <div class="click-area">
        <button
            class="strawberry-button"
            @click="$emit('click')"
            :disabled="isBanned"
        >
          <img
              src="/strawberry.png"
              alt="Strawberry"
              oncontextmenu="return false;"
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
    {{ t('clicker.plusOne') }}
  </span>
        </div>
      </div>

      <p class="strawberry-count">{{ t('clicker.strawberries') }}: {{ count }}</p>
    </div>
  </div>
</template>

<style scoped>
.clicker-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
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
  background-color: #b8cfce;
  border: 4px solid #7f8caa;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 6px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
  cursor: pointer;
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  display: flex;
  justify-content: center;
  align-items: center;
}

.strawberry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: 0 4px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
}

.strawberry-button:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 3px 0 0 #5e6d8a, 0 0 0 2px #333446 inset;
}

.strawberry-icon {
  width: 200px;
  height: 200px;
  image-rendering: pixelated;
  transition: transform 0.1s ease-in-out;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  touch-action: manipulation;
}


.strawberry-count {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 2px 2px #1c1d2e;
  margin-top: 15px;
  font-family: var(--font-pixel);
}

.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.particle-text {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
  color: #ffa07a;
  animation: float-up-fade 1s ease-out forwards;
  text-shadow: 0 0 5px #000;
  white-space: nowrap;
}

.ban-message {
  color: #DC143C;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
  font-size: 14px;
  padding: 8px 12px;
  background-color: #B8CFCE;
  border: 2px solid #A30F2C;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.ban-icon {
  font-size: 20px;
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
</style>
