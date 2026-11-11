<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText, PixelModal } from '@/components/pixel'
import CatSprite from '@/components/pixel/CatSprite.vue'
import { ZONE_DEFS, type CatColors, type ZoneKey } from '@/services/catRecolor'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { playClickSound, playSuccessSound } from '@/services/sound'

const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

/* ───────── Кольори поточного котика ───────── */
const colors = ref<CatColors>({
  fur: '#fdd5b5',
  markings: '#e6b4a0',
  belly: '#fef5e6',
  accent: '#eb9486',
  collar: '#e3baad'
})

/* Налаштування спрайта */
const catSize = ref<number>(128)
const isPlaying = ref<boolean>(true)
const frameRate = ref<number>(120)
const fixedFrame = ref<number | null>(null)

/* Галерея згенерованих котів */
interface SavedCat {
  id: number
  name: string
  colors: CatColors
}
const catGallery = ref<SavedCat[]>([])
let catIdCounter = 1

/* Генерація гармонійного випадкового кольору в HSL */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generateRandomColors(): CatColors {
  let h: number
  let s: number
  let l: number

  const roll = Math.random()
  if (roll < 0.70) {
    const hueType = Math.floor(Math.random() * 4)
    if (hueType === 0) {
      h = Math.floor(Math.random() * 36) // Рудий / оранжевий
      s = Math.floor(40 + Math.random() * 45)
      l = Math.floor(45 + Math.random() * 30)
    } else if (hueType === 1) {
      h = Math.floor(36 + Math.random() * 20) // Бежевий / кремовий
      s = Math.floor(25 + Math.random() * 40)
      l = Math.floor(55 + Math.random() * 30)
    } else if (hueType === 2) {
      h = Math.floor(180 + Math.random() * 60) // Попелясто-сірий
      s = Math.floor(5 + Math.random() * 15)
      l = Math.floor(35 + Math.random() * 40)
    } else {
      h = Math.floor(340 + Math.random() * 21) // Персиковий
      s = Math.floor(30 + Math.random() * 40)
      l = Math.floor(55 + Math.random() * 25)
    }
  } else if (roll < 0.90) {
    h = Math.floor(Math.random() * 360) // Пастельні фентезі тони
    s = Math.floor(30 + Math.random() * 35)
    l = Math.floor(55 + Math.random() * 25)
  } else {
    h = Math.floor(190 + Math.random() * 70) // Помірні сині тони
    s = Math.floor(30 + Math.random() * 30)
    l = Math.floor(45 + Math.random() * 25)
  }

  const fur = hslToHex(h, s, l)
  const markings = hslToHex(h, Math.min(100, s + 18), Math.max(12, l - 22))
  const belly = hslToHex(h, Math.max(5, s - 25), Math.min(96, l + 20))
  const accent = hslToHex((h + 330) % 360, Math.min(100, s + 25), Math.min(85, l + 10))
  const collar = hslToHex((h + 160 + Math.floor(Math.random() * 40)) % 360, 80, 52)

  return { fur, markings, belly, accent, collar }
}

function randomizeCurrentCat() {
  playClickSound()
  colors.value = generateRandomColors()
}

function applyPreset(pColors: CatColors) {
  playClickSound()
  colors.value = { ...pColors }
}

function generateGalleryBatch(count = 8) {
  playClickSound()
  const names = ['Мурчик', 'Пушок', 'Барсик', 'Сімба', 'Локі', 'Люцифер', 'Зефір', 'Оскар', 'Кокос', 'Піксель', 'Мафін', 'Джаз']
  const newBatch: SavedCat[] = []

  for (let i = 0; i < count; i++) {
    const randomName = names[Math.floor(Math.random() * names.length)] + ` #${catIdCounter}`
    newBatch.push({
      id: catIdCounter++,
      name: randomName,
      colors: generateRandomColors()
    })
  }
  catGallery.value = newBatch
  playSuccessSound()
}

function saveCurrentCatToGallery() {
  playSuccessSound()
  catGallery.value.unshift({
    id: catIdCounter++,
    name: `Котик #${catIdCounter - 1}`,
    colors: { ...colors.value }
  })
  toastStore.showToast('Котика додано у колекцію!', 'success')
}

