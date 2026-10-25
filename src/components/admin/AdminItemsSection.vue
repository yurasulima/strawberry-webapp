<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import type { User } from '@/types/User.ts'
import { CardPrimary, Card, ButtonText, PixelModal } from '@/components/pixel'
import { playClickSound, playCoinSound } from '@/services/sound'
import { useToastStore } from '@/stores/toast.ts'

const { t, te } = useI18n()
const toastStore = useToastStore()

/**
 * Контракт з бекендом (див. документацію):
 *   GET    /admin/items                    -> [{ id, name }]
 *   POST   /admin/items                    { name }
 *   DELETE /admin/items/{id}
 *   GET    /admin/users?search=...         (вже існує) — пошук гравця
 *   POST   /admin/users/{userId}/items     { name, amount }  (amount може бути від'ємним — списання)
 */
interface AdminItem {
  id: number
  name: string
}

const items = ref<AdminItem[]>([])
const isLoading = ref(true)
const deletingId = ref<number | null>(null)

// Створення предмета
const isCreateOpen = ref(false)
const newItemName = ref('')
const isCreating = ref(false)

// Підтвердження видалення
const isDeleteOpen = ref(false)
const itemToDelete = ref<AdminItem | null>(null)

// Видача предмета гравцю
const isGiveOpen = ref(false)
const giveItem = ref<AdminItem | null>(null)
const giveAmount = ref<number | null>(1)
const userSearch = ref('')
const foundUsers = ref<User[]>([])
const isSearching = ref(false)
const selectedUser = ref<User | null>(null)
const isGiving = ref(false)

const sortedItems = computed(() => [...items.value].sort((a, b) => a.name.localeCompare(b.name)))

const isNameValid = computed(() => /^[a-z0-9_]+$/.test(newItemName.value.trim()))
const canGive = computed(() => !!selectedUser.value && !!giveAmount.value && giveAmount.value !== 0)

