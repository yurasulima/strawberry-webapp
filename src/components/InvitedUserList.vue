<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/services/api.ts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface InvitedUser {
  id: number
  telegramId: number
  firstName: string
  lastName: string
  photoUrl: string
}

interface Invite {
  id: number
  invitedUser: InvitedUser
  createdAt: string
}

const invites = ref<Invite[]>([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const response = await api.get('/users/me/invites')
    invites.value = response.data
  } catch (err) {
    console.error('Failed to fetch invites:', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="invites-section">
    <h3>{{ t('invite_list.invited_users') }}</h3>
    <div v-if="isLoading" class="loading">{{ t('loading') }}</div>
    <div v-else-if="invites.length === 0">
      {{ t('invite_list.no_invites') }}
    </div>
    <div v-else class="invites-list">
      <div class="invite-card" v-for="invite in invites" :key="invite.id">
        <img
            :src="invite.invitedUser.photoUrl || '/default-avatar.png'"
            class="invite-avatar"
            alt="Avatar"
        />
        <div class="invite-info">
          <div class="invite-name">
            {{ invite.invitedUser.firstName }} {{ invite.invitedUser.lastName }}
          </div>
          <div class="invite-date">
            {{ new Date(invite.createdAt).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invites-section {
  margin-top: 30px;
  background-color: #f3f7f9;
  padding: 16px;
  border-radius: 14px;
  box-shadow: 0 0 10px #00000022;
  color: #1e293b;
  width: 100%;
}

.invites-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.invite-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background-color: #e0f0f3;
  border-radius: 10px;
  box-shadow: inset 0 0 4px #bbb;
}

.invite-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.invite-info {
  display: flex;
  flex-direction: column;
}

.invite-name {
  font-size: 16px;
  font-weight: bold;
  color: #102a43;
}

.invite-date {
  font-size: 12px;
  color: #6b7280;
}
</style>