function copyColorsJson() {
  playClickSound()
  const jsonStr = JSON.stringify(colors.value, null, 2)
  navigator.clipboard.writeText(jsonStr)
  toastStore.showToast('JSON кольорів скопійовано в буфер!', 'success')
}

const selectedGalleryCat = ref<SavedCat | null>(null)
const isCatModalOpen = ref(false)

function inspectGalleryCat(cat: SavedCat) {
  playClickSound()
  selectedGalleryCat.value = cat
  isCatModalOpen.value = true
}

function applyGalleryCatColors(cat: SavedCat) {
  playClickSound()
  colors.value = { ...cat.colors }
  isCatModalOpen.value = false
  toastStore.showToast(`Завантажено кольори "${cat.name}"`, 'success')
}

onMounted(() => {
  generateGalleryBatch(12)
})
</script>

<template>
  <div class="admin-cats-container">
    <!-- Шапка сторінки -->
    <header class="cats-header">
      <button class="back-btn" @click="router.push('/')">
        <Icon icon="pixelarticons:arrow-left" /> На головну
      </button>
      <h1 class="page-title">🐱 Генератор Котиків (Admin)</h1>
    </header>

    <div class="cats-layout">
      <!-- Ліва колонка: Інтерактивний перегляд та налаштування кольорів -->
      <div class="left-col">
        <CardPrimary width="100%" height="auto" :padding="14">
          <div class="preview-box">
            <div class="cat-display">
              <CatSprite
                :colors="colors"
                :size="catSize"
                :playing="isPlaying"
                :frame-rate-ms="frameRate"
                :frame="fixedFrame"
              />
            </div>

            <!-- Контроли плеєра анімації -->
            <div class="anim-controls">
              <button
                type="button"
                class="icon-btn"
                :class="{ active: isPlaying }"
                @click="isPlaying = !isPlaying"
                :title="isPlaying ? 'Пауза' : 'Грати'"
              >
                <Icon :icon="isPlaying ? 'pixelarticons:pause' : 'pixelarticons:play'" />
              </button>

              <div class="frame-scrubber">
                <span class="ctrl-label">Кадр:</span>
                <button
                  v-for="f in 10"
                  :key="f - 1"
                  type="button"
                  class="frame-btn"
                  :class="{ active: fixedFrame === f - 1 }"
                  @click="fixedFrame = fixedFrame === f - 1 ? null : f - 1"
                >
                  {{ f - 1 }}
                </button>
              </div>
            </div>

            <!-- Швидкі дії генерації -->
            <div class="action-buttons">
              <ButtonText width="100%" @click="randomizeCurrentCat">
                🎲 Рандомний колір
              </ButtonText>

              <ButtonText width="100%" @click="saveCurrentCatToGallery">
                ⭐ Зберегти в кошик
              </ButtonText>
            </div>
          </div>
        </CardPrimary>

        <!-- Картка з детальною палітрою зон -->
        <Card width="100%" height="auto" :padding="12" class="palette-card">
          <h3 class="section-title">🎨 Палітра зон кота</h3>

          <div class="zone-sliders">
            <div v-for="z in ZONE_DEFS" :key="z.key" class="zone-row">
              <div class="zone-info">
                <span class="color-preview-swatch" :style="{ backgroundColor: colors[z.key as ZoneKey] }"></span>
                <span class="zone-name">{{ z.label }} ({{ z.key }})</span>
              </div>
              <input
                type="color"
                v-model="colors[z.key as ZoneKey]"
                class="pixel-color-picker"
              />
            </div>
          </div>

          <div class="palette-footer">
            <ButtonText width="100%" @click="copyColorsJson">
              📋 Скопіювати JSON
            </ButtonText>
          </div>
        </Card>
      </div>

      <!-- Права колонка: Згенерована сітка -->
      <div class="right-col">
        <!-- Галерея рандомних котиків -->
        <CardPrimary width="100%" height="auto" :padding="14" class="gallery-card">
          <div class="gallery-header">
            <h3 class="section-title">Згенерована Сітка Котиків</h3>
            <ButtonText @click="generateGalleryBatch(12)">
              Перегенерувати
            </ButtonText>
          </div>

          <div class="gallery-grid">
            <div
              v-for="cat in catGallery"
              :key="cat.id"
              class="gallery-item"
              @click="inspectGalleryCat(cat)"
            >
              <div class="gallery-cat-preview">
                <CatSprite :colors="cat.colors" :size="72" :playing="true" />
              </div>
            </div>
          </div>
        </CardPrimary>
      </div>
    </div>

    <!-- Модальне вікно огляду обраного котика -->
    <PixelModal v-model="isCatModalOpen" title="Деталі котика" :width="340">
      <div v-if="selectedGalleryCat" class="modal-cat-detail">
        <div class="modal-cat-preview">
          <CatSprite :colors="selectedGalleryCat.colors" :size="128" :playing="true" />
        </div>
        <h4 class="modal-cat-title">{{ selectedGalleryCat.name }}</h4>

        <div class="modal-cat-colors">
          <div v-for="(colVal, key) in selectedGalleryCat.colors" :key="key" class="modal-color-chip">
            <span class="chip-swatch" :style="{ backgroundColor: colVal }"></span>
            <span class="chip-label">{{ key }}: {{ colVal }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <ButtonText width="100%" @click="selectedGalleryCat && applyGalleryCatColors(selectedGalleryCat)">
          Встановити ці кольори
        </ButtonText>
      </template>
    </PixelModal>
  </div>
</template>

<style scoped>
.admin-cats-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
  font-family: var(--font-pixel), sans-serif;
  color: #3f2e21;
}

