<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PixelModal, ButtonText } from '@/components/pixel'
import CatSprite from '@/components/pixel/CatSprite.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { playClickSound, playSuccessSound } from '@/services/sound'
import api from '@/services/api'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const userStore = useUserStore()
const toastStore = useToastStore()

const isSaving = ref(false)
const catName = ref('')

const myCat = computed(() => userStore.user?.cat)
const pettedCount = computed(() => myCat.value?.pettedCount || 0)

function syncCatData() {
  if (myCat.value) {
    catName.value = myCat.value.name || ''
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    syncCatData()
  }
})

// Не перезаписуємо поле, поки модалка відкрита: оновлення профілю (новий об'єкт cat зі стору)
// інакше стирало б те, що гравець вже встиг ввести
watch(myCat, () => {
  if (!props.modelValue) syncCatData()
}, { immediate: true })

async function saveCat() {
  if (!userStore.user || !myCat.value) return
  if (!catName.value.trim()) {
    toastStore.showToast("Будь ласка, введіть ім'я для котика!", 'error')
    return
  }

  playClickSound()
  isSaving.value = true

  try {
    const res = await api.put('/cats/me', {
      name: catName.value.trim(),
      colors: myCat.value.colors
    })
    playSuccessSound()
    toastStore.showToast("Ім'я котика збережено!", 'success')
    if (userStore.user) {
      userStore.user.cat = res.data
    }
    emit('update:modelValue', false)
  } catch (err: any) {
    console.error('Error saving cat name:', err)
    toastStore.showToast("Не вдалося зберегти ім'я", 'error')
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <PixelModal
      :model-value="modelValue"
      title="Мій Котик"
      :width="340"
      @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="my-cat-modal-content">
      <div v-if="!myCat" class="no-cat-state">
        <div class="no-cat-icon">📦</div>
        <p class="no-cat-title">У вас ще немає котика!</p>
        <p class="no-cat-sub">Шукайте коробки в Telegram-чаті, щоб знайти свого унікального улюбленця.</p>
      </div>

      <template v-else>
        <!-- Перегляд унікального котика -->
        <div class="cat-preview-section">
          <div class="cat-avatar-box">
            <CatSprite :colors="myCat.colors" :size="128" :playing="true" />
          </div>

          <div class="cat-stats-badge">
            🐾 Погладжено: <strong>{{ pettedCount }}</strong> разів
          </div>
        </div>

        <!-- Поле встановлення імені -->
        <div class="field-group">
          <label class="field-label">Встановіть ім'я для котика:</label>
          <input
              v-model="catName"
              type="text"
              class="pixel-name-input"
              placeholder="Введіть ім'я..."
              maxlength="24"
              @keyup.enter="saveCat"
          />
        </div>
      </template>
    </div>

    <template #footer>
      <div class="modal-footer-btns" v-if="myCat">
        <ButtonText width="100%" :loading="isSaving" @click="saveCat">
          Зберегти ім'я
        </ButtonText>
      </div>
      <div class="modal-footer-btns" v-else>
        <ButtonText width="100%" @click="handleClose">
          Зрозуміло
        </ButtonText>
      </div>
    </template>
  </PixelModal>
</template>

<style scoped>
.my-cat-modal-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--font-pixel), sans-serif;
  color: #3f2e21;
}

.no-cat-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 8px;
  gap: 8px;
}

.no-cat-icon {
  font-size: 48px;
}

.no-cat-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.no-cat-sub {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.cat-preview-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cat-avatar-box {
  width: 130px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cat-stats-badge {
  font-size: 13px;
  background: #fff8eb;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid #5d4037;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.field-label {
  font-size: 14px;
  font-weight: bold;
}

.pixel-name-input {
  width: 100%;
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 16px;
  color: #3f2e21;
  outline: none;
  box-sizing: border-box;
}

.pixel-name-input:focus {
  border-color: #2e7d32;
}

.modal-footer-btns {
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>