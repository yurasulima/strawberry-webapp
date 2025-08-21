<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from "@/services/api.ts";
import type {User} from "@/types/User.ts";
import type {Business} from "@/types/Business.ts";
import type {UserBusiness} from "@/types/UserBusiness.ts";



const { user } = defineProps<{ user: User }>()


const activeTab = ref<'owned' | 'market'>('owned')

const myBusinesses = ref<UserBusiness[]>([])

const businessesForSale = ref<Business[]>([])

myBusinesses.value = user.businesses



async function loadMarketBusinesses() {
  try {
    const response = await api.get<Business[]>('/business') // заміни URL на свій
    businessesForSale.value = response.data
  } catch (e) {
    console.error('Помилка завантаження бізнесів для купівлі:', e)
  }
}

onMounted(() => {
  loadMarketBusinesses()
})

function buyBusiness(bizId: number) {
  alert(`Купити бізнес з id = ${bizId}`)
}

function sellBusiness(bizId: number) {
  alert(`Продати бізнес з id = ${bizId}`)
}
</script>

<template>
  <div>
    <div class="tabs">
      <button
          :class="{ active: activeTab === 'owned' }"
          @click="activeTab = 'owned'">
        Мої бізнеси
      </button>
      <button
          :class="{ active: activeTab === 'market' }"
          @click="activeTab = 'market'">
        Бізнеси для купівлі
      </button>
    </div>

    <div v-if="activeTab === 'owned'">
      <h3>Мої бізнеси</h3>
      <ul>
        <li v-for="biz in myBusinesses" :key="biz.id">
          {{ biz.business.name }} — Прибуток: {{ biz.business.yieldCount || 0 }}
          <button @click="sellBusiness(biz.id)">Продати</button>
        </li>
      </ul>
    </div>

    <div v-if="activeTab === 'market'">
      <h3>Бізнеси для купівлі</h3>
      <ul>
        <li v-for="biz in businessesForSale" :key="biz.id">
          {{ biz.name }} — Ціна: {{ biz.price }}
          <button @click="buyBusiness(biz.id)">Купити</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
button {
  padding: 6px 12px;
  cursor: pointer;
}
button.active {
  font-weight: bold;
  border-bottom: 2px solid blue;
}
</style>
