<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, Card, ButtonText, PixelModal, Switch, ItemIcon } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from '@/services/sound'
import { useToastStore } from '@/stores/toast.ts'
import EditButton from "@/components/pixel/EditButton.vue";
import DeleteButton from "@/components/pixel/DeleteButton.vue";

const { t, te } = useI18n()
const toastStore = useToastStore()

/**
 * Контракт з бекендом (див. README/документацію):
 *   GET    /admin/businesses
 *   POST   /admin/businesses            { name, price, yieldCount, yieldIntervalSeconds, item }
 *   PUT    /admin/businesses/{id}       { name, price, yieldCount, yieldIntervalSeconds, item }
 *   DELETE /admin/businesses/{id}
 */
interface AdminBusiness {
  id: number
  name: string
  price: number
  yieldCount: number
  yieldIntervalSeconds: number
  item: string
  minLevel?: number
  premiumOnly?: boolean
  waterable?: boolean
}

const businesses = ref<AdminBusiness[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const deletingId = ref<number | null>(null)

// Форма створення / редагування
const isFormOpen = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  price: 100 as number | null,
  yieldCount: 10 as number | null,
  yieldIntervalSeconds: 3600 as number | null,
  item: 'strawberry',
  minLevel: 1 as number | null,
  premiumOnly: false,
  waterable: false,
})

// Підтвердження видалення
const isDeleteOpen = ref(false)
const businessToDelete = ref<AdminBusiness | null>(null)

const sorted = computed(() =>
  [...businesses.value].sort((a, b) => (a.price ?? 0) - (b.price ?? 0) || a.id - b.id)
)

const isFormValid = computed(() => {
  const f = form.value
  return (
    f.name.trim().length > 0 &&
    f.item.trim().length > 0 &&
    (f.price ?? -1) >= 0 &&
    (f.yieldCount ?? 0) > 0 &&
    (f.yieldIntervalSeconds ?? 0) > 0
  )
})

function displayName(raw: string): string {
  const key = `business.names.${raw.toLowerCase().trim()}`
  return te(key) ? t(key) : raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatInterval(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h ? `${h}${t('admin.unit_h')}` : '', m ? `${m}${t('admin.unit_m')}` : '', s ? `${s}${t('admin.unit_s')}` : '']
    .filter(Boolean)
    .join(' ')
}

function errorText(err: any): string {
  const raw = err?.response?.data?.message || err?.response?.data || err?.message
  if (!raw) return t('business.operation_error')
  return typeof raw === 'string' ? raw : JSON.stringify(raw)
}

