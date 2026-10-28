<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from "@/services/api.ts"
import type { Business } from "@/types/Business.ts"
import { Icon } from '@iconify/vue'
import { CardPrimary, Card, ButtonText, ItemIcon, SlideFade } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from "@/services/sound"
import { useUserStore } from "@/stores/user.ts"
import { useToastStore } from "@/stores/toast.ts"
import { formatBizName as formatBizNameUtil, translateError as translateErrorUtil } from '@/utils/business'

const props = defineProps<{ user?: any }>()
const { t, te } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const businessesForSale = ref<Business[]>([])
const isLoading = ref(true)
const buyingName = ref<string | null>(null)

const userLevel = computed(() => userStore.user?.level || 1)
const isPremiumUser = computed(() => !!userStore.user?.premium)

const isAvailable = (biz: Business) => {
  const reqLvl = biz.minLevel ?? 0
  const reqPrem = !!biz.premiumOnly
  if (userLevel.value < reqLvl) return false
  if (reqPrem && !isPremiumUser.value) return false
  return true
}

const sortedBusinessesForSale = computed(() => {
  const list = [...businessesForSale.value]
  return list.sort((a, b) => {
    const availA = isAvailable(a)
    const availB = isAvailable(b)

    // Доступні спочатку, недоступні внизу
    if (availA && !availB) return -1
    if (!availA && availB) return 1

    // Усередині кожної групи сортуємо за ціною від найдешевшого до найдорожчого
    const priceA = a.price ?? 0
    const priceB = b.price ?? 0
    if (priceA !== priceB) return priceA - priceB

    const yieldA = a.yieldCount ?? 0
    const yieldB = b.yieldCount ?? 0
    if (yieldA !== yieldB) return yieldA - yieldB

    return a.id - b.id
  })
})

function formatBizName(rawName?: string): string {
  return formatBizNameUtil(rawName, t, te)
}

function translateError(err: any): string {
  return translateErrorUtil(err, t)
}

async function loadData() {
  isLoading.value = true
  try {
    const marketRes = await api.get<Business[]>('/business')
    businessesForSale.value = marketRes.data || []
  } catch (e) {
    console.error('Помилка завантаження магазину бізнесів:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

async function directBuy(biz: Business) {
  playClickSound()
  buyingName.value = biz.name
  const displayName = formatBizName(biz.name)

  try {
    await api.post('/business/buy', { name: biz.name })
    playPurchaseSound()
    toastStore.showToast(t('business.bought_success', { name: displayName }), 'success')
    await loadData()
    await userStore.fetchUser()
  } catch (err: any) {
    toastStore.showToast(translateError(err), 'error')
  } finally {
    buyingName.value = null
  }
}
</script>

<template>
  <div class="market-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <h2 class="title">{{ t('business.market_title') }}</h2>

      <!-- Стан завантаження -->
      <div v-if="isLoading" class="loading-state">
        <span>{{ t('invite_list.loading') }}</span>
      </div>

      <template v-else>
        <!-- Список доступних бізнесів у єдиній картці -->
        <SlideFade>
          <Card v-if="sortedBusinessesForSale.length" width="100%" height="auto" :padding="6">
            <ul class="biz-list">
              <li v-for="biz in sortedBusinessesForSale" :key="biz.id" class="biz-row">
                <div class="biz-info">
                  <span class="biz-name">
                    {{ formatBizName(biz.name) }}

                    <span v-if="biz.premiumOnly" class="tag-premium">
                      {{ t('business.premium_req') }}
                    </span>
                  </span>
                  <span class="biz-meta">
                    {{ t('business.price', { price: biz.price || 100 }) }} · <strong class="yield-val">+{{ biz.yieldCount || 10 }}</strong> <ItemIcon :item="biz.item" size="18" style="vertical-align: middle;" />
                  </span>
                </div>

                <ButtonText
                  :disabled="userLevel < (biz.minLevel ?? 0) || (biz.premiumOnly && !isPremiumUser)"
                  :loading="buyingName === biz.name"
                  @click="directBuy(biz)"
                >
                  {{
                    userLevel < (biz.minLevel ?? 0)
                      ? `Рівень ${biz.minLevel}`
                      : (biz.premiumOnly && !isPremiumUser
                          ? 'Premium'
                          : t('business.buy'))
                  }}
                </ButtonText>
              </li>
            </ul>
          </Card>

          <!-- Порожній стан -->
          <div v-else class="empty-state">
            <Icon icon="pixelarticons:info-box" class="empty-icon" />
            <p class="empty-title">{{ t('business.empty_market') }}</p>
          </div>
        </SlideFade>
      </template>
    </CardPrimary>
  </div>
</template>

<style scoped>
.market-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  line-height: 1.1;
  color: #3f2e21;
}

.title {
  margin: 0 0 10px;
  text-align: center;
  font-family: inherit;
  font-size: 22px;
  font-weight: normal;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Список */
.biz-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.biz-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 4px 6px;
}

.biz-row + .biz-row {
  border-top: 2px solid rgba(63, 46, 33, 0.18);
}

.biz-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.biz-name {
  font-size: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-level {
  font-family: var(--font-pixel);
  font-size: 9px;
  background-color: #2e7d32;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

.tag-level.level-locked {
  background-color: #c62828;
}

.tag-premium {
  font-family: var(--font-pixel);
  font-size: 9px;
  background-color: #d97706;
  color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

.biz-meta {
  font-size: 16px;
  color: #5d4037;
}

.yield-val {
  font-weight: normal;
  color: #2e7d32;
}

/* Порожній стан */
.empty-state { text-align: center; padding: 16px 8px; }
.empty-icon { font-size: 32px; color: #5d4037; margin-bottom: 6px; }
.empty-title { margin: 0 0 4px; font-size: 20px; }
</style>
