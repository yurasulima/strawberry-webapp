<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  firstName: string
  lastName: string
  avatar: string
  money: number
}>()
</script>

<template>
  <div class="toolbar">
    <img class="avatar" :src="props.avatar" alt="Avatar" />
    <div class="info">
      <div class="name">{{ props.firstName }} {{ props.lastName }}</div>
      <div class="money">💰 {{ props.money }}</div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  background-color: rgba(184, 207, 206, 0.8);
  padding: 10px;
  border-radius: 12px;
  margin-bottom: 12px;
  width: 100%;
  max-width: 420px;
  z-index: 1;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
}

.info {
  display: flex;
  flex-direction: column;
  color: #2e2e2e;
}

.name {
  font-weight: bold;
  font-size: 14px;
}

.money {
  font-size: 13px;
  color: #444;
}
</style>