function itemTitle(name: string): string {
  const key = `inventory.items.${name.toLowerCase().trim()}`
  return te(key) ? t(key) : name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function userTitle(u: User): string {
  const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
  return full || u.username || `#${u.telegramId}`
}

function errorText(err: any): string {
  const raw = err?.response?.data?.message || err?.response?.data || err?.message
  if (!raw) return t('business.operation_error')
  return typeof raw === 'string' ? raw : JSON.stringify(raw)
}

async function load() {
  isLoading.value = true
  try {
    const res = await api.get<AdminItem[]>('/admin/items')
    items.value = res.data || []
  } catch (err) {
    console.error('Error fetching admin items:', err)
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  playClickSound()
  newItemName.value = ''
  isCreateOpen.value = true
}

async function createItem() {
  if (!isNameValid.value || isCreating.value) return
  isCreating.value = true
  try {
    await api.post('/admin/items', { name: newItemName.value.trim() })
    toastStore.showToast(t('admin.success_update'), 'success')
    isCreateOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isCreating.value = false
  }
}

function askDelete(item: AdminItem) {
  playClickSound()
  itemToDelete.value = item
  isDeleteOpen.value = true
}

async function confirmDelete() {
  const item = itemToDelete.value
  if (!item) return
  deletingId.value = item.id
  try {
    await api.delete(`/admin/items/${item.id}`)
    toastStore.showToast(t('admin.deleted'), 'success')
    isDeleteOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    deletingId.value = null
  }
}

function openGive(item: AdminItem) {
  playClickSound()
  giveItem.value = item
  giveAmount.value = 1
  userSearch.value = ''
  foundUsers.value = []
  selectedUser.value = null
  isGiveOpen.value = true
}

async function searchUsers() {
  isSearching.value = true
  try {
    const res = await api.get<User[]>('/admin/users', { params: { search: userSearch.value } })
    foundUsers.value = (res.data || []).slice(0, 30)
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isSearching.value = false
  }
}

async function give() {
  if (!canGive.value || !giveItem.value || !selectedUser.value || isGiving.value) return
  isGiving.value = true
  try {
    await api.post(`/admin/users/${selectedUser.value.userId}/items`, {
      name: giveItem.value.name,
      amount: giveAmount.value,
    })
    playCoinSound()
    toastStore.showToast(t('admin.item_given'), 'success')
    isGiveOpen.value = false
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isGiving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <div class="section-header">
        <h2 class="title">{{ t('admin.nav.items') }}</h2>
        <ButtonText padding="6px 14px" @click="openCreate">+ {{ t('admin.create') }}</ButtonText>
      </div>

      <div v-if="isLoading" class="loading-state">{{ t('invite_list.loading') }}</div>

      <Card v-else-if="sortedItems.length" width="100%" height="auto" :padding="6" class="list-card">
        <ul class="entity-list">
          <li v-for="item in sortedItems" :key="item.id" class="entity-row">
            <div class="entity-info">
              <span class="entity-name">{{ itemTitle(item.name) }}</span>
              <span class="hint-text">ID {{ item.id }} · {{ item.name }}</span>
            </div>
            <div class="entity-actions">
              <ButtonText padding="0 10px" @click="openGive(item)">{{ t('admin.give') }}</ButtonText>
              <ButtonText padding="0 10px" :loading="deletingId === item.id" @click="askDelete(item)">
                {{ t('admin.delete') }}
              </ButtonText>
            </div>
          </li>
        </ul>
      </Card>

      <div v-else class="empty-state">{{ t('admin.no_items') }}</div>
    </CardPrimary>

    <!-- Створення предмета -->
    <PixelModal v-model="isCreateOpen" :title="t('admin.item_create_title')" width="320px" @close="isCreateOpen = false">
      <div class="modal-body">
        <div class="input-field-row">
          <label>{{ t('admin.field_key') }}</label>
          <input
            v-model="newItemName"
            type="text"
            class="pixel-input"
            placeholder="chest_gardener"
            @keyup.enter="createItem"
          />
          <span class="hint-text">a-z, 0-9, _</span>
        </div>
        <div class="modal-actions">
          <ButtonText padding="0 20px" :loading="isCreating" :disabled="!isNameValid" @click="createItem">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Підтвердження видалення -->
    <PixelModal v-model="isDeleteOpen" :title="t('admin.confirm_title')" width="320px" @close="isDeleteOpen = false">
      <div class="modal-body">
        <span>{{ t('admin.confirm_delete', { name: itemToDelete ? itemTitle(itemToDelete.name) : '' }) }}</span>
        <div class="modal-actions">
          <ButtonText padding="0 20px" :loading="deletingId !== null" @click="confirmDelete">
            {{ t('admin.delete') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Видача предмета гравцю -->
    <PixelModal
      v-model="isGiveOpen"
      :title="giveItem ? `${t('admin.give')}: ${itemTitle(giveItem.name)}` : t('admin.give')"
      width="340px"
      @close="isGiveOpen = false"
    >
      <div class="modal-body">
        <div class="search-box">
          <input
            v-model="userSearch"
            type="text"
            class="pixel-input"
            :placeholder="t('admin.user_search_placeholder')"
            @keyup.enter="searchUsers"
          />
          <ButtonText padding="0 14px" :loading="isSearching" @click="searchUsers">OK</ButtonText>
        </div>

        <ul v-if="foundUsers.length" class="user-pick-list">
          <li
            v-for="u in foundUsers"
            :key="u.userId"
            class="user-pick-item"
            :class="{ 'is-selected': selectedUser?.userId === u.userId }"
            @click="selectedUser = u"
          >
            <img :src="u.photoUrl ?? '/default-avatar.png'" alt="" class="user-pick-avatar" />
            <span>{{ userTitle(u) }}</span>
          </li>
        </ul>

        <div class="input-field-row">
          <label>{{ t('admin.amount') }}</label>
          <input v-model.number="giveAmount" type="number" class="pixel-input" />
          <span class="hint-text">{{ t('admin.amount_hint') }}</span>
        </div>

        <div class="modal-actions">
          <ButtonText padding="0 20px" :loading="isGiving" :disabled="!canGive" @click="give">
            {{ t('admin.give') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>
  </div>
</template>

<style scoped src="./admin.css"></style>
