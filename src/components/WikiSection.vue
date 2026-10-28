<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {useI18n} from 'vue-i18n'
import api from '@/services/api'
import type {Item} from '@/types/Item'
import {CardPrimary, Card, ItemIcon, ButtonText, SlideFade} from '@/components/pixel'
import {playClickSound} from '@/services/sound'

const {t, te} = useI18n()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const items = ref<Item[]>([])
const isLoading = ref(true)

function getItemTitle(itemName?: string): string {
  if (!itemName) return 'Предмет'
  const key = `inventory.items.${itemName.toLowerCase().trim()}`
  if (te(key)) {
    return t(key)
  }
  return itemName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getItemDescription(itemName?: string): string {
  if (!itemName) return 'Ігровий предмет'
  const clean = itemName.toLowerCase().trim()
  if (clean === 'strawberry') return 'Базова ягода. Вирощується на грядках та фермах, вибивається в клікері.'
  if (clean === 'money') return 'Основна валюта гри. Використовується для купівлі бізнесів.'
  if (clean === 'water') return 'Вода. Збирається з водонапірних веж для прискорення та виробництва.'
  if (clean === 'blueberry') return 'Чорниця. Дозріває у чорничних гаях для виготовлення варення та пирогів.'
  if (clean === 'strawberry_juice') return 'Полуничний сік. Виробляється на сокових фабриках.'
  if (clean === 'cherries') return 'Ввишні. Збираються у вишневих садах.'
  if (clean === 'jam_cherry' || clean === 'cherry_jam') return 'Вишневе варення. Готується у вишневих варильнях.'
  if (clean === 'blueberry_jam') return 'Чорничне варення. Виробляється у чорничних варильнях.'
  if (clean === 'blueberry_pie') return 'Чорничний пиріг. Випікається у чорничних кондитерських.'
  if (clean === 'strawberry_pie') return 'Полуничний пиріг. Найцінніша випічка високого рівня.'
  return 'Ігровий ресурс для крафту та продажу.'
}

async function fetchWiki() {
  isLoading.value = true
  try {
    const res = await api.get<Item[]>('/items')
    items.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch wiki items:', err)
  } finally {
    isLoading.value = false
  }
}

function handleClose() {
  playClickSound()
  emit('close')
}

onMounted(fetchWiki)
</script>

<template>
  <div class="wiki-container">
    <CardPrimary width="100%" height="auto" :padding="12">
      <div class="wiki-header">
        <h2 class="title">📖 Вікі Предметів</h2>
        <ButtonText padding="4px 12px" height="36" @click="handleClose">
          {{ t('admin.nav.back') }}
        </ButtonText>
      </div>

      <div v-if="isLoading" class="loading-state">
        <span>{{ t('players.loading') }}</span>
      </div>

      <SlideFade v-else>
        <Card width="100%" height="auto" :padding="10" class="wiki-card">
          <div class="wiki-items-list">
            <div
                v-for="item in items"
                :key="item.id"
                class="wiki-item-row"
            >
              <div class="wiki-icon-wrap">
                <ItemIcon :item="item.name" size="40"/>
              </div>

              <div class="wiki-item-info">
                <div class="wiki-item-top">
                  <span class="wiki-item-title">{{ getItemTitle(item.name) }}</span>
                </div>

                <p class="wiki-item-desc">{{ getItemDescription(item.name) }}</p>

                <div class="wiki-price-tags">
                  <span class="price-tag sell">Продаж: <strong>+{{ item.sellPrice ?? 1 }}  </strong><ItemIcon
                      item="money" size="16"/></span>
                  <span v-if="item.buyPrice && item.buyPrice > 0"
                        class="price-tag buy">Купівля: <strong>{{ item.buyPrice }} </strong><ItemIcon item="money"
                                                                                                      size="16"/></span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </SlideFade>
    </CardPrimary>
  </div>
</template>

<style scoped>
.wiki-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: 'Crumbline', sans-serif;
  font-size: 18px;
  line-height: 1.1;
  color: #3f2e21;
}

.wiki-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.title {
  margin: 0;
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

.wiki-items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wiki-item-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  background-color: rgba(63, 46, 33, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(63, 46, 33, 0.15);
}

.wiki-icon-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 6px;
  flex-shrink: 0;
}

.wiki-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wiki-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wiki-item-title {
  font-size: 18px;
  font-weight: bold;
  color: #3f2e21;
}

.wiki-item-desc {
  font-size: 14px;
  color: #5d4037;
  margin: 0;
  line-height: 1.2;
}

.wiki-price-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.price-tag {
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #5d4037;
  background: #fff8eb;
}

.price-tag.sell strong {
  color: #d97706;
}

.price-tag.buy strong {
  color: #2e7d32;
}
</style>
