<script setup lang="ts">
import { ref, computed } from 'vue'
import { PixelModal, Card, PremiumBadge, PixelText, ButtonText } from '@/components/pixel'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { linkGoogleAccount, unlinkGoogleAccount, promptGoogleAuth } from '@/services/googleAuth'
import { playClickSound, playPurchaseSound } from '@/services/sound'

const props = withDefaults(defineProps<{
  modelValue?: boolean
}>(), {
  modelValue: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'close'): void
}>()

const userStore = useUserStore()

const toastStore = useToastStore()

const user = computed(() => userStore.user)
const level = computed(() => user.value?.level || 1)
const currentXp = computed(() => user.value?.xp || 0)
const xpToNext = computed(() => user.value?.xpToNextLevel || 650)
const isLinkingGoogle = ref(false)

const googleEmail = computed(() => user.value?.googleEmail || (user.value?.googleId ? 'Прив’язано' : null))

async function handleLinkGoogleCredential(idToken: string) {
  isLinkingGoogle.value = true
  try {
    const updatedUser = await linkGoogleAccount(idToken)
    if (updatedUser) {
      userStore.setUser(updatedUser)
    } else {
      await userStore.fetchUser()
    }
    playPurchaseSound()
    toastStore.showToast('Google акаунт успішно прив’язано!', 'success')
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Помилка при прив’язці Google акаунту'
    toastStore.showToast(msg, 'error')
  } finally {
    isLinkingGoogle.value = false
  }
}

function handleLinkGoogle() {
  playClickSound()
  promptGoogleAuth(handleLinkGoogleCredential)
}

async function handleUnlinkGoogle() {
  playClickSound()
  isLinkingGoogle.value = true
  try {
    const updatedUser = await unlinkGoogleAccount()
    if (updatedUser) {
      userStore.setUser(updatedUser)
    } else {
      await userStore.fetchUser()
    }
    toastStore.showToast('Google акаунт успішно відв’язано', 'info')
  } catch (err: any) {
    const msg = err.response?.data?.message || 'Помилка при відв’язці Google акаунту'
    toastStore.showToast(msg, 'error')
  } finally {
    isLinkingGoogle.value = false
  }
}

const progressPercent = computed(() => {
  if (!xpToNext.value || xpToNext.value <= 0) return 0
  return Math.min(100, Math.max(0, (currentXp.value / xpToNext.value) * 100))
})

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('uk-UA')
}

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <PixelModal
    :model-value="props.modelValue"
    title="Профіль Гравця"
    width="340px"
    @close="handleClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="profile-modal-body">
      <!-- Шапка профілю з аватаром та іменем -->
      <div class="profile-avatar-row">
        <img :src="user?.photoUrl || '/default-avatar.png'" class="profile-avatar-img" alt="Avatar" />
        <div class="profile-title-col">
          <span class="profile-name">
            <PixelText :text="`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Гравець'" />
          </span>
          <span v-if="user?.username" class="profile-username">@{{ user.username }}</span>
          <PremiumBadge v-if="user?.premium" class="profile-premium-badge" />
        </div>
      </div>

      <!-- Картка рівня та XP -->
      <Card width="100%" height="auto" :padding="12" class="xp-card">
        <div class="level-box">
          <div class="level-header">
            <span class="level-label">Рівень</span>
            <span class="level-val">{{ level }}</span>
          </div>

          <!-- Прогрес-бар XP -->
          <div class="xp-bar-frame">
            <div class="xp-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>

          <div class="xp-stats-row">
            <span class="xp-current">Поточний XP: <strong>{{ formatNumber(currentXp) }} XP</strong></span>
            <span class="xp-target">До наст. рівня: <strong>{{ formatNumber(xpToNext) }} XP</strong></span>
          </div>
        </div>
      </Card>

      <!-- Прив'язка Google акаунта -->
      <Card width="100%" height="auto" :padding="12" class="google-card">
        <div class="google-box">
          <div class="google-header">
            <span class="google-title">🌐 Google акаунт</span>
            <span class="google-status" :class="{ linked: !!googleEmail }">
              {{ googleEmail ? 'Прив’язано' : 'Не прив’язано' }}
            </span>
          </div>

          <p v-if="googleEmail" class="google-email-text">
            {{ googleEmail }}
          </p>

          <ButtonText
            v-if="!googleEmail"
            height="44"
            width="100%"
            padding="6px 12px"
            :loading="isLinkingGoogle"
            @click="handleLinkGoogle"
          >
            🔗 Прив'язати Google акаунт
          </ButtonText>

          <ButtonText
            v-else
            height="40"
            width="100%"
            padding="6px 12px"
            :loading="isLinkingGoogle"
            @click="handleUnlinkGoogle"
          >
            🔓 Відв'язати Google
          </ButtonText>
        </div>
      </Card>
    </div>
  </PixelModal>
</template>

<style scoped>
.profile-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #3f2e21;
  font-family: 'Crumbline', sans-serif;
  font-size: 16px;
}

.profile-avatar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(63, 46, 33, 0.06);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(63, 46, 33, 0.15);
}

.profile-avatar-img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #5d4037;
  flex-shrink: 0;
}

.profile-title-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.profile-name {
  font-size: 20px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-username {
  font-size: 14px;
  color: #5d4037;
}

.profile-premium-badge {
  margin-top: 2px;
}

.xp-card {
  box-sizing: border-box;
}

.level-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level-label {
  font-size: 18px;
  font-weight: bold;
  color: #3f2e21;
}

.level-val {
  font-family: var(--font-pixel), sans-serif;
  font-size: 18px;
  font-weight: bold;
  background-color: #d97706;
  color: #ffffff;
  padding: 2px 10px;
  border-radius: 6px;
  border: 2px solid #b45309;
}

.xp-bar-frame {
  width: 100%;
  height: 14px;
  background-color: #e2d3be;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 2px;
  box-sizing: border-box;
  overflow: hidden;
}

.xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.xp-stats-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  color: #5d4037;
}

.xp-current strong, .xp-target strong {
  color: #1d4ed8;
}

.google-card {
  box-sizing: border-box;
}

.google-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.google-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.google-title {
  font-size: 17px;
  font-weight: bold;
  color: #3f2e21;
}

.google-status {
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #efebe9;
  color: #795548;
}

.google-status.linked {
  background-color: #e8f5e9;
  color: #2e7d32;
  font-weight: bold;
}

.google-email-text {
  margin: 0;
  font-size: 14px;
  color: #5d4037;
  word-break: break-all;
}
</style>
