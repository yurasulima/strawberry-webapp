
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PixelModal from '@/components/pixel/PixelModal.vue'
import Card from '@/components/pixel/Card.vue'
import ButtonText from '@/components/pixel/ButtonText.vue'
import ItemIcon from '@/components/pixel/ItemIcon.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { playClickSound, playCoinSound } from '@/services/sound'
import { dpr } from '@/services/pixelSnap'
import type { DailyRewardDay } from '@/types/DailyReward'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t, locale } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const TOTAL = 30
const MILESTONES = new Set([7, 14, 21, 28, 30])
const COIN_DAYS = new Set([10, 17, 23])

const isClaiming = ref(false)
const selectedDay = ref(1)

const canClaim = computed(() => !!userStore.canClaimDaily)

const apiDays = computed<DailyRewardDay[]>(() => {
  const d = userStore.dailyRewardsStatus?.days
  return Array.isArray(d) ? d : []
})

const lastClaimedDay = computed(() => {
  const claimed = apiDays.value.filter(d => d.claimed).map(d => Number(d.day))
  return claimed.length ? Math.max(...claimed) : 0
})

/** Номер "сьогоднішнього" дня: той, що можна забрати зараз, або той, що вже забрано сьогодні. */
const todayDay = computed(() => {
  const current = apiDays.value.find(d => d.current)
  if (current) return Number(current.day)

  if (canClaim.value) {
    return Math.min(TOTAL, lastClaimedDay.value + 1 || 1)
  }

  return lastClaimedDay.value || 1
})

/** Скільки днів серії вже забрано (сьогодні враховується лише після отримання). */
const streak = computed(() => Math.max(0, canClaim.value ? todayDay.value - 1 : todayDay.value))

type CellState = 'claimed' | 'today' | 'missed' | 'future'

interface DayCell {
  day: number
  icon: string
  milestone: boolean
  strawberries: number
  coins: number
  state: CellState
  done: boolean
  claimable: boolean
}

const cells = computed<DayCell[]>(() =>
    Array.from({ length: TOTAL }, (_, i) => {
      const day = i + 1
      const api = apiDays.value.find(d => Number(d.day) === day)
      const strawberries = Number(api?.strawberries ?? 0)
      const coins = Number(api?.coins ?? 0)

      const fallbackIcon = (coins > 0 && strawberries === 0) || (!api && COIN_DAYS.has(day))
          ? '/items/money.png'
          : '/items/strawberry.png'
      const icon = typeof api?.icon === 'string' && api.icon.startsWith('/') ? api.icon : fallbackIcon

      const isToday = day === todayDay.value
      const claimedByApi = typeof api?.claimed === 'boolean' ? api.claimed : day <= lastClaimedDay.value

      let state: CellState
      if (isToday) state = 'today'
      else if (claimedByApi) state = 'claimed'
      else if (day < todayDay.value) state = 'missed'
      else state = 'future'

      return {
        day,
        icon,
        milestone: api?.milestone ?? MILESTONES.has(day),
        strawberries,
        coins,
        state,
        done: state === 'claimed' || (isToday && !canClaim.value),
        claimable: isToday && canClaim.value
      }
    })
)

const selected = computed<DayCell>(() => cells.value[Math.min(TOTAL, Math.max(1, selectedDay.value)) - 1])

const statusText = computed(() => {
  const c = selected.value
  if (c.claimable) return t('daily_rewards.available')
  if (c.done) return t('daily_rewards.claimed')
  if (c.state === 'future') return t('daily_rewards.locked_day')
  return '—'
})

const nf = computed(() => new Intl.NumberFormat(String(locale.value)))
const fmt = (n: number) => nf.value.format(n)

function rewardParts(c: DayCell) {
  return [
    ...(c.strawberries > 0 ? [{ icon: '/items/strawberry.png', amount: c.strawberries, label: t('daily_rewards.strawberries') }] : []),
    ...(c.coins > 0 ? [{ icon: '/items/money.png', amount: c.coins, label: t('daily_rewards.coins') }] : [])
  ]
}

/** Усі зсуви/рамки кратні фізичному пікселю, щоб піксель-арт не "плавав" на дробовому DPR. */
const unitStyle = computed(() => ({
  '--d': `${1 / dpr.value}px`,
  '--b': `${Math.round(2 * dpr.value) / dpr.value}px`
}))

function selectDay(day: number) {
  if (day === selectedDay.value) return
  playClickSound()
  selectedDay.value = day
}

watch(
    () => props.modelValue,
    async (isOpen) => {
      if (isOpen) {
        await userStore.fetchDailyRewards()
        selectedDay.value = todayDay.value
      }
    },
    { immediate: true }
)

// після отримання нагороди / оновлення даних повертаємо вибір на сьогодні
watch(todayDay, (day) => {
  selectedDay.value = day
})

