<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/services/api.ts'
import { useI18n } from 'vue-i18n'
import type {InvitedUser} from "@/types/InvitedUser.ts";

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
  <div class="invites-section honeywood-panel-paper">
    <h3>{{ t('invite_list.invited_users') }}</h3>
    <div v-if="isLoading" class="loading">{{ t('loading') }}</div>
    <div v-else-if="invites.length === 0" class="no-invites">
      {{ t('invite_list.no_invites') }}
    </div>
    <div v-else class="invites-list">
      <div class="invite-card honeywood-slot" v-for="invite in invites" :key="invite.id">
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
  margin-top: 16px;
  padding: 16px;
  color: #3f2e21;
  width: 100%;
  box-sizing: border-box;
}

.invites-section h3 {
  font-size: 13px;
  margin-bottom: 12px;
  color: #3f2e21;
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
  box-sizing: border-box;
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

.invite-name {
  font-size: 11px;
  font-weight: bold;
  color: #3f2e21;
}

.invite-date {
  font-size: 9px;
  color: #7c624d;
}

.no-invites {
  font-size: 11px;
  color: #7c624d;
  margin-top: 8px;
}
</style>
