<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ activeTab: 'clicker' | 'profile' | 'users' }>()
const emit = defineEmits<{ (e: 'changeTab', tab: 'clicker' | 'profile' | 'users'): void }>()


emit('changeTab', 'clicker')
emit('changeTab', 'clicker')
emit('changeTab', 'clicker')
const { t } = useI18n()
</script>
<template>
  <div class="bottom-navigation">
    <button
        :class="{ active: props.activeTab === 'clicker' }"
        @click="emit('changeTab', 'clicker')"
    >
      <span class="icon">🎮</span>
      <span v-if="props.activeTab === 'clicker'" class="label">{{ t('bottomNav.game') }}</span>
    </button>
    <button
        :class="{ active: props.activeTab === 'profile' }"
        @click="emit('changeTab', 'profile')"
    >
      <span class="icon">👤</span>
      <span v-if="props.activeTab === 'profile'" class="label">{{ t('bottomNav.profile') }}</span>
    </button>
    <button
        :class="{ active: props.activeTab === 'users' }"
        @click="emit('changeTab', 'users')"
    >
      <span class="icon">🧑‍🤝‍🧑</span>
      <span v-if="props.activeTab === 'users'" class="label">{{ t('bottomNav.players') }}</span>
    </button>
  </div>
</template>



<style scoped>

.bottom-navigation {
  display: flex;
  justify-content: space-around;
  background-color: #b8cfce;
  padding: 10px 0;
  border-top: 3px solid #7f8caa;
  width: 100%;
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 420px;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.3);
}

.bottom-navigation button {
  user-select: none;
  background: none;
  border: none;
  color: #333446;
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease, color 0.2s ease;
  flex-grow: 1;
  margin: 0 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
}

.bottom-navigation button .icon {
  font-size: 22px;
}

.bottom-navigation button .label {
  font-size: 12px;
  margin-top: 4px;
}

.bottom-navigation button.active {
  background-color: #7f8caa;
  color: #eaecef;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(127, 140, 170, 0.7);
}
</style>