async function handleClaim() {
  const targetDay = todayDay.value
  if (!canClaim.value || isClaiming.value || !targetDay) return

  playClickSound()
  isClaiming.value = true

  try {
    await userStore.claimDailyReward(targetDay)
    playCoinSound()

    toastStore.showToast(
        t('daily_rewards.claimed_toast', { day: targetDay }),
        'success'
    )

    await userStore.fetchDailyRewards()
  } catch (err) {
    console.error('Error claiming daily reward:', err)
  } finally {
    isClaiming.value = false
  }
}
</script>

<template>
  <PixelModal
      :model-value="modelValue"
      :title="t('daily_rewards.title')"
      width="min(380px, calc(100vw - 32px))"
      :padding="8"
      @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="daily-modal" :style="unitStyle">
      <!-- Серія -->
      <div class="streak-panel">
        <div class="streak-top">
          <div class="streak-copy">
            <span class="eyebrow">{{ t('daily_rewards.streak_label') }}</span>
            <div class="streak-number">
              {{ streak }}<span>/ {{ TOTAL }}</span>
            </div>
          </div>
          <ItemIcon item="strawberry" size="36" class="streak-fruit" />
        </div>

        <div class="streak-bar" aria-hidden="true">
          <i
              v-for="n in TOTAL"
              :key="n"
              :class="{ on: n <= streak, next: canClaim && n === streak + 1, mile: MILESTONES.has(n) }"
          />
        </div>
      </div>

      <!-- Календар на 30 днів -->
      <div class="days-grid" role="list">
        <button
            v-for="cell in cells"
            :key="cell.day"
            type="button"
            role="listitem"
            class="day-cell"
            :class="[
              `is-${cell.state}`,
              {
                'is-selected': cell.day === selectedDay,
                'is-milestone': cell.milestone,
                'is-claimable': cell.claimable,
                'is-done': cell.done
              }
            ]"
            :aria-label="t('daily_rewards.day_title', { day: cell.day })"
            @click="selectDay(cell.day)"
        >
          <span class="day-face">
            <span class="day-num">{{ cell.day }}</span>
            <ItemIcon :item="cell.icon" size="32" class="day-icon" />
            <span v-if="cell.done" class="day-mark">✓</span>
          </span>
          <span v-if="cell.state === 'today'" class="today-flag" :class="{ 'is-done': cell.done }">
            {{ t('daily_rewards.today') }}
          </span>
        </button>
      </div>

      <!-- Деталі вибраного дня -->
      <Card width="100%" height="auto" :padding="10" class="detail-card">
        <div class="detail">
          <div class="detail-head">
            <span class="detail-title">
              {{ t('daily_rewards.day_title', { day: selected.day }) }}
              <em v-if="selected.state === 'today'" class="detail-today">{{ t('daily_rewards.today') }}</em>
            </span>
            <span class="detail-status" :class="{ ok: selected.done, hot: selected.claimable }">{{ statusText }}</span>
          </div>

          <div class="detail-rewards">
            <div v-for="r in rewardParts(selected)" :key="r.icon" class="reward">
              <ItemIcon :item="r.icon" size="32" />
              <span class="reward-amount">+{{ fmt(r.amount) }}</span>
              <span class="reward-label">{{ r.label }}</span>
            </div>
            <span v-if="!rewardParts(selected).length" class="reward-empty">—</span>
          </div>
        </div>
      </Card>

      <!-- Дія -->
      <div class="claim-zone">
        <ButtonText
            width="100%"
            :disabled="!canClaim"
            :loading="isClaiming"
            @click="handleClaim"
        >
          {{ canClaim ? t('daily_rewards.claim') : t('daily_rewards.claimed') }}
        </ButtonText>
        <span v-if="!canClaim" class="claim-caption">{{ t('daily_rewards.come_back_tomorrow') }}</span>
      </div>
    </div>
  </PixelModal>
</template>

<style scoped>
.daily-modal {
  --ink: #3f2e21;
  --muted: #8b6d51;
  --paper: #fff6df;
  --paper-dark: #ead8b7;
  --edge: #8b6d51;
  --berry: #e05b67;
  --berry-dark: #a93c4b;
  --gold: #e9b955;
  --gold-dark: #b9852a;
  --green: #4f8b55;

  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  color: var(--ink);
  font-family: var(--font-pixel, 'Crumbline', sans-serif);
}

:deep(.pixel-modal-dialog),
:deep(.pixel-modal-dialog > .card) {
  max-height: calc(100dvh - 24px);
}

:deep(.pixel-modal-inner),
:deep(.pixel-modal-body) {
  min-height: 0;
}

:deep(.pixel-modal-dialog > .card > .card__content) {
  max-height: calc(100dvh - 56px);
  overflow-y: auto;
}

/* ── Серія ─────────────────────────────── */
.streak-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  background: var(--paper);
  border: var(--b) solid var(--edge);
  box-shadow: inset var(--b) var(--b) 0 rgba(255, 255, 255, 0.6), 0 var(--b) 0 #b99a77;
}

