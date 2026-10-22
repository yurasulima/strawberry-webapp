<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import CardPrimary from './CardPrimary.vue'
import CloseButton from './CloseButton.vue'
import { playClickSound } from '@/services/sound'

const props = withDefaults(defineProps<{
  modelValue?: boolean
  title?: string
  width?: number | string
  height?: number | string
  padding?: number | string
  closable?: boolean
  closeOnBackdrop?: boolean
}>(), {
  modelValue: false,
  title: '',
  width: 360,
  height: 'auto',
  padding: 16,
  closable: true,
  closeOnBackdrop: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

function closeModal() {
  playClickSound()
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    closeModal()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    closeModal()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pixel-modal-fade">
      <div v-if="modelValue" class="pixel-modal-overlay" @click.self="handleBackdropClick">
        <div class="pixel-modal-dialog">
          <CardPrimary
            :width="width"
            :height="height"
            :padding="padding"
          >
            <div class="pixel-modal-inner">
              <!-- Header -->
              <div v-if="title || closable" class="pixel-modal-header">
                <h3 v-if="title" class="pixel-modal-title">{{ title }}</h3>
                <div v-else class="header-spacer"></div>
                <CloseButton v-if="closable" width="36" height="36" padding="2px" @click="closeModal" />
              </div>

              <!-- Body -->
              <div class="pixel-modal-body">
                <slot />
              </div>

              <!-- Footer Actions -->
              <div v-if="$slots.footer" class="pixel-modal-footer">
                <slot name="footer" />
              </div>
            </div>
          </CardPrimary>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pixel-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.pixel-modal-dialog {
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.pixel-modal-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #3f2e21;
}

.pixel-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(139, 109, 81, 0.3);
  padding-bottom: 8px;
}

.pixel-modal-title {
  font-family: var(--font-pixel);
  font-size: 16px;
  margin: 0;
  color: #d97706;
  text-shadow: 1px 1px 0 #1a1008;
}

.header-spacer {
  flex-grow: 1;
}

.pixel-modal-body {
  flex-grow: 1;
  font-size: 14px;
  line-height: 1.4;
  overflow-y: auto;
}

.pixel-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  border-top: 1px solid rgba(139, 109, 81, 0.3);
  padding-top: 12px;
}

/* Modal Fade Animation */
.pixel-modal-fade-enter-active,
.pixel-modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pixel-modal-fade-enter-from,
.pixel-modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
