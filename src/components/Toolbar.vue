<script setup lang="ts">
import {
  CardPrimary,
  AvatarBorder,
  SettingsButton,
  Image,
  Card
} from '@/components/pixel'
import { playClickSound } from '@/services/sound'

const props = defineProps<{
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  money?: number
  strawberry?: number
  language_code?: string | null
}>()

const emit = defineEmits<{
  (e: 'openSettings'): void
}>()

function handleOpenSettings() {
  playClickSound()
  emit('openSettings')
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

    <!-- Resource Cards underneath avatar on the left -->
    <div class="resource-cards-list">
      <Card width="fit-content" height="36px" :padding="0" class="resource-card">
        <div class="resource-row">
          <Image src="/ui/money.png" size="28" alt="Money" class="res-icon" />
          <span class="res-amount">{{ props.money ?? 0 }}</span>
        </div>
      </Card>

      <Card width="fit-content" height="36px" :padding="0" class="resource-card">
        <div class="resource-row">
          <Image src="/ui/strawberry.png" size="24" alt="Strawberry" class="res-icon" />
          <span class="res-amount">{{ props.strawberry ?? 0 }}</span>
        </div>
      </Card>
    </div>
  </div>
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
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: #1a1008;
  line-height: 1.2;
  word-break: break-word;
  text-align: center;
  flex-grow: 1;
}

.settings-btn {
  flex-shrink: 0;
}

.resource-cards-list {
  display: flex;
  flex-direction: row;
  gap: 4px;
  margin-top: 36px;
  margin-left: 0;
  align-self: flex-start;
}

.resource-card {
  min-width: 110px;
  width: fit-content;
  max-width: 180px;
  height: 36px;
  box-sizing: border-box;
  z-index: 1;
}

.resource-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 100%;
  padding-left: 6px;
  padding-right: 12px;
  box-sizing: border-box;
  white-space: nowrap;
  width: 100%;
}

.res-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.res-amount {
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: #494643;
  text-shadow: none;
  text-align: right;
  flex-grow: 1;
}
</style>
