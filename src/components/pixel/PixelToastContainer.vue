<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import Message from './Message.vue'

const toastStore = useToastStore()
</script>

<template>
  <div class="pixel-toast-container">
    <TransitionGroup name="toast-fade">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-wrapper"
      >
        <Message
          closable
          width="100%"
          :padding="10"
          @close="toastStore.removeToast(toast.id)"
        >
          <div class="toast-content" :class="toast.type">
            {{ toast.text }}
          </div>
        </Message>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.pixel-toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 400px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-wrapper {
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toast-content {
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
}

.toast-content.success {
  color: #1b5e20;
}

.toast-content.error {
  color: #b71c1c;
}

.toast-content.info {
  color: #0d47a1;
}

/* Перехідні анімації */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(-24px) scale(0.9);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.9);
}
</style>
