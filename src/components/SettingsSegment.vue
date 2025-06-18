<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  language_code: string
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
      <label for="language">{{ t('settings.language_label') }}</label>
      <select id="language" v-model="locale" @change="saveLang">
        <option value="en">English</option>
        <option value="ua">Українська</option>
        <option v-if="props.language_code !== 'uk'" value="ru">Русский</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: 20px;
  color: #2e2e2e;
}

.section {
  margin-bottom: 20px;
}

select {
  margin-left: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
</style>
