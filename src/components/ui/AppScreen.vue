<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
}>(), {})
</script>

<template>
  <div class="app-screen">
    <div v-if="title" class="screen-title">
      <h2>{{ title }}</h2>
    </div>
    <div class="screen-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-screen {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.screen-title {
  width: 100%;
  text-align: center;
  margin-bottom: 12px;
}

.screen-title h2 {
  font-family: var(--font-pixel);
  font-size: 15px;
  margin: 0;
  color: #3f2e21;
}

.screen-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
