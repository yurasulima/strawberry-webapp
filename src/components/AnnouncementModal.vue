<script setup lang="ts">
import { PixelModal, ButtonText } from '@/components/pixel'

export interface AnnouncementData {
  id: number
  title: string
  content: string
  imageUrl?: string | null
  actionText?: string | null
  actionUrl?: string | null
  createdAt?: string
}

const props = withDefaults(defineProps<{
  modelValue?: boolean
  announcement?: AnnouncementData | null
}>(), {
  modelValue: false,
  announcement: null
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'action', ann: AnnouncementData): void
  (e: 'close'): void
}>()

function handleAction() {
  if (props.announcement?.actionUrl) {
    const tg = (window as any).Telegram?.WebApp
    if (tg && typeof tg.openTelegramLink === 'function' && props.announcement.actionUrl.includes('t.me')) {
      tg.openTelegramLink(props.announcement.actionUrl)
    } else if (tg && typeof tg.openLink === 'function') {
      tg.openLink(props.announcement.actionUrl)
    } else {
      window.open(props.announcement.actionUrl, '_blank')
    }
  }
  if (props.announcement) {
    emit('action', props.announcement)
  }
  handleClose()
}

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <PixelModal
    :model-value="props.modelValue"
    :title="props.announcement?.title || 'Сповіщення'"
    width="340px"
    @close="handleClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="announcement-modal-body">
      <!-- Банер або зображення (якщо є) -->
      <div v-if="props.announcement?.imageUrl" class="banner-wrapper">
        <img :src="props.announcement.imageUrl" class="banner-img" alt="Banner" />
      </div>

      <!-- Основний текст анонсу -->
      <div class="content-box">
        <p class="announcement-text">{{ props.announcement?.content }}</p>
      </div>

      <!-- Кнопки дій -->
      <div class="actions-row">
        <ButtonText
          v-if="props.announcement?.actionText || props.announcement?.actionUrl"
          padding="10px 18px"
          class="action-btn"
          @click="handleAction"
        >
          {{ props.announcement.actionText || 'Перейти' }}
        </ButtonText>

        <ButtonText
          padding="10px 18px"
          class="close-btn"
          @click="handleClose"
        >
          Зрозуміло
        </ButtonText>
      </div>
    </div>
  </PixelModal>
</template>

<style scoped>
.announcement-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
  padding: 8px 4px;
}

.banner-wrapper {
  width: 100%;
  max-height: 140px;
  overflow: hidden;
  border-radius: 4px;
  border: 2px solid #5d4037;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.4);
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
  display: block;
}

.content-box {
  background: rgba(255, 255, 255, 0.15);
  border: 1px dashed rgba(255, 255, 255, 0.3);
  padding: 10px;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

.announcement-text {
  font-size: 13px;
  line-height: 1.5;
  color: #eaefef;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.actions-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  width: 100%;
  margin-top: 6px;
}

.action-btn {
  flex: 1;
}

.close-btn {
  flex: 1;
}
</style>
