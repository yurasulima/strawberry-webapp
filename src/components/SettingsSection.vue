<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWebApp } from 'vue-tg'
import { CardPrimary, Card, ButtonText, LeftButton, RightButton, SoundButton, MusicButton, SlideFade } from '@/components/pixel'
import WikiSection from '@/components/WikiSection.vue'
import { playClickSound, playPurchaseSound, isSoundEnabled, setSoundEnabled, isMusicEnabled, setMusicEnabled } from '@/services/sound'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'

const { locale, t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const toastStore = useToastStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const isWikiOpen = ref(false)
const soundState = ref(isSoundEnabled())
const musicState = ref(isMusicEnabled())

watch(soundState, (val) => {
  setSoundEnabled(val)
})

watch(musicState, (val) => {
  setMusicEnabled(val)
})

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
    { code: 'uk', label: t('settings.languages.uk') },
    { code: 'en', label: t('settings.languages.en') },
    { code: 'ru', label: t('settings.languages.ru') }
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

const currentLangLabel = computed(() => languages.value[currentIndex.value]?.label || t('settings.languages.uk'))

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

function openWiki() {
  playClickSound()
  isWikiOpen.value = true
}

function openPrivacy() {
  playClickSound()
  router.push('/privacy')
}

function openDeleteAccount() {
  playClickSound()
  router.push('/delete-account')
}

function saveSettings() {
  playPurchaseSound()
  locale.value = selectedLangCode.value
  localStorage.setItem('lang', selectedLangCode.value)
  setSoundEnabled(soundState.value)
  setMusicEnabled(musicState.value)
  toastStore.showToast(t('settings.saved_success'), 'success')
  emit('close')
}
</script>

<template>
  <div class="settings-container">
    <WikiSection v-if="isWikiOpen" @close="isWikiOpen = false" />

    <CardPrimary v-else width="100%" height="auto" :padding="12">
      <h2 class="title">{{ t('settings.title') }}</h2>

      <SlideFade>
        <Card width="100%" height="auto" :padding="12" class="settings-card">
          <div class="settings-list">
            <!-- Кнопка відкриття Вікі -->
            <div class="setting-row wiki-row">
              <ButtonText height="48" padding="8px 20px" width="100%" @click="openWiki">
                📖 Вікі предметів / Довідник
              </ButtonText>
            </div>

            <!-- Перемикання мови стрілочками LeftButton / RightButton -->
            <div class="setting-row">
              <span class="setting-label">{{ t('settings.language_label') }}</span>
              <div class="lang-selector">
                <LeftButton size="64" @click="prevLang" />
                <span class="lang-label">{{ currentLangLabel }}</span>
                <RightButton size="64" @click="nextLang" />
              </div>
            </div>

            <!-- Налаштування звуку -->
            <div class="setting-row">
              <span class="setting-label">{{ t('settings.sound_label') }}</span>
              <SoundButton v-model="soundState" size="48" />
            </div>

            <!-- Налаштування музики -->
            <div class="setting-row">
              <span class="setting-label">{{ t('settings.music_label') }}</span>
              <MusicButton v-model="musicState" size="48" />
            </div>

            <!-- Кнопка Зберегти -->
            <div class="settings-actions">
              <ButtonText height="52" padding="10px 24px" @click="saveSettings">
                {{ t('settings.save') }}
              </ButtonText>
            </div>

            <!-- Додаткові посилання для Play Market (Privacy & Account Deletion) -->
            <div class="legal-links">
              <span class="legal-link" @click="openPrivacy">🔒 Політика конфіденційності</span>
              <span class="legal-separator">•</span>
              <span class="legal-link delete-link" @click="openDeleteAccount">🗑 Видалення акаунту</span>
            </div>
          </div>
        </Card>
      </SlideFade>
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
  width: 100%;
}

.wiki-row {
  justify-content: center;
}

.setting-label {
  font-size: 20px;
  color: #3f2e21;
  flex-shrink: 0;
}

.lang-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.lang-label {
  font-size: 18px;
  font-weight: bold;
  color: #3f2e21;
  min-width: 100px;
  text-align: center;
  user-select: none;
}

.settings-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.legal-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
  color: #6d4c41;
  flex-wrap: wrap;
}

.legal-link {
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.legal-link:hover {
  color: #3f2e21;
}

.delete-link {
  color: #c62828;
}

.delete-link:hover {
  color: #b71c1c;
}

.legal-separator {
  color: #a1887f;
}
</style>
