<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/services/api.ts'
import { useI18n } from 'vue-i18n'
import { AppCard, AppText } from '@/components/ui'
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
  <AppCard variant="paper" class="invites-card">
    <AppText variant="subtitle" as="h3" class="invites-title">{{ t('invite_list.invited_users') }}</AppText>

    <div v-if="isLoading" class="state-msg">
      <AppText variant="body">{{ t('loading') }}</AppText>
    </div>
    <div v-else-if="invites.length === 0" class="no-invites">
      <AppText variant="body" color="muted">{{ t('invite_list.no_invites') }}</AppText>
    </div>
    <div v-else class="invites-list">
      <div class="invite-card honeywood-slot" v-for="invite in invites" :key="invite.id">
        <img
            :src="invite.invitedUser.photoUrl || '/default-avatar.png'"
            class="invite-avatar"
            alt="Avatar"
        />
        <div class="invite-info">
          <AppText variant="subtitle" as="div" class="invite-name">
            {{ invite.invitedUser.firstName }} {{ invite.invitedUser.lastName }}
          </AppText>
          <AppText variant="caption" color="muted" class="invite-date">
            {{ new Date(invite.createdAt).toLocaleString() }}
          </AppText>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.invites-card {
  margin-top: 16px;
  width: 100%;
}

.invites-title {
  margin-bottom: 12px;
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

.no-invites, .state-msg {
  text-align: center;
  margin-top: 8px;
}
</style>