.streak-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.streak-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eyebrow {
  font-size: 13px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.streak-number {
  font-size: 28px;
  line-height: 1;
}

.streak-number span {
  margin-left: 6px;
  font-size: 16px;
  color: var(--muted);
}

.streak-bar {
  display: grid;
  grid-template-columns: repeat(30, 1fr);
  gap: var(--d);
  padding: var(--b);
  background: #5d4a38;
}

.streak-bar i {
  height: calc(var(--d) * 12);
  background: #8b7660;
}
.streak-bar i.mile { background: #a38b45; }
.streak-bar i.on { background: var(--berry); }
.streak-bar i.on.mile { background: var(--gold); }
.streak-bar i.next { animation: bar-next 0.8s infinite steps(1, end); }

@keyframes bar-next {
  0%   { background: var(--berry); }
  50%  { background: #8b7660; }
}

/* ── Календар ──────────────────────────── */
.days-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--b);
  padding-top: calc(var(--b) * 3);
}

.day-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.day-cell:active { transform: translateY(var(--b)); }
.day-cell.is-selected { transform: translateY(calc(var(--b) * -1)); z-index: 2; }
.day-cell.is-selected:active { transform: translateY(0); }

/* грань клітинки зі зрізаними кутами - піксельні "заокруглення" */
.day-face {
  --cut: var(--b);
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: var(--paper);
  border: var(--b) solid var(--edge);
  box-shadow:
      inset var(--b) var(--b) 0 rgba(255, 255, 255, 0.55),
      inset calc(var(--b) * -1) calc(var(--b) * -1) 0 rgba(0, 0, 0, 0.12);
  clip-path: polygon(
      var(--cut) 0, calc(100% - var(--cut)) 0,
      100% var(--cut), 100% calc(100% - var(--cut)),
      calc(100% - var(--cut)) 100%, var(--cut) 100%,
      0 calc(100% - var(--cut)), 0 var(--cut)
  );
}

.day-num {
  position: absolute;
  top: calc(var(--b) * 1.5);
  left: calc(var(--b) * 2);
  font-size: 11px;
  line-height: 1;
  color: var(--muted);
}

.day-icon {
  margin-top: calc(var(--b) * 2);
}

.day-mark {
  position: absolute;
  right: calc(var(--b) * 1.5);
  bottom: calc(var(--b) * 1);
  font-size: 13px;
  line-height: 1;
  color: var(--green);
  text-shadow: var(--d) var(--d) 0 #fff;
}

/* стани */
.is-claimed .day-face,
.is-today.is-done .day-face {
  background: var(--paper-dark);
}
.is-claimed .day-icon,
.is-today.is-done .day-icon {
  opacity: 0.55;
}

.is-missed .day-face {
  background: #ddd5c6;
  border-color: #a39a89;
}
.is-missed .day-icon {
  opacity: 0.3;
  filter: grayscale(1);
}

.is-future .day-icon {
  opacity: 0.9;
}

.is-milestone .day-face {
  border-color: var(--gold-dark);
  background: #fff0c4;
}
.is-milestone.is-claimed .day-face { background: #e6d29a; }
.is-milestone .day-face::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: calc(var(--b) * 4);
  height: calc(var(--b) * 4);
  background: var(--gold);
}

.is-today .day-face {
  border-color: var(--berry-dark);
}
.is-today .day-num {
  color: var(--berry-dark);
}

/* сьогодні, можна забрати: блимає рамка + підстрибує іконка */
.is-claimable .day-face {
  background: #ffe9a8;
  animation: today-blink 0.8s infinite steps(1, end);
}
.is-claimable .day-icon {
  animation: icon-bob 0.9s infinite;
  animation-timing-function: steps(4, end);
}

@keyframes today-blink {
  0%   { border-color: var(--berry-dark); background: #ffe9a8; }
  50%  { border-color: var(--gold-dark);  background: #fff2c4; }
}
@keyframes icon-bob {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(calc(var(--d) * -4)); }
  100% { transform: translateY(0); }
}

.is-selected:not(.is-today) .day-face {
  border-color: var(--ink);
}

/* прапорець "Сьогодні" над клітинкою */
.today-flag {
  position: absolute;
  left: 50%;
  top: calc(var(--b) * -3);
  transform: translateX(-50%);
  padding: calc(var(--b) * 0.5) calc(var(--b) * 2);
  background: var(--berry-dark);
  color: #fff;
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 var(--b) 0 rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 3;
}
.today-flag.is-done {
  background: var(--green);
}

/* ── Деталі дня ────────────────────────── */
.detail-card {
  box-sizing: border-box;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 16px;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-today {
  font-style: normal;
  font-size: 11px;
  padding: 1px 5px;
  background: var(--berry-dark);
  color: #fff;
}

.detail-status {
  font-size: 13px;
  color: var(--muted);
}
.detail-status.ok { color: var(--green); }
.detail-status.hot { color: var(--berry-dark); }

.detail-rewards {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  min-height: 36px;
}

.reward {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reward-amount {
  font-size: 20px;
  line-height: 1;
}

.reward-label {
  font-size: 13px;
  color: var(--muted);
}

.reward-empty {
  color: var(--muted);
}

/* ── Кнопка ────────────────────────────── */
.claim-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.claim-caption {
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .is-claimable .day-face,
  .is-claimable .day-icon,
  .streak-bar i.next { animation: none; }
}
</style>
