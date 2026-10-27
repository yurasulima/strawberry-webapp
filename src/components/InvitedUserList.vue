<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/services/api.ts'
import { useI18n } from 'vue-i18n'
import { Card, PixelText } from '@/components/pixel'
import type { InvitedUser } from "@/types/InvitedUser.ts";

const { t } = useI18n()

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
  <Card width="100%" height="auto" :padding="12" class="invites-card">
    <h3 class="invites-title">{{ t('invite_list.invited_users') }}</h3>

    <div v-if="isLoading" class="state-msg">
      <span>{{ t('loading') }}</span>
    </div>
    <div v-else-if="invites.length === 0" class="no-invites">
      <span>{{ t('invite_list.no_invites') }}</span>
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
            <PixelText :text="`${invite.invitedUser.firstName ?? ''} ${invite.invitedUser.lastName ?? ''}`.trim()" />
          </div>
          <span class="invite-date">
            {{ new Date(invite.createdAt).toLocaleString() }}
          </span>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.invites-card {
  margin-top: 16px;
  width: 100%;
}

.invites-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: bold;
}

.invites-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.invite-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid rgba(63, 46, 33, 0.2);
  border-radius: 4px;
  background: #fff8eb;
}

.invite-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #3f2e21;
}

.invite-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invite-date {
  font-size: 11px;
  color: #7c624d;
}

.no-invites, .state-msg {
  text-align: center;
  margin-top: 8px;
  color: #7c624d;
}
</style>