async function load() {
  isLoading.value = true
  try {
    const res = await api.get<AdminBusiness[]>('/admin/businesses')
    businesses.value = res.data || []
  } catch (err) {
    console.error('Error fetching admin businesses:', err)
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  playClickSound()
  editingId.value = null
  form.value = { name: '', price: 100, yieldCount: 10, yieldIntervalSeconds: 3600, item: 'strawberry', minLevel: 1, premiumOnly: false, waterable: false }
  isFormOpen.value = true
}

function openEdit(b: AdminBusiness) {
  playClickSound()
  editingId.value = b.id
  form.value = {
    name: b.name,
    price: b.price,
    yieldCount: b.yieldCount,
    yieldIntervalSeconds: b.yieldIntervalSeconds,
    item: b.item,
    minLevel: b.minLevel ?? 0,
    premiumOnly: !!b.premiumOnly,
    waterable: !!b.waterable,
  }
  isFormOpen.value = true
}

async function save() {
  if (!isFormValid.value || isSaving.value) return
  isSaving.value = true
  const payload = {
    name: form.value.name.trim(),
    price: form.value.price,
    yieldCount: form.value.yieldCount,
    yieldIntervalSeconds: form.value.yieldIntervalSeconds,
    item: form.value.item.trim(),
    minLevel: form.value.minLevel ?? 0,
    premiumOnly: form.value.premiumOnly,
    waterable: form.value.waterable,
  }
  try {
    if (editingId.value === null) {
      await api.post('/admin/businesses', payload)
    } else {
      await api.put(`/admin/businesses/${editingId.value}`, payload)
    }
    playPurchaseSound()
    toastStore.showToast(t('admin.success_update'), 'success')
    isFormOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isSaving.value = false
  }
}

function askDelete(b: AdminBusiness) {
  playClickSound()
  businessToDelete.value = b
  isDeleteOpen.value = true
}

async function confirmDelete() {
  const b = businessToDelete.value
  if (!b) return
  deletingId.value = b.id
  try {
    await api.delete(`/admin/businesses/${b.id}`)
    toastStore.showToast(t('admin.deleted'), 'success')
    isDeleteOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    deletingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <div class="section-header">
        <h2 class="title">{{ t('admin.nav.businesses') }}</h2>
        <ButtonText  @click="openCreate">+ {{ t('admin.create') }}</ButtonText>
      </div>

      <div v-if="isLoading" class="loading-state">{{ t('invite_list.loading') }}</div>

      <Card v-else-if="sorted.length" width="100%" height="auto" :padding="6" class="list-card">
        <ul class="entity-list">
          <li v-for="b in sorted" :key="b.id" class="entity-row">
            <div class="entity-info">
              <span class="entity-name">
                <ItemIcon :item="b.item" size="24" style="vertical-align: middle; margin-right: 6px;" />
                {{ displayName(b.name) }}
                <span v-if="b.waterable" style="margin-left: 4px;" title="Поливається">💧</span>
              </span>
              <span class="entity-meta">
                {{ t('business.price', { price: b.price }) }}  <br>
                <strong class="text-success">+{{ b.yieldCount }}</strong>
                {{ b.item }} / {{ formatInterval(b.yieldIntervalSeconds) }}
              </span>
              <span class="hint-text">ID {{ b.id }} <br> {{ b.name }}</span>
            </div>
            <div class="entity-actions">
              <EditButton size="48" @click="openEdit(b)" />
              <DeleteButton  size="48" :loading="deletingId === b.id" @click="askDelete(b)" />
            </div>
          </li>
        </ul>
      </Card>

      <div v-else class="empty-state">{{ t('business.empty_market') }}</div>
    </CardPrimary>

    <!-- Створення / редагування -->
    <PixelModal
      v-model="isFormOpen"
      :title="editingId === null ? t('admin.business_create_title') : t('admin.business_edit_title')"
      width="340px"
      @close="isFormOpen = false"
    >
      <div class="modal-body">
        <div class="input-field-row">
          <label>{{ t('admin.field_key') }}</label>
          <input v-model="form.name" type="text" class="pixel-input" placeholder="garden_bed" />
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_price') }}</label>
          <input v-model.number="form.price" type="number" min="0" class="pixel-input" />
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_yield') }}</label>
          <input v-model.number="form.yieldCount" type="number" min="1" class="pixel-input" />
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_interval') }}</label>
          <input v-model.number="form.yieldIntervalSeconds" type="number" min="1" class="pixel-input" />
          <span class="hint-text">= {{ formatInterval(form.yieldIntervalSeconds ?? 0) }}</span>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_item') }}</label>
          <input v-model="form.item" type="text" class="pixel-input" placeholder="strawberry" />
        </div>
        <div class="input-field-row">
          <label>Мінімальний рівень</label>
          <input v-model.number="form.minLevel" type="number" min="0" class="pixel-input" />
        </div>
        <div class="mode-switch-row">
          <label>Тільки Premium</label>
          <Switch v-model="form.premiumOnly" />
        </div>
        <div class="mode-switch-row">
          <label>Можна поливати (💧)</label>
          <Switch v-model="form.waterable" />
        </div>
        <div class="modal-actions">
          <ButtonText  :loading="isSaving" :disabled="!isFormValid" @click="save">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Підтвердження видалення -->
    <PixelModal
      v-model="isDeleteOpen"
      :title="t('admin.confirm_title')"
      width="320px"
      @close="isDeleteOpen = false"
    >
      <div class="modal-body">
        <span>{{ t('admin.confirm_delete', { name: businessToDelete ? displayName(businessToDelete.name) : '' }) }}</span>
        <div class="modal-actions">
          <ButtonText  :loading="deletingId !== null" @click="confirmDelete">
            {{ t('admin.delete') }}
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

.entity-meta {
  font-size: 14px;
  color: #5d4037;
}

.text-success { color: #2e7d32; }

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

.mode-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
