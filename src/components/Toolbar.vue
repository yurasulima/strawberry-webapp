<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {
  CardPrimary,
  AvatarBorder,
  SettingsButton,
  PixelModal,
  CloseButton,
  OkButton,
  Image, Card
} from '@/components/pixel'
import SettingsSegment from './SettingsSegment.vue'
import {playClickSound} from '@/services/sound'

const {t} = useI18n()

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
  <div class="toolbar-wrapper">
    <div class="toolbar-ava-wrapper">
      <AvatarBorder
          width="100px"
          height="100px"
          padding="14px"
          :image="props.avatar"
          class="toolbar-avatar"
      />
      <CardPrimary width="100%" height="64px" :padding="0" class="toolbar-container">
        <!-- Right Side: User Nickname -->
        <div class="user-info-side">
          <div class="user-info-header">
            <span class="user-name">
              {{ props.firstName ?? '' }} {{ props.lastName ?? '' }}
            </span>
            <SettingsButton
                size="64"
                @click="handleOpenSettings"
                class="settings-btn"
            />
          </div>
        </div>
      </CardPrimary>
    </div>

    <!-- Money Card underneath main card, indented from left by avatar size, adaptive width -->
    <Card width="fit-content" height="42px" :padding="0" class="money-card">
      <div class="user-money-row">
        <Image src="/ui/money.png" size="38" alt="Money" class="coin-icon" />
        <span class="money-amount">{{ props.money ?? 0 }}</span>
      </div>
    </Card>
  </div>

  <!-- Settings Pixel Modal -->
  <PixelModal
      v-model="showSettings"
      :title="t('modal.settings') || 'Налаштування'"
      width="360"
  >
    <SettingsSegment :language_code="props.language_code"/>

    <template #footer>
      <OkButton size="48" @click="showSettings = false"/>
      <CloseButton size="48" @click="showSettings = false"/>
    </template>
  </PixelModal>
</template>

<style scoped>
.toolbar-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  margin-bottom: 12px;
  z-index: 10;
}

.toolbar-ava-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 64px;
  z-index: 10;
}

.toolbar-avatar {
  position: absolute;
  left: -6px;
  top: -6px;
  z-index: 2;
  flex-shrink: 0;
}

.toolbar-container {
  position: relative;
  display: flex;
  width: 100%;
  height: 64px;
  box-sizing: border-box;
  z-index: 1;
}

.money-card {
  margin-top: 40px;
  width: fit-content;
  max-width: calc(100% - 88px);
  height: 36px;
  box-sizing: border-box;
  z-index: 1;
  align-self: flex-start;
}

.user-info-side {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  margin-left: 88px;
  box-sizing: border-box;
  overflow: hidden;
}

.user-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.user-name {
  font-family: var(--font-pixel), serif;
  font-size: 13px;
  font-weight: bold;
  color: #1a1008;
  line-height: 1.3;
  word-break: break-word;
  text-align: center;
  flex-grow: 1;
}

.settings-btn {
  flex-shrink: 0;
}

.user-money-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding-left: 6px;
  padding-right: 18px;
  box-sizing: border-box;
  white-space: nowrap;
}

.coin-icon {
  flex-shrink: 0;
}

.money-amount {
  font-family: var(--font-pixel), serif;
  font-size: 16px;
  font-weight: bold;
  color: #b45309;
  text-shadow: 1px 1px 0 #1a1008;
}
</style>
