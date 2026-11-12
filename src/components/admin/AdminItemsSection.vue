<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {useI18n} from 'vue-i18n'
import api from '@/services/api.ts'
import type {User} from '@/types/User.ts'
import {
  CardPrimary,
  Card,
  ButtonText,
  PixelModal,
  ItemIcon,
  AddButton,
  DeleteButton,
  EditButton
} from '@/components/pixel'
import {playClickSound, playCoinSound} from '@/services/sound'
import {useToastStore} from '@/stores/toast.ts'
import {useItemMeta} from '@/composables/useItemMeta'
import {useItemCatalogStore} from '@/stores/itemCatalog'

const {t} = useI18n()
const toastStore = useToastStore()
const catalog = useItemCatalogStore()
const {itemTitle: resolveItemTitle} = useItemMeta()

interface AdminItem {
  id: number
  name: string
  sellPrice?: number | null
  buyPrice?: number | null
  nameUk?: string | null
  nameEn?: string | null
  nameRu?: string | null
  iconVersion?: number | null
  emojiId?: string | null
  emojiFallback?: string | null
}

const items = ref<AdminItem[]>([])
const isLoading = ref(true)
const deletingId = ref<number | null>(null)

// Створення предмета
const isCreateOpen = ref(false)
const newItemName = ref('')
const newSellPrice = ref<number | null>(1)
const newBuyPrice = ref<number | null>(1)
const isCreating = ref(false)
const newNameUk = ref('')
const newNameEn = ref('')
const newNameRu = ref('')
const newEmojiFallback = ref('🍓')
const newIconFile = ref<File | null>(null)
const newIconPreview = ref<string | null>(null)
const newFileInput = ref<HTMLInputElement | null>(null)

// Редагування предмета
const isEditOpen = ref(false)
const editingItem = ref<AdminItem | null>(null)
const editSellPrice = ref<number | null>(1)
const editBuyPrice = ref<number | null>(1)
const isSavingEdit = ref(false)
const editNameUk = ref('')
const editNameEn = ref('')
const editNameRu = ref('')
const editEmojiFallback = ref('🍓')
const editFileInput = ref<HTMLInputElement | null>(null)
const isIconBusy = ref(false)

// Глобальна перегенерація емодзі
const isRebuildingEmojis = ref(false)

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
const hasSearched = ref(false)
const selectedUser = ref<User | null>(null)
const isGiving = ref(false)

const sortedItems = computed(() => [...items.value].sort((a, b) => a.name.localeCompare(b.name)))

const isNameValid = computed(() => /^[a-z0-9_]+$/.test(newItemName.value.trim()))
const showNameError = computed(() => newItemName.value.trim().length > 0 && !isNameValid.value)
const canGive = computed(() => !!selectedUser.value && !!giveAmount.value && giveAmount.value !== 0)

