<script setup lang="ts">
import { defineProps, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsSegment from './SettingsSegment.vue'

const { t } = useI18n()

const props = defineProps<{
  firstName: string
  lastName: string
  avatar: string
  money: number
  language_code: string
}>()

const showSettings = ref(false)

function openSettings() {
  showSettings.value = true
}
</script>

<template>
  <div class="toolbar">
    <img class="avatar" :src="props.avatar" :alt="t('toolbar.settings_alt')" />
    <div class="info">
      <div class="name">{{ props.firstName }} {{ props.lastName }}</div>
      <div class="money">💰 {{ props.money }}</div>
    </div>
    <button class="settings-btn" @click="openSettings">
      <img src="/settings_icon.png" :alt="t('toolbar.settings_alt')" />
    </button>
  </div>

  <!-- Модальне вікно -->
  <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
    <div class="modal">

      <SettingsSegment :language_code="props.language_code" />
      <button class="close-btn" @click="showSettings = false">{{ t('modal.close') }}</button>
    </div>
  </div>
</template>


<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(184, 207, 206, 0.8);
  padding: 10px;
  border-radius: 12px;
  margin-bottom: 12px;
  width: 100%;
  max-width: 420px;
  z-index: 1;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
}

.info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  color: #2e2e2e;
}

.name {
  font-weight: bold;
  font-size: 14px;
}

.money {
  font-size: 13px;
  color: #444;
}

.settings-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
}

.settings-btn img {
  width: 20px;
  height: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 10px;
  padding: 20px;
  min-width: 300px;
  max-width: 90%;
}

.close-btn {
  margin-top: 10px;
  background: #e74c3c;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
