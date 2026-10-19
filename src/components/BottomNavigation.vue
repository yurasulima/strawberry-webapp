<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { playTabSound } from '@/services/sound'

const props = defineProps<{ activeTab: 'clicker' | 'profile' | 'users' | 'debug' | 'business' }>()
const emit = defineEmits<{
  (e: 'changeTab', tab: 'clicker' | 'profile' | 'users' | 'debug' | 'business'): void
}>()

const { t } = useI18n()

const profileClickCount = ref(0)
let lastClickTime = 0

function switchTab(tab: 'clicker' | 'profile' | 'users' | 'debug' | 'business') {
  playTabSound()
  emit('changeTab', tab)
}

function handleProfileClick() {
  playTabSound()
  const now = Date.now()
  if (now - lastClickTime > 600) {
    profileClickCount.value = 1
  } else {
    profileClickCount.value++
  }

  lastClickTime = now

  if (profileClickCount.value >= 7) {
    emit('changeTab', 'debug')
    profileClickCount.value = 0
  } else {
    emit('changeTab', 'profile')
  }
}
</script>

<template>
  <div class="bottom-navigation honeywood-panel">
    <button
        :class="{ active: props.activeTab === 'clicker' }"
        @click="switchTab('clicker')"
    >
      <Icon icon="pixelarticons:gamepad" class="pixel-icon" />
      <span v-if="props.activeTab === 'clicker'" class="label">{{ t('bottomNav.game') }}</span>
    </button>
    <button
        :class="{ active: props.activeTab === 'profile' }"
        @click="handleProfileClick"
    >
      <Icon icon="pixelarticons:user" class="pixel-icon" />
      <span v-if="props.activeTab === 'profile'" class="label">{{ t('bottomNav.profile') }}</span>
    </button>

    <button
        :class="{ active: props.activeTab === 'business' }"
        @click="switchTab('business')"
    >
      <Icon icon="pixelarticons:briefcase" class="pixel-icon" />
      <span v-if="props.activeTab === 'business'" class="label">{{ t('bottomNav.business') }}</span>
    </button>

    <button
        :class="{ active: props.activeTab === 'users' }"
        @click="switchTab('users')"
    >
      <Icon icon="pixelarticons:users" class="pixel-icon" />
      <span v-if="props.activeTab === 'users'" class="label">{{ t('bottomNav.players') }}</span>
    </button>
  </div>
</template>



<style scoped>

.bottom-navigation {
  display: flex;
  justify-content: space-around;
  padding: 6px 12px;
  width: 100%;
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 420px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.4);
}

.bottom-navigation button {
  user-select: none;
  background: none;
  border: none;
  color: #3f2e21;
  font-size: 11px;
  font-family: var(--font-pixel);
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease, transform 0.1s ease;
  flex-grow: 1;
  margin: 0 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
}

.bottom-navigation button .pixel-icon {
  font-size: 22px;
  width: 22px;
  height: 22px;
}

.bottom-navigation button .label {
  font-size: 10px;
  margin-top: 4px;
}

.bottom-navigation button.active {
  background-color: rgba(63, 46, 33, 0.2);
  color: #1a1008;
  font-weight: bold;
}
</style>
