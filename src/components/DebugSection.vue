<script setup lang="ts">
import { useWebApp } from "vue-tg";
import { Icon } from "@iconify/vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { initDataUnsafe } = useWebApp()
const user = initDataUnsafe.user;
const start_param = initDataUnsafe.start_param;
</script>

<template>
  <div class="debug-section honeywood-panel-paper">
    <div class="debug-header">
      <h2 class="debug-title">
        <Icon icon="pixelarticons:bug" class="debug-icon" />
        <span>Debug Menu</span>
      </h2>
    </div>

    <div class="debug-block">
      <h3 class="debug-heading">Navigation / Showcase</h3>
      <button class="pixel-link-btn" @click="router.push('/pixel-ui')">
        <Icon icon="pixelarticons:grid" />
        <span>Open Pixel UI Showcase</span>
      </button>
    </div>

    <div class="debug-block">
      <h3 class="debug-heading">User</h3>
      <pre class="debug-code">{{ JSON.stringify(user, null, 2) }}</pre>
    </div>

    <div class="debug-block">
      <h3 class="debug-heading">Start Param</h3>
      <div class="debug-value">{{ start_param || 'none' }}</div>
    </div>
  </div>
</template>

<style scoped>
.debug-section {
  width: 100%;
  max-width: 420px;
  margin: 10px auto;
  padding: 16px;
  color: #3f2e21;
  box-sizing: border-box;
  user-select: none;
}

.debug-header {
  margin-bottom: 12px;
}

.debug-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #3f2e21;
  display: flex;
  align-items: center;
  gap: 8px;
}

.debug-icon {
  font-size: 20px;
}

.debug-block {
  margin-top: 12px;
  padding: 10px;
  background-color: rgba(63, 46, 33, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(63, 46, 33, 0.2);
}

.debug-heading {
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 6px;
  color: #3f2e21;
}

.debug-code {
  font-size: 10px;
  font-family: var(--font-pixel-retro);
  background-color: rgba(255, 255, 255, 0.6);
  padding: 8px;
  border-radius: 4px;
  color: #1a1008;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.debug-value {
  font-size: 11px;
  font-family: var(--font-pixel-retro);
  color: #3f2e21;
}

.pixel-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #3f2e21;
  color: #f7d070;
  border: 1px solid #1a1008;
  border-radius: 4px;
  font-family: var(--font-pixel);
  font-size: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.pixel-link-btn:hover {
  background-color: #5a4332;
}
</style>