function itemTitle(name: string, item?: AdminItem | null): string {
  return resolveItemTitle(name, item)
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

async function load(silent = false) {
  if (!silent) isLoading.value = true
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
  newSellPrice.value = 1
  newBuyPrice.value = 1
  newNameUk.value = ''
  newNameEn.value = ''
  newNameRu.value = ''
  newEmojiFallback.value = '🍓'
  clearNewIcon()
  isCreateOpen.value = true
}

async function createItem() {
  if (!isNameValid.value || isCreating.value) return
  isCreating.value = true
  try {
    const res = await api.post<AdminItem>('/admin/items', {
      name: newItemName.value.trim(),
      sellPrice: newSellPrice.value ?? 1,
      buyPrice: newBuyPrice.value ?? 1,
      nameUk: newNameUk.value,
      nameEn: newNameEn.value,
      nameRu: newNameRu.value,
      emojiFallback: newEmojiFallback.value || '🍓'
    })
    if (newIconFile.value && res.data?.id) {
      try {
        await uploadIcon(res.data.id, newIconFile.value)
      } catch (err) {
        toastStore.showToast(errorText(err), 'error')
      }
    }
    toastStore.showToast(t('admin.success_update'), 'success')
    isCreateOpen.value = false
    clearNewIcon()
    await refreshAfterChange()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isCreating.value = false
  }
}

function openEdit(item: AdminItem) {
  playClickSound()
  editingItem.value = item
  editSellPrice.value = item.sellPrice ?? 1
  editBuyPrice.value = item.buyPrice ?? 1
  editNameUk.value = item.nameUk ?? ''
  editNameEn.value = item.nameEn ?? ''
  editNameRu.value = item.nameRu ?? ''
  editEmojiFallback.value = item.emojiFallback ?? '🍓'
  isEditOpen.value = true
}

async function saveEdit() {
  if (!editingItem.value || isSavingEdit.value) return
  isSavingEdit.value = true
  try {
    await api.put(`/admin/items/${editingItem.value.id}`, {
      name: editingItem.value.name,
      sellPrice: editSellPrice.value ?? 1,
      buyPrice: editBuyPrice.value ?? 1,
      nameUk: editNameUk.value,
      nameEn: editNameEn.value,
      nameRu: editNameRu.value,
      emojiFallback: editEmojiFallback.value || '🍓'
    })
    toastStore.showToast(t('admin.success_update'), 'success')
    isEditOpen.value = false
    await refreshAfterChange()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isSavingEdit.value = false
  }
}

async function rebuildAllEmojis() {
  playClickSound()
  isRebuildingEmojis.value = true
  try {
    const res = await api.post<{ successCount: number; totalItems: number; ownerUserIdUsed: number; results: any[] }>('/admin/items/rebuild-emojis')
    const data = res.data
    if (data) {
      if (data.successCount > 0) {
        toastStore.showToast(`Успішно перегенеровано ${data.successCount}/${data.totalItems} емодзі (Owner ID: ${data.ownerUserIdUsed})`, 'success')
      } else {
        const firstError = data.results?.find((r: any) => r.error)?.error || 'Помилка генерації'
        toastStore.showToast(`0/${data.totalItems} емодзі: ${firstError}`, 'error')
      }
    }
    await refreshAfterChange()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isRebuildingEmojis.value = false
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
    await refreshAfterChange()
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
  hasSearched.value = false
  selectedUser.value = null
  isGiveOpen.value = true
}

async function searchUsers() {
  isSearching.value = true
  selectedUser.value = null
  try {
    const res = await api.get<User[]>('/admin/users', {params: {search: userSearch.value}})
    foundUsers.value = (res.data || []).slice(0, 30)
    hasSearched.value = true
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

// ───────── Текстури ─────────

const ICON_MAX_BYTES = 64 * 1024

function iconFileError(file: File): string | null {
  return file.type === 'image/png' && file.size <= ICON_MAX_BYTES ? null : t('admin.icon_invalid')
}

async function uploadIcon(id: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  await api.post(`/admin/items/${id}/icon`, form, {headers: {'Content-Type': 'multipart/form-data'}})
}

function clearNewIcon() {
  if (newIconPreview.value) URL.revokeObjectURL(newIconPreview.value)
  newIconFile.value = null
  newIconPreview.value = null
}

function onNewIconPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const problem = iconFileError(file)
  if (problem) {
    toastStore.showToast(problem, 'error')
    return
  }
  clearNewIcon()
  newIconFile.value = file
  newIconPreview.value = URL.createObjectURL(file)
}

async function onEditIconPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const item = editingItem.value
  if (!item || !file || isIconBusy.value) return
  const problem = iconFileError(file)
  if (problem) {
    toastStore.showToast(problem, 'error')
    return
  }
  isIconBusy.value = true
  try {
    await uploadIcon(item.id, file)
    toastStore.showToast(t('admin.success_update'), 'success')
    await refreshAfterChange(item.id)
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isIconBusy.value = false
  }
}

async function removeIcon() {
  const item = editingItem.value
  if (!item || isIconBusy.value) return
  isIconBusy.value = true
  try {
    await api.delete(`/admin/items/${item.id}/icon`)
    toastStore.showToast(t('admin.success_update'), 'success')
    await refreshAfterChange(item.id)
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isIconBusy.value = false
  }
}

async function rebuildSingleEmoji(item?: AdminItem | null) {
  const it = item || editingItem.value
  if (!it || isIconBusy.value) return
  isIconBusy.value = true
  try {
    await api.post(`/admin/items/${it.id}/rebuild-emoji`)
    toastStore.showToast('Емодзі предмета успішно оновлено в Telegram!', 'success')
    await refreshAfterChange(it.id)
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isIconBusy.value = false
  }
}

async function refreshAfterChange(keepEditingId?: number) {
  await Promise.all([load(true), catalog.load(true)])
  if (keepEditingId !== undefined) {
    editingItem.value = items.value.find(i => i.id === keepEditingId) ?? null
  }
}

onMounted(() => load())
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <div class="section-header">
        <h2 class="title">{{ t('admin.nav.items') }}</h2>
        <div style="display: flex; gap: 6px;">
          <ButtonText :loading="isRebuildingEmojis" @click="rebuildAllEmojis">✨ Емодзі</ButtonText>
          <ButtonText @click="openCreate">+ {{ t('admin.create') }}</ButtonText>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">{{ t('invite_list.loading') }}</div>

      <Card v-else-if="sortedItems.length" width="100%" height="auto" :padding="6" class="list-card">
        <ul class="item-grid">
          <li v-for="item in sortedItems" :key="item.id" class="item-card">
            <span class="item-card__id">#{{ item.id }}</span>

            <div class="item-card__icon">
              <ItemIcon :item="item.name" size="56"/>
            </div>

            <h3 class="item-card__name">{{ itemTitle(item.name, item) }}</h3>
            <code class="item-card__key">{{ item.name }}</code>
            <code v-if="item.emojiId" class="item-card__key" style="color: #2e7d32;" :title="`Telegram Custom Emoji ID: ${item.emojiId}`">
              {{ item.emojiFallback || '🍓' }} {{ item.emojiId }}
            </code>

            <div class="item-card__prices">
              <div class="price-cell price-cell--sell">
                <span class="price-cell__label">{{ t('admin.sell_price') }}</span>
                <strong class="price-cell__value">{{ item.sellPrice ?? '-' }}</strong>
              </div>
              <div class="price-cell price-cell--buy">
                <span class="price-cell__label">{{ t('admin.buy_price') }}</span>
                <strong class="price-cell__value">{{ item.buyPrice ?? '-' }}</strong>
              </div>
            </div>

            <div class="item-card__actions">
              <EditButton @click="openEdit(item)"/>
              <AddButton @click="openGive(item)"/>
              <DeleteButton :loading="deletingId === item.id" @click="askDelete(item)"/>
            </div>
          </li>
        </ul>
      </Card>

      <div v-else class="empty-state">{{ t('admin.no_items') }}</div>
    </CardPrimary>

    <!-- Створення предмета -->
    <PixelModal v-model="isCreateOpen" :title="t('admin.item_create_title')" width="320px"
                @close="isCreateOpen = false">
      <div class="modal-body">
        <div class="input-field-row">
          <label>{{ t('admin.field_key') }}</label>
          <input
              v-model="newItemName"
              type="text"
              class="pixel-input"
              :class="{ 'is-invalid': showNameError }"
              placeholder="chest_gardener"
          />
          <span v-if="showNameError" class="hint-text error-text">{{ t('admin.field_key_invalid') }}</span>
          <span v-else class="hint-text">a-z, 0-9, _</span>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · UK</label>
          <input v-model="newNameUk" type="text" maxlength="128" class="pixel-input" placeholder="Полуниця"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · EN</label>
          <input v-model="newNameEn" type="text" maxlength="128" class="pixel-input" placeholder="Strawberry"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · RU</label>
          <input v-model="newNameRu" type="text" maxlength="128" class="pixel-input" placeholder="Клубника"/>
        </div>
        <div class="input-field-row">
          <label>Telegram Fallback Emoji</label>
          <input v-model="newEmojiFallback" type="text" maxlength="8" class="pixel-input" placeholder="🍓"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_icon') }}</label>
          <div class="icon-row">
            <img v-if="newIconPreview" :src="newIconPreview" alt="" class="icon-preview"/>
            <input ref="newFileInput" type="file" accept="image/png" class="file-hidden" @change="onNewIconPicked"/>
            <ButtonText @click="newFileInput?.click()">{{ t('admin.icon_upload') }}</ButtonText>
          </div>
          <span class="hint-text">{{ t('admin.icon_hint') }}</span>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.sell_price') }}</label>
          <input v-model.number="newSellPrice" type="number" min="0" class="pixel-input"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.buy_price') }}</label>
          <input v-model.number="newBuyPrice" type="number" min="0" class="pixel-input"/>
        </div>
        <div class="modal-actions">
          <ButtonText :loading="isCreating" :disabled="!isNameValid" @click="createItem">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Редагування предмету -->
    <PixelModal v-model="isEditOpen" :title="t('admin.item_edit_title')" width="320px" @close="isEditOpen = false">
      <div class="modal-body">
        <div class="user-telemetry-title">{{ editingItem ? itemTitle(editingItem.name, editingItem) : '' }}</div>

        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · UK</label>
          <input v-model="editNameUk" type="text" maxlength="128" class="pixel-input"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · EN</label>
          <input v-model="editNameEn" type="text" maxlength="128" class="pixel-input"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · RU</label>
          <input v-model="editNameRu" type="text" maxlength="128" class="pixel-input"/>
        </div>
        <div class="input-field-row">
          <label>Telegram Fallback Emoji</label>
          <input v-model="editEmojiFallback" type="text" maxlength="8" class="pixel-input" placeholder="🍓"/>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_icon') }}</label>
          <div class="icon-row">
            <ItemIcon v-if="editingItem" :item="editingItem.name" size="48"/>
            <input ref="editFileInput" type="file" accept="image/png" class="file-hidden" @change="onEditIconPicked"/>
            <ButtonText :loading="isIconBusy" @click="editFileInput?.click()">{{ t('admin.icon_upload') }}</ButtonText>
            <ButtonText v-if="editingItem" :loading="isIconBusy" @click="rebuildSingleEmoji(editingItem)">✨ Емодзі</ButtonText>
            <ButtonText v-if="editingItem?.iconVersion" :loading="isIconBusy" @click="removeIcon">
              {{ t('admin.icon_remove') }}
            </ButtonText>
          </div>
          <span class="hint-text">{{ t('admin.icon_hint') }}</span>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.sell_price') }}</label>
          <input v-model.number="editSellPrice" type="number" min="0" class="pixel-input"/>
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.buy_price') }}</label>
          <input v-model.number="editBuyPrice" type="number" min="0" class="pixel-input"/>
        </div>

        <div class="modal-actions">
          <ButtonText :loading="isSavingEdit" @click="saveEdit">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Підтвердження видалення -->
    <PixelModal v-model="isDeleteOpen" :title="t('admin.confirm_title')" width="320px" @close="isDeleteOpen = false">
      <div class="modal-body">
        <span>{{ t('admin.confirm_delete', {name: itemToDelete ? itemTitle(itemToDelete.name) : ''}) }}</span>
        <div class="modal-actions">
          <ButtonText :loading="deletingId !== null" @click="confirmDelete">
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
          <ButtonText :loading="isSearching" @click="searchUsers">OK</ButtonText>
        </div>

        <ul v-if="foundUsers.length" class="user-pick-list">
          <li
              v-for="u in foundUsers"
              :key="u.userId"
              class="user-pick-item"
              :class="{ 'is-selected': selectedUser?.userId === u.userId }"
              @click="selectedUser = u"
          >
            <img :src="u.photoUrl ?? '/default-avatar.png'" alt="" class="user-pick-avatar"/>
            <span>{{ userTitle(u) }}</span>
          </li>
        </ul>
        <div v-else-if="hasSearched && !isSearching" class="empty-state">
          {{ t('admin.no_users_found') }}
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.amount') }}</label>
          <input v-model.number="giveAmount" type="number" class="pixel-input"/>
          <span class="hint-text">{{ t('admin.amount_hint') }}</span>
        </div>

        <div class="modal-actions">
          <ButtonText :loading="isGiving" :disabled="!canGive" @click="give">
            {{ t('admin.give') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>
  </div>
</template>

<style scoped>
.admin-container {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: var(--font-pixel);
  color: #3f2e21;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.section-header .title {
  margin: 0;
  text-align: left;
}

.title {
  margin: 0 0 12px;
  text-align: center;
  font-size: 22px;
  font-weight: normal;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 16px;
  font-size: 16px;
}

.list-card {
  width: 100%;
}

.entity-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 6px;
}

.entity-row + .entity-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.entity-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entity-name {
  font-size: 18px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint-text {
  font-size: 16px;
  color: #7c624d;
}

.entity-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
  font-family: var(--font-pixel);
}

.input-field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-field-row label {
  font-size: 16px;
  color: #5d4037;
}

.pixel-input {
  flex: 1;
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: var(--font-pixel);
  font-size: 16px;
  color: #3f2e21;
  outline: none;
  box-sizing: border-box;
}

.pixel-input:focus {
  border-color: #2e7d32;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.user-telemetry-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #3f2e21;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.user-pick-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 160px;
  overflow-y: auto;
  border: 2px solid #5d4037;
  border-radius: 6px;
  background: #fff8eb;
}

.user-pick-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 16px;
}

.user-pick-item + .user-pick-item {
  border-top: 1px solid rgba(63, 46, 33, 0.18);
}

.user-pick-item.is-selected {
  background: rgba(46, 125, 50, 0.18);
  font-weight: bold;
}

.user-pick-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #5d4037;
  object-fit: cover;
}

.item-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 8px 8px;
  border: 3px solid rgba(0, 0, 0, 0.55);
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35);
  text-align: center;
  min-width: 0;
}

