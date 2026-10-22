import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Налаштовуємо WebStorm як редактор за замовчуванням для Vite та Vue DevTools
const WEBSTORM_PATH = 'D:\\apps\\ide\\WebStorm\\bin\\webstorm64.exe'
process.env.LAUNCH_EDITOR = WEBSTORM_PATH

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools({
      launchEditor: WEBSTORM_PATH,
    }),
  ],
  server: {
    open: true, // Автоматично відкривати сайт у браузері при запуску npm run dev
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
