<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AppText, AppDropdown } from '@/components/ui'

const props = defineProps<{
  language_code?: string | null
}>()

const { locale, t } = useI18n()

function saveLang(val: string | number) {
  locale.value = String(val)
  localStorage.setItem('lang', locale.value)
}

const langOptions = [
  { value: 'en', label: 'English' },
  { value: 'uk', label: 'Українська' },
  ...(props.language_code !== 'uk' ? [{ value: 'ru', label: 'Русский' }] : [])
]
</script>

<template>
  <div class="settings">
    <AppText variant="title" as="h2" class="settings-title">{{ t('settings.title') }}</AppText>

    <div class="section">
      <AppDropdown
          :model-value="locale"
          :label="t('settings.language_label')"
          :options="langOptions"
          @update:model-value="saveLang"
      />
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: 8px;
}

.settings-title {
  margin-bottom: 16px;
  text-align: center;
}

.section {
  margin-bottom: 16px;
}
</style>