.item-card__id {
  position: absolute;
  top: 0;
  left: 0;
  padding: 1px 6px;
  font-size: 10px;
  opacity: 0.85;
  background: rgba(0, 0, 0, 0.45);
  border-right: 2px solid rgba(0, 0, 0, 0.55);
  border-bottom: 2px solid rgba(0, 0, 0, 0.55);
}

.item-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  background: rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.35);
}

.item-card__icon :deep(img) {
  image-rendering: pixelated;
}

.item-card__name {
  margin: 2px 0 0;
  max-width: 100%;
  font-size: 13px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-card__key {
  max-width: 100%;
  font-size: 10px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card__prices {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 2px;
}

.price-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  border: 2px solid;
  background: rgba(0, 0, 0, 0.25);
  min-width: 0;
}

.price-cell--sell {
  border-color: #4caf50;
}

.price-cell--buy {
  border-color: #e0a526;
}

.price-cell__label {
  max-width: 100%;
  font-size: 9px;
  text-transform: uppercase;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-cell__value {
  font-size: 14px;
}

.item-card__actions {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 2px dashed rgba(255, 255, 255, 0.15);
}

.pixel-input.is-invalid {
  border-color: #d33;
}

.error-text {
  color: #d33;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.file-hidden {
  display: none;
}

.icon-preview {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
}
</style>
