<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText, PixelModal, RarityBadge } from '@/components/pixel'
import CatSprite from '@/components/pixel/CatSprite.vue'
import { ZONE_DEFS, evaluateCatRarity, type CatColors, type ZoneKey } from '@/services/catRecolor'
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

const currentRarity = computed(() => evaluateCatRarity(colors.value))

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
  const catTypes = [
    // 1. Класичний рудий (Ginger / Orange Tabby)
    () => {
      const h = Math.floor(18 + Math.random() * 22)
      const fur = hslToHex(h, Math.floor(75 + Math.random() * 25), Math.floor(58 + Math.random() * 18))
      const markings = hslToHex(h - 5, Math.floor(80 + Math.random() * 20), Math.floor(32 + Math.random() * 15))
      const belly = Math.random() < 0.7
        ? hslToHex(35, 40, Math.floor(90 + Math.random() * 8))
        : hslToHex(h + 5, 50, Math.floor(78 + Math.random() * 10))
      const accent = hslToHex(350, Math.floor(80 + Math.random() * 20), Math.floor(65 + Math.random() * 10))
      const collar = hslToHex(Math.floor(Math.random() * 360), 85, 50)
      return { fur, markings, belly, accent, collar }
    },
    // 2. Сірий таббі / Сріблястий (Silver / Gray Tabby)
    () => {
      const h = Math.floor(200 + Math.random() * 25)
      const s = Math.floor(10 + Math.random() * 20)
      const l = Math.floor(60 + Math.random() * 25)
      const fur = hslToHex(h, s, l)
      const markings = hslToHex(h, Math.min(60, s + 20), Math.floor(20 + Math.random() * 20))
      const belly = hslToHex(h, 10, Math.floor(92 + Math.random() * 7))
      const accent = hslToHex(340 + Math.floor(Math.random() * 20), 85, 70)
      const collar = hslToHex(Math.floor(Math.random() * 360), 85, 52)
      return { fur, markings, belly, accent, collar }
    },
    // 3. Чорний смокінг / Темний (Tuxedo / Midnight)
    () => {
      const h = Math.floor(210 + Math.random() * 30)
      const fur = hslToHex(h, 25, Math.floor(15 + Math.random() * 12))
      const markings = hslToHex(h, 30, Math.floor(8 + Math.random() * 8))
      const belly = hslToHex(40, 20, Math.floor(92 + Math.random() * 7))
      const accent = hslToHex(350, 85, 68)
      const collar = hslToHex(Math.floor(Math.random() * 360), 90, 55)
      return { fur, markings, belly, accent, collar }
    },
    // 4. Бежевий / Сіамський (Cream / Pointed)
    () => {
      const h = Math.floor(35 + Math.random() * 15)
      const fur = hslToHex(h, Math.floor(45 + Math.random() * 30), Math.floor(80 + Math.random() * 12))
      const markings = hslToHex(h - 15, Math.floor(50 + Math.random() * 30), Math.floor(25 + Math.random() * 20))
      const belly = hslToHex(h, 30, Math.floor(92 + Math.random() * 6))
      const accent = hslToHex(345, 80, 70)
      const collar = hslToHex(Math.floor(180 + Math.random() * 40), 90, 50)
      return { fur, markings, belly, accent, collar }
    },
    // 5. Триколірний Калико (Calico / Tortie)
    () => {
      const fur = hslToHex(25 + Math.floor(Math.random() * 15), 85, 62)
      const markings = hslToHex(210 + Math.floor(Math.random() * 20), 25, 22)
      const belly = hslToHex(40, 20, 95)
      const accent = hslToHex(350, 90, 68)
      const collar = hslToHex(Math.floor(Math.random() * 360), 85, 50)
      return { fur, markings, belly, accent, collar }
    },
    // 6. Ніжно-рожевий / Полуничний (Sakura / Strawberry)
    () => {
      const h = (Math.floor(345 + Math.random() * 25)) % 360
      const fur = hslToHex(h, Math.floor(70 + Math.random() * 25), Math.floor(75 + Math.random() * 15))
      const markings = hslToHex((h - 10 + 360) % 360, Math.floor(80 + Math.random() * 20), Math.floor(45 + Math.random() * 15))
      const belly = hslToHex(h, 20, Math.floor(94 + Math.random() * 5))
      const accent = hslToHex(350, 95, 65)
      const collar = hslToHex(140 + Math.floor(Math.random() * 30), 85, 48)
      return { fur, markings, belly, accent, collar }
    },
    // 7. М'ятний / Лісовий Магічний (Mint / Forest Emerald)
    () => {
      const h = Math.floor(145 + Math.random() * 35)
      const fur = hslToHex(h, Math.floor(55 + Math.random() * 35), Math.floor(55 + Math.random() * 25))
      const markings = hslToHex(h - 15, Math.floor(70 + Math.random() * 25), Math.floor(25 + Math.random() * 15))
      const belly = hslToHex(h, 20, Math.floor(90 + Math.random() * 8))
      const accent = hslToHex(340, 85, 70)
      const collar = hslToHex(45 + Math.floor(Math.random() * 20), 95, 50)
      return { fur, markings, belly, accent, collar }
    },
    // 8. Космічний Фіолетовий / Лаванда (Cosmic Lavender)
    () => {
      const h = Math.floor(260 + Math.random() * 35)
      const fur = hslToHex(h, Math.floor(55 + Math.random() * 35), Math.floor(65 + Math.random() * 20))
      const markings = hslToHex(h + 20, Math.floor(70 + Math.random() * 25), Math.floor(30 + Math.random() * 15))
      const belly = hslToHex(h - 15, 20, Math.floor(92 + Math.random() * 6))
      const accent = hslToHex(330, 90, 72)
      const collar = hslToHex(170 + Math.floor(Math.random() * 30), 90, 50)
      return { fur, markings, belly, accent, collar }
    },
    // 9. Золотисто-Бурштиновий (Golden Amber)
    () => {
      const h = Math.floor(42 + Math.random() * 14)
      const fur = hslToHex(h, 90, Math.floor(52 + Math.random() * 15))
      const markings = hslToHex(h - 15, 95, Math.floor(30 + Math.random() * 12))
      const belly = hslToHex(h + 5, 60, Math.floor(88 + Math.random() * 8))
      const accent = hslToHex(350, 85, 62)
      const collar = hslToHex(210 + Math.floor(Math.random() * 30), 85, 50)
      return { fur, markings, belly, accent, collar }
    },
    // 10. Шоколадний Мафін (Chocolate Muffin)
    () => {
      const h = Math.floor(18 + Math.random() * 15)
      const fur = hslToHex(h, Math.floor(50 + Math.random() * 30), Math.floor(35 + Math.random() * 15))
      const markings = hslToHex(h - 5, Math.floor(60 + Math.random() * 30), Math.floor(18 + Math.random() * 10))
      const belly = hslToHex(35, 35, Math.floor(88 + Math.random() * 8))
      const accent = hslToHex(350, 80, 68)
      const collar = hslToHex(Math.floor(Math.random() * 360), 85, 52)
      return { fur, markings, belly, accent, collar }
    }
  ]

  const choice = catTypes[Math.floor(Math.random() * catTypes.length)]
  return choice()
}

function randomizeCurrentCat() {
  playClickSound()
  colors.value = generateRandomColors()
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
            <RarityBadge :colors="colors" :show-score="true" />

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
              :style="{ borderColor: evaluateCatRarity(cat.colors).border }"
              @click="inspectGalleryCat(cat)"
            >
              <RarityBadge :colors="cat.colors" />

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
        <RarityBadge :colors="selectedGalleryCat.colors" :show-score="true" />

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

/* Бейджі рідкісності */
.rarity-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 2px solid;
  font-size: 13px;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.rarity-score {
  font-size: 11px;
  opacity: 0.85;
}

.gallery-rarity-tag {
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
</style>
