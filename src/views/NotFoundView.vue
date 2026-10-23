<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="background">
    <div class="notfound-card">
      <h1 class="default-text">404</h1>
      <p class="message">{{ t('not_found.title') }}</p>
      <router-link to="/" class="back-button">{{ t('not_found.back_home') }}</router-link>
    </div>
  </div>
</template>

<style scoped>
.background {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #022534;
  height: 100vh;
  padding: 20px;
}

.notfound-card {
  background-color: #17181c;
  padding: 30px;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.default-text {
  font-family: 'Unbounded', sans-serif;
  color: white;
  font-size: 48px;
  margin-bottom: 10px;
}

.message {
  font-family: 'Unbounded', sans-serif;
  color: #ffffffcc;
  font-size: 18px;
  margin-bottom: 20px;
}

.back-button {
  display: inline-block;
  padding: 12px 20px;
  background-color: #2a9df4;
  color: white;
  font-weight: bold;
  border-radius: 6px;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.back-button:hover {
  background-color: #228ad3;
}
</style>
