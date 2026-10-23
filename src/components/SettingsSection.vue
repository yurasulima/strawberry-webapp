<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWebApp } from 'vue-tg'
import { CardPrimary, Card, ButtonText, LeftButton, RightButton } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from '@/services/sound'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'

const { locale, t } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const { initDataUnsafe } = useWebApp()
const telegramUser = initDataUnsafe?.user

const isUkrainianUser = computed(() => {
  const tgLang = (telegramUser?.language_code || '').toLowerCase()
  const userLang = (userStore.user?.lang || '').toLowerCase()
  const navLang = (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase()

  return tgLang.startsWith('uk') || tgLang.startsWith('ua') ||
         userLang.startsWith('uk') || userLang.startsWith('ua') ||
         navLang.startsWith('uk') || navLang.startsWith('ua')
})

const languages = computed(() => {
  const allLangs = [
    { code: 'uk', label: 'Українська' },
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' }
  ]
  if (isUkrainianUser.value) {
    return allLangs.filter(l => l.code !== 'ru')
  }
  return allLangs
})

const selectedLangCode = ref(locale.value)

watchEffect(() => {
  if (isUkrainianUser.value && selectedLangCode.value === 'ru') {
    selectedLangCode.value = 'uk'
  }
})

const currentIndex = computed(() => {
  const list = languages.value
  const idx = list.findIndex(l => l.code === selectedLangCode.value)
  return idx >= 0 ? idx : 0
})

const currentLangLabel = computed(() => languages.value[currentIndex.value]?.label || 'Українська')

function prevLang() {
  playClickSound()
  const list = languages.value
  const newIdx = (currentIndex.value - 1 + list.length) % list.length
  selectedLangCode.value = list[newIdx].code
}

function nextLang() {
  playClickSound()
  const list = languages.value
  const newIdx = (currentIndex.value + 1) % list.length
  selectedLangCode.value = list[newIdx].code
}

function saveSettings() {
  playPurchaseSound()
  locale.value = selectedLangCode.value
  localStorage.setItem('lang', selectedLangCode.value)
  toastStore.showToast('Налаштування збережено', 'success')
}
</script>

<template>
  <div class="settings-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <h2 class="title">{{ t('settings.title') }}</h2>

      <Card width="100%" height="auto" :padding="12" class="settings-card">
        <div class="settings-list">
          <!-- Перемикання мови стрілочками LeftButton / RightButton -->
          <div class="setting-row">
            <span class="setting-label">{{ t('settings.language_label') }}</span>
            <div class="lang-selector">
              <LeftButton width="48" height="48" @click="prevLang" />
              <span class="lang-label">{{ currentLangLabel }}</span>
              <RightButton width="48" height="48" @click="nextLang" />
            </div>
          </div>

          <!-- Кнопка Зберегти -->
          <div class="settings-actions">
            <ButtonText height="52" padding="10px 24px" @click="saveSettings">
              Зберегти
            </ButtonText>
          </div>
        </div>
      </Card>
    </CardPrimary>
  </div>
</template>

<style scoped>
.settings-container {
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

.settings-card {
  box-sizing: border-box;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 52px;
}

.setting-label {
  font-size: 20px;
  color: #3f2e21;
}

.lang-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-label {
  font-size: 18px;
  font-weight: bold;
  color: #3f2e21;
  min-width: 110px;
  text-align: center;
  user-select: none;
}

.settings-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
