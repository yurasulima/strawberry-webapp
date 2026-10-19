<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AppCard, AppText, AppDangerButton } from '@/components/ui'
import SettingsSegment from './SettingsSegment.vue'
import { playClickSound } from '@/services/sound'

const { t } = useI18n()

const props = defineProps<{
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  money?: number
  language_code?: string | null
}>()

const showSettings = ref(false)

function handleOpenSettings() {
  playClickSound()
  showSettings.value = true
}
</script>

<template>
  <AppCard variant="cream" :padding="false" class="toolbar">
    <img class="avatar" :src="props.avatar || '/default-avatar.png'" :alt="t('toolbar.settings_alt')" />
    <div class="info">
      <AppText variant="subtitle" class="name">{{ props.firstName ?? '' }} {{ props.lastName ?? '' }}</AppText>
      <div class="money">
        <img src="/honeywood/icons/interface/coin.png" class="coin-icon" alt="Coin" />
        <AppText variant="subtitle" color="gold">{{ props.money ?? 0 }}</AppText>
      </div>
    </div>
    <button class="settings-btn" @click="handleOpenSettings" :aria-label="t('toolbar.settings_alt')">
      <img src="/honeywood/icons/interface/gear.png" class="settings-icon" alt="Settings" />
    </button>
  </AppCard>

  <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
    <AppCard variant="paper" class="modal">
      <SettingsSegment :language_code="props.language_code" />
      <AppDangerButton class="close-btn" @click="showSettings = false">
        {{ t('modal.close') }}
      </AppDangerButton>
    </AppCard>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 12px;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  z-index: 1;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
  border: 2px solid #3f2e21;
  flex-shrink: 0;
}

.info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.money {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.coin-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.settings-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.settings-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: pixelated;
  transition: transform 0.2s ease;
}

.settings-btn:hover .settings-icon {
  transform: rotate(45deg);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  min-width: 280px;
  max-width: 90%;
}

.close-btn {
  margin-top: 14px;
  width: 100%;
}
</style>
