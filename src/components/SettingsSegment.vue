<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  language_code?: string | null
}>()

const { locale, t } = useI18n()

function saveLang() {
  localStorage.setItem('lang', locale.value)
}
</script>

<template>
  <div class="settings">
    <h2>{{ t('settings.title') }}</h2>

    <div class="section">
      <label for="language" class="lang-label">
        <Icon icon="pixelarticons:sliders" class="setting-icon" />
        <span>{{ t('settings.language_label') }}</span>
      </label>
      <select id="language" v-model="locale" @change="saveLang">
        <option value="en">English</option>
        <option value="uk">Українська</option>
        <option v-if="props.language_code !== 'uk'" value="ru">Русский</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: 8px;
  color: #3f2e21;
}

.settings h2 {
  font-size: 13px;
  margin-top: 0;
  margin-bottom: 16px;
  color: #3f2e21;
}

.section {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lang-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-family: var(--font-pixel);
  color: #3f2e21;
}

.setting-icon {
  font-size: 16px;
  color: #3f2e21;
}

select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 2px solid #5d4037;
  background-color: #fff8eb;
  font-family: var(--font-pixel);
  font-size: 11px;
  color: #3f2e21;
  cursor: pointer;
  outline: none;
}
</style>
