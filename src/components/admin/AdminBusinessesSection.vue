<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/services/api.ts'
import { CardPrimary, Card, ButtonText, PixelModal, Switch, ItemIcon } from '@/components/pixel'
import { playClickSound, playPurchaseSound } from '@/services/sound'
import { useToastStore } from '@/stores/toast.ts'
import EditButton from "@/components/pixel/EditButton.vue";
import DeleteButton from "@/components/pixel/DeleteButton.vue";
import { formatBizName } from '@/utils/business'
import { useItemCatalogStore } from '@/stores/itemCatalog'
import { useItemMeta } from '@/composables/useItemMeta'
import FlatCard from '@/components/pixel/FlatCard.vue'

const { t, te } = useI18n()
const toastStore = useToastStore()
const catalog = useItemCatalogStore()
const { itemTitle: resolveItemTitle } = useItemMeta()

const activeTab = ref<'list' | 'analytics' | 'simulator'>('list')

/**
 * Контракт з бекендом (див. README/документацію):
 *   GET    /admin/businesses
 *   POST   /admin/businesses            { name, price, yieldCount, yieldIntervalSeconds, item, nameUk, nameEn, nameRu }
 *   PUT    /admin/businesses/{id}       { name, price, yieldCount, yieldIntervalSeconds, item, nameUk, nameEn, nameRu }
 *   DELETE /admin/businesses/{id}
 */
interface AdminBusiness {
  id: number
  name: string
  nameUk?: string | null
  nameEn?: string | null
  nameRu?: string | null
  price: number
  yieldCount: number
  yieldIntervalSeconds: number
  item: string
  minLevel?: number
  premiumOnly?: boolean
  waterable?: boolean
}

const businesses = ref<AdminBusiness[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const deletingId = ref<number | null>(null)

// Форма створення / редагування бізнесу
const isFormOpen = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  nameUk: '',
  nameEn: '',
  nameRu: '',
  price: 100 as number | null,
  yieldCount: 10 as number | null,
  yieldIntervalSeconds: 3600 as number | null,
  item: 'strawberry',
  minLevel: 1 as number | null,
  premiumOnly: false,
  waterable: false,
})

// Форма редагування / створення предмета з порадника
const isItemEditOpen = ref(false)
const isSavingItem = ref(false)
const editingItemObj = ref<SimpleItem | null>(null)
const itemForm = ref({
  name: '',
  sellPrice: 1 as number | null,
  buyPrice: 1 as number | null,
  nameUk: '',
  nameEn: '',
  nameRu: '',
})

// Підтвердження видалення
const isDeleteOpen = ref(false)
const businessToDelete = ref<AdminBusiness | null>(null)

/* ───────── Економіка: скільки приносить бізнес і за скільки окупається ───────── */
const isDesktop = ref(typeof window !== 'undefined' && window.innerWidth >= 1100)
const modalWidth = computed(() => (isDesktop.value ? 520 : 340))
function onResize() { isDesktop.value = window.innerWidth >= 1100 }

const DAY = 86400
const SLOW_PAYBACK_HOURS = 24 * 7 // довша за тиждень — підозріло повільно
const FAST_PAYBACK_HOURS = 6 // швидша за 6 год — підозріло вигодно

interface BizStats {
  unitPrice: number
  perDay: number
  coinsPerDay: number
  paybackHours: number | null
  roiPerDay: number | null
  marketBuyPrice: number | null
  priceKnown: boolean
}

interface BizRow {
  b: AdminBusiness
  s: BizStats
}

function sellPriceOf(itemName: string): number {
  const key = (itemName || '').toLowerCase().trim()
  if (key === 'money') return 1
  const it = availableItems.value.find(i => i.name.toLowerCase().trim() === key)
  return typeof it?.sellPrice === 'number' ? it.sellPrice : 1
}

function itemOf(itemName: string): SimpleItem | undefined {
  const key = (itemName || '').toLowerCase().trim()
  return availableItems.value.find(i => i.name.toLowerCase().trim() === key)
}

function statsOf(b: AdminBusiness): BizStats {
  const perDay = b.yieldIntervalSeconds > 0 ? (b.yieldCount * DAY) / b.yieldIntervalSeconds : 0
  const unitPrice = sellPriceOf(b.item)
  const coinsPerDay = perDay * unitPrice
  const price = b.price ?? 0
  return {
    unitPrice,
    perDay,
    coinsPerDay,
    paybackHours: price > 0 && coinsPerDay > 0 ? price / (coinsPerDay / 24) : null,
    roiPerDay: price > 0 ? (coinsPerDay / price) * 100 : null,
    marketBuyPrice: typeof itemOf(b.item)?.buyPrice === 'number' ? itemOf(b.item)!.buyPrice! : null,
    priceKnown: b.item.toLowerCase().trim() === 'money' || !!itemOf(b.item),
  }
}

type SortKey = 'price' | 'coins' | 'payback' | 'roi' | 'perDay'
const sortKey = ref<SortKey>('price')
const search = ref('')
const filterMode = ref<'all' | 'premium' | 'regular' | 'waterable' | 'warnings'>('all')

const rows = computed<BizRow[]>(() => businesses.value.map(b => ({ b, s: statsOf(b) })))

const sorted = computed<BizRow[]>(() => {
  const q = search.value.toLowerCase().trim()
  const list = rows.value.filter(r => {
    if (q && !(`${r.b.name} ${r.b.nameUk ?? ''} ${r.b.nameEn ?? ''} ${r.b.nameRu ?? ''} ${r.b.item}`.toLowerCase().includes(q))) return false
    switch (filterMode.value) {
      case 'premium': return !!r.b.premiumOnly
      case 'regular': return !r.b.premiumOnly
      case 'waterable': return !!r.b.waterable
      case 'warnings': return rowWarning(r) !== null || deviation(r) !== null || arbitrage(r)
      default: return true
    }
  })
  const inf = Number.POSITIVE_INFINITY
  list.sort((x, y) => {
    switch (sortKey.value) {
      case 'coins': return y.s.coinsPerDay - x.s.coinsPerDay
      case 'perDay': return y.s.perDay - x.s.perDay
      case 'payback': return (x.s.paybackHours ?? inf) - (y.s.paybackHours ?? inf)
      case 'roi': return (y.s.roiPerDay ?? -1) - (x.s.roiPerDay ?? -1)
      default: return (x.b.price ?? 0) - (y.b.price ?? 0) || x.b.id - y.b.id
    }
  })
  return list
})

