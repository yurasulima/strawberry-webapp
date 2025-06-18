import './assets/main.css'

import "reflect-metadata";
import './assets/main.css'

import { VueTelegramPlugin } from "vue-tg";
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

app.use(router)
app.use(VueTelegramPlugin);
app.use(pinia)
app.use(i18n)
app.mount('#app')
