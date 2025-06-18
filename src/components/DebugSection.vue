<script setup lang="ts">
import { useWebApp } from "vue-tg";

const { initDataUnsafe } = useWebApp()
const user = initDataUnsafe.user;
const start_param = initDataUnsafe.start_param;
</script>

<template>
  <div class="debug-section">
    <div class="debug-header">
      <h2 class="debug-title">🛠 Debug Menu</h2>
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
  margin: 20px auto;
  padding: 20px;
  background-color: #b8cfce;
  border-radius: 14px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  color: #1c1d2e;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  user-select: none;
}

.debug-header {
  margin-bottom: 20px;
}

.debug-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0e1017;
}

.debug-subtitle {
  font-size: 14px;
  color: #3d3f4e;
}

.debug-block {
  margin-top: 16px;
  padding: 14px;
  background-color: #e0f0f3;
  border-radius: 10px;
  box-shadow: inset 0 0 6px #aaa;
}

.debug-heading {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 6px;
  color: #195870;
}

.debug-code {
  font-size: 13px;
  background-color: #f0f9ff;
  padding: 10px;
  border-radius: 6px;
  color: #333;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.debug-value {
  font-size: 14px;
  color: #195870;
}
</style>