const bestRoi = computed(() =>
  rows.value.filter(r => r.s.roiPerDay !== null).sort((a, b) => b.s.roiPerDay! - a.s.roiPerDay!)[0] ?? null
)
const bestIncome = computed(() =>
  [...rows.value].sort((a, b) => b.s.coinsPerDay - a.s.coinsPerDay)[0] ?? null
)
const worstRoi = computed(() =>
  rows.value.filter(r => r.s.roiPerDay !== null).sort((a, b) => a.s.roiPerDay! - b.s.roiPerDay!)[0] ?? null
)
const avgPaybackHours = computed(() => {
  const v = rows.value.map(r => r.s.paybackHours).filter((x): x is number => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
})
const totalCoinsOneOfEach = computed(() => rows.value.reduce((sum, r) => sum + r.s.coinsPerDay, 0))
const warningsCount = computed(() => rows.value.filter(r => rowWarning(r) !== null || deviation(r) !== null || arbitrage(r)).length)

// Що виробляє економіка, якщо гравець має по одному кожного бізнесу (предмет → к-сть за 24 год)
const itemTotals = computed(() => {
  const map = new Map<string, number>()
  for (const r of rows.value) {
    map.set(r.b.item, (map.get(r.b.item) ?? 0) + r.s.perDay)
  }
  return [...map.entries()].map(([item, amount]) => ({ item, amount })).sort((a, b) => b.amount - a.amount)
})

// Медіана ROI по всіх бізнесах — еталон «нормальної» вигідності
const medianRoi = computed(() => {
  const v = rows.value.map(r => r.s.roiPerDay).filter((x): x is number => x !== null).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
})

// У скільки разів ROI бізнесу відрізняється від медіани; повертає null, якщо в нормі (0.5×…2×)
function deviation(r: BizRow): { ratio: number; kind: 'high' | 'low' } | null {
  const med = medianRoi.value
  if (!med || r.s.roiPerDay === null) return null
  const ratio = r.s.roiPerDay / med
  if (ratio >= 2) return { ratio, kind: 'high' }
  if (ratio <= 0.5) return { ratio, kind: 'low' }
  return null
}

// Експлойт: предмет, який бізнес виробляє, дорожчий на продаж, ніж на купівлю
function arbitrage(r: BizRow): boolean {
  return r.s.marketBuyPrice !== null && r.s.unitPrice > r.s.marketBuyPrice
}

function rowWarning(r: BizRow): 'slow' | 'fast' | 'none' | null {
  const h = r.s.paybackHours
  if (r.b.price > 0 && h === null) return 'none'
  if (h === null) return null
  if (h > SLOW_PAYBACK_HOURS) return 'slow'
  if (h < FAST_PAYBACK_HOURS) return 'fast'
  return null
}

function warningText(w: 'slow' | 'fast' | 'none'): string {
  if (w === 'slow') return 'Дуже довга окупність (> 7 днів)'
  if (w === 'fast') return 'Окупається швидше ніж за 6 год — перевір баланс'
  return 'Не приносить монет (ціна продажу предмета 0?)'
}

/* ───────── Розумна система рекомендацій з підтримкою бізнесів та предметів ───────── */
interface Recommendation {
  id: string
  bizId?: number
  biz?: AdminBusiness
  itemToEdit?: string
  type: 'danger' | 'warning' | 'info'
  badgeText: string
  title: string
  description: string
  suggestedFix?: string
}

const recommendations = computed<Recommendation[]>(() => {
  const list: Recommendation[] = []

  for (const r of rows.value) {
    const b = r.b
    const s = r.s

    // 1. Повільна окупність (> 14 днів)
    if (s.paybackHours !== null && s.paybackHours > 24 * 14) {
      const days = (s.paybackHours / 24).toFixed(1)
      const suggestedYield = Math.ceil(b.yieldCount * (s.paybackHours / (24 * 10)))
      list.push({
        id: `slow-${b.id}`,
        bizId: b.id,
        biz: b,
        itemToEdit: b.item,
        type: 'danger',
        badgeText: 'ПОВІЛЬНА ОКУПНІСТЬ',
        title: `Дуже довга окупність: ${displayName(b.name, b)}`,
        description: `Окупається аж ${days} днів (ROI ${fmtNum(s.roiPerDay)}%/добу). Гравці не купуватимуть цей бізнес.`,
        suggestedFix: `Збільшіть виробіток (yieldCount) з ${b.yieldCount} до ~${suggestedYield} або підвищіть ціну продажу предмета «${b.item}».`,
      })
    }

    // 2. Ризик гіперінфляції (ROI > 20% при високій ціні)
    if (b.price >= 1000 && s.roiPerDay !== null && s.roiPerDay > 20) {
      const suggestedYield = Math.max(1, Math.floor(b.yieldCount * (10 / s.roiPerDay)))
      list.push({
        id: `fast-${b.id}`,
        bizId: b.id,
        biz: b,
        itemToEdit: b.item,
        type: 'danger',
        badgeText: 'ГІПЕРІНФЛЯЦІЯ',
        title: `Занадто високий прибуток: ${displayName(b.name, b)}`,
        description: `ROI становить ${fmtNum(s.roiPerDay)}%/добу (окупність ${(s.paybackHours! / 24).toFixed(1)} дн). При ціні ${fmtNum(b.price, 0)} монет це швидке друкування монет.`,
        suggestedFix: `Зменшіть виробіток з ${b.yieldCount} до ~${suggestedYield} або знизьте ціну предмета «${b.item}».`,
      })
    }

    // 3. Знецінений Premium
    if (b.premiumOnly && medianRoi.value && s.roiPerDay !== null && s.roiPerDay < medianRoi.value) {
      list.push({
        id: `premium-${b.id}`,
        bizId: b.id,
        biz: b,
        itemToEdit: b.item,
        type: 'warning',
        badgeText: 'PREMIUM РИНКУ',
        title: `Низька прибутковість Premium: ${displayName(b.name, b)}`,
        description: `Premium-бізнес має ROI ${fmtNum(s.roiPerDay)}%/добу, що нижче за середнє по ринку (${fmtNum(medianRoi.value)}%).`,
        suggestedFix: `Підвищіть виробіток бізнесу або ціну продажу предмета «${b.item}».`,
      })
    }

    // 4. Експлойт ринку (Арбітраж)
    if (arbitrage(r)) {
      list.push({
        id: `arbitrage-${b.id}`,
        bizId: b.id,
        biz: b,
        itemToEdit: b.item,
        type: 'danger',
        badgeText: 'АРБІТРАЖ РИНКУ',
        title: `Арбітражний експлойт: ${displayName(b.name, b)}`,
        description: `Предмет «${b.item}» продається за ${s.unitPrice} монет, але купується в магазині за ${s.marketBuyPrice} монет.`,
        suggestedFix: `Відкоригуйте ціну продажу предмета «${b.item}» у каталозі, щоб вона була меншою за ціну купівлі.`,
      })
    }

    // 5. Предмет відсутній у каталозі
    if (!s.priceKnown) {
      list.push({
        id: `unknown-${b.id}`,
        bizId: b.id,
        biz: b,
        itemToEdit: b.item,
        type: 'warning',
        badgeText: 'ВІДСУТНІЙ ПРЕДМЕТ',
        title: `Предмет відсутній у каталозі: ${b.item}`,
        description: `Для бізнесу ${displayName(b.name, b)} вказано предмет «${b.item}», якого немає в таблиці items.`,
        suggestedFix: `Створіть предмет «${b.item}» у каталозі або змініть прив'язаний предмет у бізнесі.`,
      })
    }
  }

  // 6. Аномалія порівняння цін
  const sortedByPrice = [...rows.value].sort((a, b) => a.b.price - b.b.price)
  for (let i = 0; i < sortedByPrice.length - 1; i++) {
    const cheaper = sortedByPrice[i]
    const expensive = sortedByPrice[i + 1]
    if (cheaper.b.price > 0 && expensive.b.price > cheaper.b.price && cheaper.s.coinsPerDay > expensive.s.coinsPerDay * 1.3) {
      list.push({
        id: `price-jump-${cheaper.b.id}-${expensive.b.id}`,
        bizId: expensive.b.id,
        biz: expensive.b,
        itemToEdit: expensive.b.item,
        type: 'warning',
        badgeText: 'ДИСБАЛАНС ЦІН',
        title: `Дисбаланс прибутку між бізнесами`,
        description: `Дешевший «${displayName(cheaper.b.name, cheaper.b)}» (${fmtNum(cheaper.b.price, 0)} монет) приносить ${fmtNum(cheaper.s.coinsPerDay, 0)} монет/24г, що більше за дорожчий «${displayName(expensive.b.name, expensive.b)}» (${fmtNum(expensive.b.price, 0)} монет, ${fmtNum(expensive.s.coinsPerDay, 0)} монет/24г).`,
        suggestedFix: `Збільшіть виробіток для «${displayName(expensive.b.name, expensive.b)}» або підняти ціну його предмета «${expensive.b.item}».`,
      })
    }
  }

  return list
})

/* ───────── Динамічне зростання ціни покупки (Бекенд: basePrice * 1.15^count) ───────── */
const MULTIPLIER = 1.15

function getUnitPrice(basePrice: number, ownedCount: number): number {
  return Math.floor(basePrice * Math.pow(MULTIPLIER, ownedCount))
}

function getMaxAffordableCount(basePrice: number, ownedCount: number, budget: number): { count: number; totalCost: number } {
  let count = 0
  let totalCost = 0
  while (true) {
    const nextPrice = getUnitPrice(basePrice, ownedCount + count)
    if (totalCost + nextPrice > budget) break
    totalCost += nextPrice
    count++
  }
  return { count, totalCost }
}

// Калькулятор: що вигідніше купити на заданий бюджет з урахуванням зростання ціни ×1.15
const budget = ref<number | null>(10000)
const budgetPlan = computed(() => {
  const money = budget.value ?? 0
  return rows.value
    .filter(r => r.b.price > 0 && money >= r.b.price)
    .map(r => {
      const { count, totalCost } = getMaxAffordableCount(r.b.price, 0, money)
      const income = count * r.s.coinsPerDay
      return {
        row: r,
        count,
        totalCost,
        income,
        roi: totalCost > 0 ? (income / totalCost) * 100 : 0
      }
    })
    .filter(p => p.count > 0)
    .sort((a, b) => b.income - a.income)
    .slice(0, 3)
})

// Симулятор: старт з бюджету, щодня купуємо найвигідніший (за ROI) бізнес з урахуванням подорожчання ×1.15
const simBudget = ref<number | null>(1000)
const simDays = ref<number | null>(30)
const simPremium = ref(false)
const simResult = computed(() => {
  const days = Math.min(Math.max(simDays.value ?? 0, 1), 365)
  let coins = Math.max(simBudget.value ?? 0, 0)

  const eligiblePool = rows.value.filter(r => r.b.price > 0 && r.s.coinsPerDay > 0 && (simPremium.value || !r.b.premiumOnly))
  const ownedMap = new Map<number, number>()
  eligiblePool.forEach(r => ownedMap.set(r.b.id, 0))

  let income = 0
  const checkpoints: { day: number; income: number; coins: number }[] = []

  for (let d = 1; d <= days; d++) {
    coins += income

    for (let guard = 0; guard < 5000; guard++) {
      let bestPick: BizRow | null = null
      let bestRoiVal = -1

      for (const r of eligiblePool) {
        const owned = ownedMap.get(r.b.id) ?? 0
        const nextPrice = getUnitPrice(r.b.price, owned)
        if (nextPrice <= coins) {
          const nextRoi = (r.s.coinsPerDay / nextPrice) * 100
          if (nextRoi > bestRoiVal) {
            bestRoiVal = nextRoi
            bestPick = r
          }
        }
      }

      if (!bestPick) break

      const owned = ownedMap.get(bestPick.b.id) ?? 0
      const nextPrice = getUnitPrice(bestPick.b.price, owned)
      coins -= nextPrice
      income += bestPick.s.coinsPerDay
      ownedMap.set(bestPick.b.id, owned + 1)
    }

    if (d === 1 || d === 7 || d === 14 || d === 30 || d === days) {
      if (!checkpoints.some(c => c.day === d)) checkpoints.push({ day: d, income, coins })
    }
  }

  const purchases = [...ownedMap.entries()]
    .filter(([_, count]) => count > 0)
    .map(([id, count]) => ({ row: rows.value.find(r => r.b.id === id)!, count }))
    .sort((a, b) => b.count - a.count)

  return { checkpoints, purchases, hasPool: eligiblePool.length > 0 }
})

function exportCsv() {
  playClickSound()
  const head = ['id', 'name', 'item', 'price', 'yieldCount', 'intervalSec', 'itemsPerDay', 'unitPrice', 'coinsPerDay', 'paybackHours', 'roiPerDayPct', 'minLevel', 'premium', 'waterable']
  const lines = sorted.value.map(({ b, s }) => [
    b.id, b.name, b.item, b.price, b.yieldCount, b.yieldIntervalSeconds,
    s.perDay.toFixed(2), s.unitPrice, s.coinsPerDay.toFixed(2),
    s.paybackHours === null ? '' : s.paybackHours.toFixed(2),
    s.roiPerDay === null ? '' : s.roiPerDay.toFixed(2),
    b.minLevel ?? 0, b.premiumOnly ? 1 : 0, b.waterable ? 1 : 0,
  ].join(','))
  const blob = new Blob(['\ufeff' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'businesses_balance.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return '—'
  return n.toLocaleString('uk-UA', { maximumFractionDigits: digits })
}

function fmtHours(h: number | null): string {
  if (h === null || !isFinite(h)) return '—'
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} хв`
  if (h < 48) return `${fmtNum(h)} г`
  return `${fmtNum(h / 24)} дн`
}

const isFormValid = computed(() => {
  const f = form.value
  return (
    f.name.trim().length > 0 &&
    f.item.trim().length > 0 &&
    (f.price ?? -1) >= 0 &&
    (f.yieldCount ?? 0) > 0 &&
    (f.yieldIntervalSeconds ?? 0) > 0
  )
})

function displayName(raw: string, meta?: AdminBusiness | null): string {
  return formatBizName(raw, t, te, meta)
}

function formatInterval(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h ? `${h}${t('admin.unit_h')}` : '', m ? `${m}${t('admin.unit_m')}` : '', s ? `${s}${t('admin.unit_s')}` : '']
    .filter(Boolean)
    .join(' ')
}

function errorText(err: any): string {
  const raw = err?.response?.data?.message || err?.response?.data || err?.message
  if (!raw) return t('business.operation_error')
  return typeof raw === 'string' ? raw : JSON.stringify(raw)
}

interface SimpleItem {
  id?: number
  name: string
  nameUk?: string | null
  nameEn?: string | null
  nameRu?: string | null
  sellPrice?: number | null
  buyPrice?: number | null
}

const availableItems = ref<SimpleItem[]>([])

const itemList = computed(() => {
  const list = [...availableItems.value]
  if (form.value.item && !list.some(i => i.name === form.value.item)) {
    list.unshift({ name: form.value.item })
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
})

async function load() {
  isLoading.value = true
  try {
    const [bizRes, itemRes] = await Promise.all([
      api.get<AdminBusiness[]>('/admin/businesses'),
      api.get<SimpleItem[]>('/items').catch(() => ({ data: [] }))
    ])
    businesses.value = bizRes.data || []
    if (itemRes.data && itemRes.data.length > 0) {
      availableItems.value = itemRes.data
    }
  } catch (err) {
    console.error('Error fetching admin businesses:', err)
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  playClickSound()
  editingId.value = null
  form.value = { name: '', nameUk: '', nameEn: '', nameRu: '', price: 100, yieldCount: 10, yieldIntervalSeconds: 3600, item: 'strawberry', minLevel: 1, premiumOnly: false, waterable: false }
  isFormOpen.value = true
}

function openEdit(b: AdminBusiness) {
  playClickSound()
  editingId.value = b.id
  form.value = {
    name: b.name,
    nameUk: b.nameUk ?? '',
    nameEn: b.nameEn ?? '',
    nameRu: b.nameRu ?? '',
    price: b.price,
    yieldCount: b.yieldCount,
    yieldIntervalSeconds: b.yieldIntervalSeconds,
    item: b.item,
    minLevel: b.minLevel ?? 0,
    premiumOnly: !!b.premiumOnly,
    waterable: !!b.waterable,
  }
  isFormOpen.value = true
}

function openItemEdit(itemName: string) {
  playClickSound()
  const found = itemOf(itemName)
  if (found) {
    editingItemObj.value = found
    itemForm.value = {
      name: found.name,
      sellPrice: found.sellPrice ?? 1,
      buyPrice: found.buyPrice ?? 1,
      nameUk: found.nameUk ?? '',
      nameEn: found.nameEn ?? '',
      nameRu: found.nameRu ?? '',
    }
  } else {
    editingItemObj.value = null
    itemForm.value = {
      name: itemName,
      sellPrice: 1,
      buyPrice: 1,
      nameUk: '',
      nameEn: '',
      nameRu: '',
    }
  }
  isItemEditOpen.value = true
}

async function save() {
  if (!isFormValid.value || isSaving.value) return
  isSaving.value = true
  const payload = {
    name: form.value.name.trim(),
    nameUk: form.value.nameUk,
    nameEn: form.value.nameEn,
    nameRu: form.value.nameRu,
    price: form.value.price,
    yieldCount: form.value.yieldCount,
    yieldIntervalSeconds: form.value.yieldIntervalSeconds,
    item: form.value.item.trim(),
    minLevel: form.value.minLevel ?? 0,
    premiumOnly: form.value.premiumOnly,
    waterable: form.value.waterable,
  }
  try {
    if (editingId.value === null) {
      await api.post('/admin/businesses', payload)
    } else {
      await api.put(`/admin/businesses/${editingId.value}`, payload)
    }
    playPurchaseSound()
    toastStore.showToast(t('admin.success_update'), 'success')
    isFormOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isSaving.value = false
  }
}

async function saveItem() {
  if (!itemForm.value.name.trim() || isSavingItem.value) return
  isSavingItem.value = true
  const payload = {
    name: itemForm.value.name.trim(),
    sellPrice: itemForm.value.sellPrice ?? 1,
    buyPrice: itemForm.value.buyPrice ?? 1,
    nameUk: itemForm.value.nameUk,
    nameEn: itemForm.value.nameEn,
    nameRu: itemForm.value.nameRu,
  }
  try {
    if (editingItemObj.value?.id) {
      await api.put(`/admin/items/${editingItemObj.value.id}`, payload)
    } else {
      await api.post('/admin/items', payload)
    }
    playPurchaseSound()
    toastStore.showToast(t('admin.success_update'), 'success')
    isItemEditOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    isSavingItem.value = false
  }
}

function askDelete(b: AdminBusiness) {
  playClickSound()
  businessToDelete.value = b
  isDeleteOpen.value = true
}

async function confirmDelete() {
  const b = businessToDelete.value
  if (!b) return
  deletingId.value = b.id
  try {
    await api.delete(`/admin/businesses/${b.id}`)
    toastStore.showToast(t('admin.deleted'), 'success')
    isDeleteOpen.value = false
    await load()
  } catch (err) {
    toastStore.showToast(errorText(err), 'error')
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  load()
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div class="admin-container">
    <CardPrimary width="100%" height="auto" :padding="8">
      <!-- Section Header -->
      <div class="section-header">
        <div class="title-group">
          <h2 class="title">{{ t('admin.nav.businesses') }}</h2>
          <span class="count-badge">{{ rows.length }}</span>
          <span
            v-if="recommendations.length > 0"
            class="warning-badge"
            title="Переглянути порадник балансу"
            @click="activeTab = 'analytics'"
          >
            Поради: {{ recommendations.length }}
          </span>
        </div>
        <div class="header-actions">
          <ButtonText @click="exportCsv">CSV</ButtonText>
          <ButtonText @click="openCreate">+ {{ t('admin.create') }}</ButtonText>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-nav">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'list' }"
          @click="playClickSound(); activeTab = 'list'"
        >
          Список бізнесів
          <span class="tab-pill">{{ sorted.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'analytics' }"
          @click="playClickSound(); activeTab = 'analytics'"
        >
          Економіка та Поради
          <span v-if="recommendations.length" class="tab-pill tab-pill--warn">{{ recommendations.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'simulator' }"
          @click="playClickSound(); activeTab = 'simulator'"
        >
          Симулятор & Калькулятор
        </button>
      </div>

      <div v-if="isLoading" class="loading-state">{{ t('invite_list.loading') }}</div>

      <template v-else-if="rows.length">
        <!-- ==================== TAB 1: LIST ==================== -->
        <div v-show="activeTab === 'list'" class="tab-content">
          <!-- Toolbar (Search, Filter, Sort) -->
          <div class="toolbar">
            <div class="search-box">
              <span class="search-icon-text">Q</span>
              <input
                v-model="search"
                type="text"
                class="pixel-input search-input"
                placeholder="Пошук бізнесу або предмета..."
              />
              <button v-if="search" class="clear-btn" @click="search = ''">×</button>
            </div>

            <div class="filter-group">
              <div class="select-wrapper">
                <span class="select-label">Фільтр:</span>
                <select v-model="filterMode" class="pixel-select">
                  <option value="all">Усі ({{ rows.length }})</option>
                  <option value="regular">Звичайні</option>
                  <option value="premium">Тільки Premium</option>
                  <option value="waterable">З поливом</option>
                  <option value="warnings">Проблемні ({{ warningsCount }})</option>
                </select>
              </div>

              <div class="select-wrapper">
                <span class="select-label">Сортування:</span>
                <select v-model="sortKey" class="pixel-select">
                  <option value="price">За ціною</option>
                  <option value="coins">За доходом / 24г</option>
                  <option value="payback">За окупністю</option>
                  <option value="roi">За ROI / добу</option>
                  <option value="perDay">За предметами / 24г</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Business Table (Full Width List) -->
          <Card v-if="sorted.length" width="100%" height="auto" :padding="6" class="biz-list-card">
            <ul class="biz-list">
              <li v-for="row in sorted" :key="row.b.id" class="biz-row">
                <!-- Left: Icon & Title & Badges -->
                <div class="biz-row__main">
                  <div class="biz-icon-box">
                    <ItemIcon :item="row.b.item" size="36" />
                  </div>
                  <div class="biz-info-box">
                    <div class="biz-name-line">
                      <strong class="biz-name">{{ displayName(row.b.name, row.b) }}</strong>
                      <code class="biz-key">id: {{ row.b.id }} · {{ row.b.name }}</code>
                    </div>
                    <div class="biz-badges-line">
                      <span v-if="row.b.premiumOnly" class="badge badge-premium">Premium</span>
                      <span v-if="row.b.waterable" class="badge badge-water">Полив</span>
                      <span v-if="bestRoi && bestRoi.b.id === row.b.id" class="badge badge-top-roi">ТОП ROI</span>
                      <span v-if="bestIncome && bestIncome.b.id === row.b.id" class="badge badge-top-income">ТОП дохід</span>
                      <span v-if="row.b.minLevel" class="badge badge-level">Lvl {{ row.b.minLevel }}+</span>
                    </div>
                  </div>
                </div>

                <!-- Center: Price & Yield Info -->
                <div class="biz-row__info">
                  <div class="info-item" :title="`Базова ціна 1-ї покупки: ${fmtNum(row.b.price, 0)}. 2-га покупка: ${fmtNum(getUnitPrice(row.b.price, 1), 0)} 🪙, 5-та: ${fmtNum(getUnitPrice(row.b.price, 4), 0)} 🪙, 10-та: ${fmtNum(getUnitPrice(row.b.price, 9), 0)} 🪙`">
                    <span class="info-label">Базова ціна:</span>
                    <strong class="text-gold">
                      {{ fmtNum(row.b.price, 0) }}
                      <ItemIcon item="money" size="14" style="vertical-align: middle;" />
                    </strong>
                    <span class="price-mult-tag">(×1.15)</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Виробництво:</span>
                    <strong>+{{ row.b.yieldCount }} / {{ formatInterval(row.b.yieldIntervalSeconds) }}</strong>
                  </div>
                </div>

                <!-- Right: Key Economy Metrics -->
                <div class="biz-row__metrics">
                  <div class="metric-pill">
                    <span class="metric-lbl">24г:</span>
                    <strong class="text-gold">
                      +{{ fmtNum(row.s.coinsPerDay, 0) }}
                      <ItemIcon item="money" size="14" style="vertical-align: middle;" />
                    </strong>
                  </div>
                  <div class="metric-pill">
                    <span class="metric-lbl">Окупність:</span>
                    <strong>{{ fmtHours(row.s.paybackHours) }}</strong>
                  </div>
                  <div class="metric-pill" :title="`ROI першої покупки: ${fmtNum(row.s.roiPerDay)}%/добу. З кожною наступною покупкою цього ж бізнесу ціна зростає на 15%, тому ROI наступних одиниць зменшується.`">
                    <span class="metric-lbl">ROI (1-ша):</span>
                    <strong :class="{ 'text-success': (row.s.roiPerDay ?? 0) >= 30 }">
                      {{ row.s.roiPerDay === null ? '—' : fmtNum(row.s.roiPerDay) + '%' }}
                    </strong>
                  </div>
                </div>

                <!-- Actions: Edit & Delete Buttons -->
                <div class="biz-row__actions">
                  <EditButton size="36" @click="openEdit(row.b)" />
                  <DeleteButton size="36" :loading="deletingId === row.b.id" @click="askDelete(row.b)" />
                </div>

                <!-- Alerts Line (if any alert) -->
                <div v-if="rowWarning(row) || arbitrage(row) || deviation(row) || !row.s.priceKnown" class="biz-row__alerts">
                  <span
                    v-if="deviation(row)"
                    class="alert-pill"
                    :class="deviation(row)!.kind === 'high' ? 'alert-pill--good' : 'alert-pill--warn'"
                    :title="`Середня прибутковість по ринку (медіана ROI): ${fmtNum(medianRoi)}%/добу`"
                  >
                    Прибутковість у {{ fmtNum(deviation(row)!.ratio, 1) }}× {{ deviation(row)!.kind === 'high' ? 'вища за середню' : 'нижча за середню' }}
                  </span>
                  <span v-if="arbitrage(row)" class="alert-pill alert-pill--danger">
                    Експлойт ринку: продаж {{ fmtNum(row.s.unitPrice, 2) }} &gt; купівля {{ fmtNum(row.s.marketBuyPrice, 2) }}
                  </span>
                  <span v-if="!row.s.priceKnown" class="alert-pill alert-pill--warn">
                    Предмет не знайдено в каталозі
                  </span>
                  <span v-if="rowWarning(row)" class="alert-pill alert-pill--warn">
                    {{ warningText(rowWarning(row)!) }}
                  </span>
                </div>
              </li>
            </ul>
          </Card>

          <div v-else class="empty-state">
            <p>Нічого не знайдено за вашим запитом.</p>
            <ButtonText @click="search = ''; filterMode = 'all'">Скинути фільтри</ButtonText>
          </div>
        </div>

        <!-- ==================== TAB 2: ANALYTICS & RECOMMENDATIONS ==================== -->
        <div v-show="activeTab === 'analytics'" class="tab-content">
          <!-- Summary Cards Grid -->
          <div class="summary-grid">
            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">Усього бізнесів</span>
                <span class="stat-value">{{ rows.length }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">Найкращий ROI / добу</span>
                <span class="stat-value text-success">{{ bestRoi ? fmtNum(bestRoi.s.roiPerDay) + '%' : '—' }}</span>
                <span class="stat-sub">{{ bestRoi ? displayName(bestRoi.b.name, bestRoi.b) : '' }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">Найгірший ROI / добу</span>
                <span class="stat-value text-danger">{{ worstRoi ? fmtNum(worstRoi.s.roiPerDay) + '%' : '—' }}</span>
                <span class="stat-sub">{{ worstRoi ? displayName(worstRoi.b.name, worstRoi.b) : '' }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">Макс. дохід за 24г</span>
                <span class="stat-value text-gold">
                  {{ bestIncome ? fmtNum(bestIncome.s.coinsPerDay, 0) : '—' }}
                  <ItemIcon item="money" size="18" style="vertical-align: middle;" />
                </span>
                <span class="stat-sub">{{ bestIncome ? displayName(bestIncome.b.name, bestIncome.b) : '' }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">Сер. окупність</span>
                <span class="stat-value">{{ fmtHours(avgPaybackHours) }}</span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">По одному кожного / 24г</span>
                <span class="stat-value text-gold">
                  {{ fmtNum(totalCoinsOneOfEach, 0) }}
                  <ItemIcon item="money" size="18" style="vertical-align: middle;" />
                </span>
              </div>
            </FlatCard>

            <FlatCard width="100%" height="auto" padding="10px">
              <div class="stat-card">
                <span class="stat-label">Активні поради</span>
                <span class="stat-value" :class="recommendations.length ? 'text-gold' : 'text-success'">{{ recommendations.length }}</span>
              </div>
            </FlatCard>
          </div>

          <!-- Smart Recommendations Card -->
          <FlatCard width="100%" height="auto" padding="14px" class="panel-card rec-panel">
            <div class="rec-header">
              <h3 class="panel-title" style="margin: 0;">Порадник балансування бізнесів</h3>
              <span class="rec-badge">{{ recommendations.length }} порад</span>
            </div>

            <div v-if="recommendations.length" class="recommendations-list">
              <div
                v-for="rec in recommendations"
                :key="rec.id"
                class="rec-card"
                :class="`rec-card--${rec.type}`"
              >
                <div class="rec-card__icon">
                  <ItemIcon :item="rec.itemToEdit || rec.biz?.item || 'strawberry'" size="32" />
                </div>
                <div class="rec-card__content">
                  <div class="rec-card__head">
                    <span class="rec-pill-badge" :class="`rec-pill-badge--${rec.type}`">{{ rec.badgeText }}</span>
                    <h4 class="rec-card__title">{{ rec.title }}</h4>
                  </div>
                  <p class="rec-card__desc">{{ rec.description }}</p>
                  <p v-if="rec.suggestedFix" class="rec-card__fix">
                    <strong>Рекомендована дія:</strong> {{ rec.suggestedFix }}
                  </p>
                </div>
                <div class="rec-card__actions">
                  <ButtonText v-if="rec.biz" @click="openEdit(rec.biz)">Бізнес</ButtonText>
                  <ButtonText v-if="rec.itemToEdit" @click="openItemEdit(rec.itemToEdit)">Предмет «{{ rec.itemToEdit }}»</ButtonText>
                </div>
              </div>
            </div>
            <p v-else class="hint-text text-success" style="margin-top: 8px;">
              Ідеальний баланс! Автоматична система аналізу не виявила жодних відхилень чи дисбалансів.
            </p>
          </FlatCard>

          <!-- Item Production Breakdown -->
          <FlatCard width="100%" height="auto" padding="14px" class="panel-card">
            <h3 class="panel-title">Виробництво предметів за 24г (по 1 бізнесу кожного виду)</h3>
            <div class="chips-grid">
              <div v-for="t2 in itemTotals" :key="t2.item" class="item-prod-chip">
                <ItemIcon :item="t2.item" size="24" />
                <div class="chip-info">
                  <span class="chip-title">{{ t2.item }}</span>
                  <strong class="chip-val">{{ fmtNum(t2.amount) }} шт</strong>
                </div>
                <span class="chip-sub">
                  ≈ {{ fmtNum(t2.amount * sellPriceOf(t2.item), 0) }}
                  <ItemIcon item="money" size="14" style="vertical-align: middle;" />
                </span>
              </div>
            </div>
          </FlatCard>
        </div>

        <!-- ==================== TAB 3: SIMULATOR & CALCULATOR ==================== -->
        <div v-show="activeTab === 'simulator'" class="tab-content">
          <div class="panels-row">
            <!-- Calculator -->
            <FlatCard width="100%" height="auto" padding="14px" class="panel-card">
              <h3 class="panel-title">Калькулятор: Що купити на бюджет</h3>
              <div class="budget-input-row">
                <label>Бюджет:</label>
                <div class="input-with-icon">
                  <input v-model.number="budget" type="number" min="0" class="pixel-input" />
                  <ItemIcon item="money" size="24" />
                </div>
              </div>
              <ul v-if="budgetPlan.length" class="plan-list">
                <li v-for="(p, i) in budgetPlan" :key="p.row.b.id" class="plan-item">
                  <div class="plan-rank">#{{ i + 1 }}</div>
                  <div class="plan-details">
                    <strong class="plan-name">{{ p.count }}× {{ displayName(p.row.b.name, p.row.b) }}</strong>
                    <span class="plan-meta">
                      Сумарна вартість: {{ fmtNum(p.totalCost, 0) }}
                      <ItemIcon item="money" size="14" style="vertical-align: middle;" />
                      (з урахуванням ×1.15)
                    </span>
                  </div>
                  <div class="plan-roi text-success">
                    +{{ fmtNum(p.income, 0) }}/24г
                    <small>({{ fmtNum(p.roi) }}%)</small>
                  </div>
                </li>
              </ul>
              <span v-else class="hint-text">Бюджету не вистачає на жоден бізнес</span>
            </FlatCard>

            <!-- Reinvestment Simulator -->
            <FlatCard width="100%" height="auto" padding="14px" class="panel-card">
              <h3 class="panel-title">Симулятор: Реінвестування прибутків</h3>
              <div class="sim-controls">
                <div class="sim-field">
                  <label>Старт (монет):</label>
                  <input v-model.number="simBudget" type="number" min="0" class="pixel-input sim-input" />
                </div>
                <div class="sim-field">
                  <label>Днів:</label>
                  <input v-model.number="simDays" type="number" min="1" max="365" class="pixel-input sim-input" />
                </div>
                <div class="sim-field sim-field--checkbox">
                  <label><input v-model="simPremium" type="checkbox" /> Враховувати Premium</label>
                </div>
              </div>

              <template v-if="simResult.hasPool">
                <div class="sim-results">
                  <h4 class="sim-subtitle">Прогрес за чекпоінтами:</h4>
                  <ul class="plan-list">
                    <li v-for="c in simResult.checkpoints" :key="c.day" class="sim-checkpoint-item">
                      <span class="cp-day">День {{ c.day }}</span>
                      <span class="cp-income text-success">+{{ fmtNum(c.income, 0) }}/24г</span>
                      <span class="cp-coins">
                        В касі: {{ fmtNum(c.coins, 0) }}
                        <ItemIcon item="money" size="14" style="vertical-align: middle;" />
                      </span>
                    </li>
                  </ul>
                  <h4 class="sim-subtitle" style="margin-top: 10px;">Куплений портфель бізнесів:</h4>
                  <div class="chips-grid">
                    <span v-for="p in simResult.purchases.slice(0, 8)" :key="p.row.b.id" class="chip">
                      <strong>{{ p.count }}×</strong> {{ displayName(p.row.b.name, p.row.b) }}
                    </span>
                  </div>
                </div>
              </template>
              <span v-else class="hint-text">Немає доступних бізнесів для симуляції</span>
            </FlatCard>
          </div>
        </div>
      </template>

      <div v-else class="empty-state">{{ t('business.empty_market') }}</div>
    </CardPrimary>

    <!-- Modal Create / Edit Business -->
    <PixelModal
      v-model="isFormOpen"
      :title="editingId === null ? t('admin.business_create_title') : t('admin.business_edit_title')"
      :width="modalWidth"
      @close="isFormOpen = false"
    >
      <div class="modal-body">
        <div class="form-section-title">Основні параметри</div>
        <div class="input-field-row">
          <label>{{ t('admin.field_key') }}</label>
          <input v-model="form.name" type="text" class="pixel-input" placeholder="garden_bed" />
        </div>
        <div class="input-grid">
          <div class="input-field-row">
            <label>{{ t('admin.field_name') }} · UK</label>
            <input v-model="form.nameUk" type="text" maxlength="128" class="pixel-input" placeholder="Грядка" />
          </div>
          <div class="input-field-row">
            <label>{{ t('admin.field_name') }} · EN</label>
            <input v-model="form.nameEn" type="text" maxlength="128" class="pixel-input" placeholder="Garden Bed" />
          </div>
        </div>
        <div class="input-field-row">
          <label>{{ t('admin.field_name') }} · RU</label>
          <input v-model="form.nameRu" type="text" maxlength="128" class="pixel-input" placeholder="Грядка" />
        </div>

        <div class="form-section-title">Економіка та виробництво</div>
        <div class="input-grid">
          <div class="input-field-row">
            <label>{{ t('admin.field_price') }} (монет)</label>
            <input v-model.number="form.price" type="number" min="0" class="pixel-input" />
          </div>
          <div class="input-field-row">
            <label>{{ t('admin.field_yield') }} (кількість)</label>
            <input v-model.number="form.yieldCount" type="number" min="1" class="pixel-input" />
          </div>
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.field_interval') }} (в секундах)</label>
          <input v-model.number="form.yieldIntervalSeconds" type="number" min="1" class="pixel-input" />
          <span class="hint-text">= {{ formatInterval(form.yieldIntervalSeconds ?? 0) }}</span>
        </div>

        <div class="input-field-row">
          <label>{{ t('admin.field_item') }}</label>
          <div class="item-select-wrapper">
            <ItemIcon :item="form.item" size="28" style="flex-shrink: 0;" />
            <select v-model="form.item" class="pixel-select">
              <option v-for="it in itemList" :key="it.name" :value="it.name">
                {{ resolveItemTitle(it.name, it) }} ({{ it.name }})
              </option>
            </select>
          </div>
        </div>

        <div class="input-field-row">
          <label>Мінімальний рівень гравця</label>
          <input v-model.number="form.minLevel" type="number" min="0" class="pixel-input" />
        </div>

        <div class="form-section-title">Опції</div>
        <div class="mode-switch-row">
          <label>Тільки Premium</label>
          <Switch v-model="form.premiumOnly" />
        </div>
        <div class="mode-switch-row">
          <label>Можна поливати</label>
          <Switch v-model="form.waterable" />
        </div>

        <div class="modal-actions">
          <ButtonText :loading="isSaving" :disabled="!isFormValid" @click="save">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Modal Create / Edit Item -->
    <PixelModal
      v-model="isItemEditOpen"
      :title="editingItemObj ? `Редагувати предмет: ${itemForm.name}` : `Створити предмет: ${itemForm.name}`"
      width="340px"
      @close="isItemEditOpen = false"
    >
      <div class="modal-body">
        <div class="input-field-row">
          <label>Ключ предмета (name)</label>
          <input v-model="itemForm.name" type="text" class="pixel-input" :disabled="!!editingItemObj" />
        </div>
        <div class="input-grid">
          <div class="input-field-row">
            <label>Ціна продажу (sellPrice)</label>
            <input v-model.number="itemForm.sellPrice" type="number" min="0" class="pixel-input" />
          </div>
          <div class="input-field-row">
            <label>Ціна купівлі (buyPrice)</label>
            <input v-model.number="itemForm.buyPrice" type="number" min="0" class="pixel-input" />
          </div>
        </div>
        <div class="input-field-row">
          <label>Назва UK</label>
          <input v-model="itemForm.nameUk" type="text" class="pixel-input" placeholder="Назва українською" />
        </div>
        <div class="input-field-row">
          <label>Назва EN</label>
          <input v-model="itemForm.nameEn" type="text" class="pixel-input" placeholder="English name" />
        </div>
        <div class="input-field-row">
          <label>Назва RU</label>
          <input v-model="itemForm.nameRu" type="text" class="pixel-input" placeholder="Название на русском" />
        </div>
        <div class="modal-actions">
          <ButtonText :loading="isSavingItem" @click="saveItem">
            {{ t('admin.save') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>

    <!-- Modal Delete -->
    <PixelModal
      v-model="isDeleteOpen"
      :title="t('admin.confirm_title')"
      :width="modalWidth"
      @close="isDeleteOpen = false"
    >
      <div class="modal-body">
        <span>{{ t('admin.confirm_delete', { name: businessToDelete ? displayName(businessToDelete.name, businessToDelete) : '' }) }}</span>
        <div class="modal-actions">
          <ButtonText :loading="deletingId !== null" @click="confirmDelete">
            {{ t('admin.delete') }}
          </ButtonText>
        </div>
      </div>
    </PixelModal>
  </div>
</template>

<style scoped>
.admin-container {
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: var(--font-pixel);
  color: #3f2e21;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: normal;
}

.count-badge {
  background: rgba(63, 46, 33, 0.12);
  border: 1px solid #5d4037;
  padding: 2px 8px;
  font-size: 14px;
  font-weight: bold;
  border-radius: 4px;
}

.warning-badge {
  background: rgba(217, 119, 6, 0.15);
  border: 1px solid #d97706;
  color: #b45309;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tabs Navigation */
.tabs-nav {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  border-bottom: 2px solid rgba(63, 46, 33, 0.2);
  padding-bottom: 6px;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff8eb;
  border: 2px solid #5d4037;
  padding: 6px 12px;
  font-family: var(--font-pixel);
  font-size: 14px;
  color: #5d4037;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: #f4e8d0;
}

.tab-btn.active {
  background: #2e7d32;
  border-color: #1b5e20;
  color: #ffffff;
  font-weight: bold;
}

.tab-pill {
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.15);
  color: inherit;
}

.tab-pill--warn {
  background: #d97706;
  color: #ffffff;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  background: rgba(63, 46, 33, 0.05);
  padding: 8px 10px;
  border: 2px solid rgba(63, 46, 33, 0.15);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 240px;
}

.search-icon-text {
  position: absolute;
  left: 10px;
  font-size: 13px;
  font-weight: bold;
  color: #7c624d;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 28px;
  padding-right: 28px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #7c624d;
  font-size: 16px;
  font-weight: bold;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.select-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.select-label {
  font-size: 13px;
  color: #5d4037;
  white-space: nowrap;
}

/* Business Table (Full Width List) */
.biz-list-card {
  width: 100%;
}

.biz-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.biz-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  flex-wrap: wrap;
}

.biz-row + .biz-row {
  border-top: 1px solid rgba(63, 46, 33, 0.15);
}

.biz-row__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 240px;
  min-width: 0;
}

.biz-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(63, 46, 33, 0.08);
  border: 2px solid #5d4037;
  flex-shrink: 0;
}

.biz-info-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.biz-name-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.biz-name {
  font-size: 15px;
  color: #3f2e21;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.biz-key {
  font-size: 11px;
  color: #7c624d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.biz-badges-line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.badge {
  padding: 1px 5px;
  font-size: 10px;
  font-weight: bold;
  border: 1px solid currentColor;
}

.badge-premium { color: #d97706; background: rgba(217, 119, 6, 0.1); }
.badge-water { color: #1565c0; background: rgba(21, 101, 192, 0.1); }
.badge-top-roi { color: #2e7d32; background: rgba(46, 125, 50, 0.1); }
.badge-top-income { color: #b45309; background: rgba(180, 83, 9, 0.1); }
.badge-level { color: #5d4037; background: rgba(93, 64, 55, 0.1); }

.biz-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-label {
  color: #7c624d;
}

.price-mult-tag {
  font-size: 10px;
  color: #7c624d;
  background: rgba(63, 46, 33, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 2px;
}

.biz-row__metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.metric-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(63, 46, 33, 0.15);
  font-size: 12px;
}

.metric-lbl {
  color: #7c624d;
  text-transform: uppercase;
  font-size: 10px;
}

.biz-row__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.biz-row__alerts {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.alert-pill {
  padding: 2px 6px;
  font-size: 11px;
  border: 1px solid;
}

.alert-pill--good { border-color: #2e7d32; background: rgba(46, 125, 50, 0.1); color: #2e7d32; }
.alert-pill--warn { border-color: #d97706; background: rgba(217, 119, 6, 0.1); color: #b45309; }
.alert-pill--danger { border-color: #c62828; background: rgba(198, 40, 40, 0.1); color: #c62828; }

/* Analytics Tab */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.stat-card { display: flex; flex-direction: column; }
.stat-label { font-size: 12px; color: #5d4037; }
.stat-value { font-size: 18px; font-weight: bold; color: #3f2e21; margin-top: 2px; }
.stat-sub { font-size: 11px; color: #7c624d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }

.panel-card {
  margin-bottom: 12px;
}

.panel-title {
  margin: 0 0 10px;
  font-size: 15px;
  color: #3f2e21;
}

/* Recommendations Card */
.rec-panel {
  background: rgba(255, 248, 235, 0.9);
  border: 2px solid #5d4037;
}

.rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.rec-badge {
  background: #d97706;
  color: #fff;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  border-radius: 4px;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rec-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  background: #fff;
  border: 2px solid;
  border-radius: 4px;
}

.rec-card--danger { border-color: #c62828; background: rgba(198, 40, 40, 0.04); }
.rec-card--warning { border-color: #d97706; background: rgba(217, 119, 6, 0.04); }
.rec-card--info { border-color: #1565c0; background: rgba(21, 101, 192, 0.04); }

.rec-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(63, 46, 33, 0.08);
  border: 2px solid #5d4037;
  flex-shrink: 0;
  margin-top: 2px;
}

.rec-card__content {
  flex: 1;
  min-width: 0;
}

.rec-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.rec-pill-badge {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: bold;
  border: 1px solid currentColor;
}

.rec-pill-badge--danger { color: #c62828; background: rgba(198, 40, 40, 0.1); }
.rec-pill-badge--warning { color: #d97706; background: rgba(217, 119, 6, 0.1); }
.rec-pill-badge--info { color: #1565c0; background: rgba(21, 101, 192, 0.1); }

.rec-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: #3f2e21;
}

.rec-card__desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: #5d4037;
  line-height: 1.4;
}

.rec-card__fix {
  margin: 4px 0 0;
  font-size: 12px;
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.08);
  padding: 4px 6px;
  border-radius: 3px;
  line-height: 1.3;
}

.rec-card__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-self: center;
  flex-wrap: wrap;
}

/* Item Prod Grid */
.chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.item-prod-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(63, 46, 33, 0.05);
  border: 1px solid rgba(63, 46, 33, 0.2);
}

.chip-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.chip-title { font-size: 11px; color: #7c624d; text-transform: uppercase; }
.chip-val { font-size: 14px; }
.chip-sub { font-size: 11px; color: #7c624d; white-space: nowrap; }

/* Simulator & Calculator Tab */
.panels-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.budget-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.plan-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: rgba(63, 46, 33, 0.05);
  border: 1px solid rgba(63, 46, 33, 0.15);
}

.plan-rank {
  font-size: 14px;
  font-weight: bold;
  color: #7c624d;
}

.plan-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.plan-name { font-size: 14px; }
.plan-meta { font-size: 11px; color: #7c624d; }

.plan-roi {
  text-align: right;
  font-weight: bold;
  font-size: 13px;
}

.sim-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.sim-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #5d4037;
}

.sim-field--checkbox {
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
}

.sim-input {
  width: 90px;
}

.sim-subtitle {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #5d4037;
}

.sim-checkpoint-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(63, 46, 33, 0.1);
  font-size: 12px;
}

.cp-day { font-weight: bold; }

/* Modal Styles */
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--font-pixel);
}

.form-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #2e7d32;
  border-bottom: 1px solid rgba(46, 125, 50, 0.3);
  padding-bottom: 2px;
  margin-top: 6px;
}

.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.input-field-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.input-field-row label {
  font-size: 13px;
  color: #5d4037;
}

.pixel-input {
  width: 100%;
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 14px;
  color: #3f2e21;
  outline: none;
  box-sizing: border-box;
}

.pixel-input:focus {
  border-color: #2e7d32;
}

.item-select-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pixel-select {
  background: #fff8eb;
  border: 2px solid #5d4037;
  border-radius: 4px;
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 14px;
  color: #3f2e21;
  outline: none;
  cursor: pointer;
}

.pixel-select:focus {
  border-color: #2e7d32;
}

.pixel-select option {
  background: #fff8eb;
  color: #3f2e21;
}

.mode-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.text-success { color: #2e7d32; }
.text-danger { color: #c62828; }
.text-gold { color: #d97706; }
.loading-state, .empty-state {
  text-align: center;
  padding: 24px;
  font-size: 15px;
}
.hint-text { font-size: 12px; color: #7c624d; }

@media (min-width: 1100px) {
  .modal-body { zoom: 1.1; }
}
</style>