.cats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: #f7d070;
  text-shadow: 2px 2px 0 #1a1008;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(63, 46, 33, 0.85);
  border: 2px solid #8b6d51;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.back-btn:hover {
  background: #8b6d51;
}

.cats-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .cats-layout {
    grid-template-columns: 1fr;
  }
}

.left-col, .right-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.preview-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.cat-display {
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  border: 2px dashed rgba(63, 46, 33, 0.3);
}

.anim-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2d3be;
  border: 1px solid #5d4037;
  color: #3f2e21;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;

  transition: all 0.1s ease;
}

.icon-btn.active {
  background: #4f8b55;
  color: #fff;
  border-color: #2e7d32;
}

.frame-scrubber {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}

.ctrl-label {
  font-size: 12px;
  font-weight: bold;
}

.frame-btn {
  width: 22px;
  height: 22px;
  background: #e2d3be;
  border: 1px solid #5d4037;
  font-family: inherit;
  font-size: 10px;
  font-weight: bold;
  color: #3f2e21;
  cursor: pointer;
  border-radius: 3px;
}

.frame-btn.active {
  background: #d97706;
  color: #fff;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.section-title {
  margin: 0 0 10px;
  font-size: 16px;
  color: #3f2e21;
  font-weight: bold;
}

.palette-card {
  margin-top: 0;
}

.zone-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.zone-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.04);
  padding: 6px 8px;
  border-radius: 4px;
}

.zone-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview-swatch {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #3f2e21;
}

.zone-name {
  font-size: 13px;
}

.pixel-color-picker {
  border: none;
  width: 32px;
  height: 28px;
  cursor: pointer;
  background: transparent;
}

.palette-footer {
  margin-top: 10px;
}

/* Галерея котів */
.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 580px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.gallery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(63, 46, 33, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.gallery-item:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #d97706;
}

.gallery-cat-preview {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-cat-name {
  font-size: 12px;
  font-weight: bold;
  margin-top: 4px;
  text-align: center;
}

/* Модальне вікно кота */
.modal-cat-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.modal-cat-preview {
  width: 128px;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 8px;
}

.modal-cat-title {
  margin: 0;
  font-size: 18px;
}

.modal-cat-colors {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.modal-color-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  background: #fff8eb;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #5d4037;
}

.chip-swatch {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #3f2e21;
}
</style>
