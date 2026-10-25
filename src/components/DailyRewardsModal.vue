<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PixelModal from '@/components/pixel/PixelModal.vue'
import Card from '@/components/pixel/Card.vue'
import Selected from '@/components/pixel/Selected.vue'
import ButtonText from '@/components/pixel/ButtonText.vue'
import Lock from '@/components/pixel/Lock.vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import { playClickSound, playCoinSound } from '@/services/sound'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const userStore = useUserStore()
const toastStore = useToastStore()

const isClaiming = ref(false)

const currentStreak = computed(() =>
    Math.min(30, Math.max(1, userStore.dailyStreak || 1))
)

const canClaim = computed(() => userStore.canClaimDaily)

interface RewardConfig {
  day: number
  icon: string
  isMilestone?: boolean
}

interface RewardDay extends RewardConfig {
  isClaimed: boolean
  isCurrent: boolean
  isLocked: boolean
  strawberries: number
  coins: number
}

const strawberryRewardDays = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30])

const rewardConfigs: RewardConfig[] = Array.from(
    { length: 30 },
    (_, index) => {
      const day = index + 1
      return {
        day,
        icon: strawberryRewardDays.has(day) ? '/ui/strawberry.png' : '/ui/money.png',
        isMilestone: [7, 14, 21, 28, 30].includes(day),
      }
    }
)

const visibleDays = computed<RewardDay[]>(() => {
  const startDay = currentStreak.value
  const endDay = Math.min(30, startDay + 5)
  const apiDays = userStore.dailyRewardsStatus?.days

  return rewardConfigs
      .filter(({ day }) => day >= startDay && day <= endDay)
      .map((config) => {
        const apiDay = Array.isArray(apiDays)
            ? apiDays.find((item: any) => item.day === config.day)
            : undefined

        const isClaimed = apiDay
            ? (apiDay.claimed ??
                (config.day < startDay ||
                    (config.day === startDay && !canClaim.value)))
            : config.day < startDay ||
            (config.day === startDay && !canClaim.value)

        const isCurrent = apiDay
            ? (apiDay.current ??
                (config.day === startDay && canClaim.value))
            : config.day === startDay && canClaim.value

        const isLocked = apiDay
            ? (apiDay.locked ??
                config.day > startDay)
            : config.day > startDay

        return {
          ...config,
          icon: typeof apiDay?.icon === 'string' && apiDay.icon.startsWith('/')
              ? apiDay.icon
              : config.icon,
          isMilestone: apiDay?.milestone ?? config.isMilestone,
          strawberries: Number(apiDay?.strawberries ?? 0),
          coins: Number(apiDay?.coins ?? 0),
          isClaimed,
          isCurrent,
          isLocked,
        }
      })
})

const progress = computed(() =>
    Math.round((currentStreak.value / 30) * 100)
)

watch(
    () => props.modelValue,
    async (isOpen) => {
      if (isOpen) {
        await userStore.fetchDailyRewards()
      }
    },
    { immediate: true }
)

function rewardDescription(day?: RewardDay) {
  if (!day) return ''
  return [
    day.strawberries > 0 ? `+${day.strawberries} ${t('daily_rewards.strawberries')}` : '',
    day.coins > 0 ? `+${day.coins} ${t('daily_rewards.coins')}` : '',
  ].filter(Boolean).join(' · ')
}

function rewardParts(day?: RewardDay) {
  if (!day) return []
  return [
    ...(day.strawberries > 0 ? [{ icon: '/ui/strawberry.png', amount: day.strawberries, label: t('daily_rewards.strawberries') }] : []),
    ...(day.coins > 0 ? [{ icon: '/ui/money.png', amount: day.coins, label: t('daily_rewards.coins') }] : []),
  ]
}

async function handleClaim() {
  if (!canClaim.value || isClaiming.value) return

  playClickSound()
  isClaiming.value = true

  const dayToClaim = currentStreak.value

  try {
    await userStore.claimDailyReward(dayToClaim)
    playCoinSound()

    toastStore.showToast(
        t('daily_rewards.claimed_toast', { day: dayToClaim }),
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
    <div class="daily-modal">
      <!-- Streak header -->
      <div class="streak-panel">
        <div class="streak-copy">
          <span class="eyebrow">
            {{ t('daily_rewards.streak_label') }}
          </span>

          <div class="streak-number">
            {{ currentStreak }}
            <span>/ 30</span>
          </div>
        </div>

        <div class="streak-fruit">
          <img
              src="/ui/strawberry.png"
              alt=""
              class="strawberry-large"
          />
        </div>

        <div class="progress-track">
          <div
              class="progress-fill"
              :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <!-- Only current day + next six days -->
      <div class="rewards-heading">
        <span>{{ t('daily_rewards.upcoming') }}</span>
        <span class="days-count">
          {{ visibleDays.length }} / 6
        </span>
      </div>

      <div class="days-grid">
        <div
            v-for="day in visibleDays"
            :key="day.day"
            class="day-wrapper"
            :class="{
            'day-wrapper-current': day.isCurrent,
            'day-wrapper-claimed': day.isClaimed,
            'day-wrapper-milestone': day.isMilestone,
          }"
        >
          <Card
              width="100%"
              height="100%"
              :padding="4"
              class="day-card"
              :class="{
              'is-claimed': day.isClaimed,
              'is-current': day.isCurrent,
              'is-locked': day.isLocked,
              'is-milestone': day.isMilestone,
            }"
          >
            <div class="day-card-inner">
              <span class="day-number">{{ day.day }}</span>

              <div class="reward-values" :aria-label="rewardDescription(day)">
                <span v-for="reward in rewardParts(day)" :key="reward.icon" class="reward-value">
                  <img :src="reward.icon" :alt="reward.label" class="reward-value-icon" />
                  <span>+{{ reward.amount }}</span>
                </span>
              </div>

              <span v-if="day.isClaimed" class="claimed-mark">✓</span>
              <div v-else-if="day.isLocked" class="lock-overlay">
                <Lock width="48" height="48" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <!-- Claim action -->
      <div class="claim-panel">
        <div class="claim-copy">
          <span class="claim-title">
            {{
              canClaim
                  ? t('daily_rewards.claim_title')
                  : t('daily_rewards.already_claimed')
            }}
          </span>

          <div v-if="canClaim" class="claim-reward-values" :aria-label="rewardDescription(visibleDays[0])">
            <span v-for="reward in rewardParts(visibleDays[0])" :key="reward.icon" class="reward-value">
              <img :src="reward.icon" :alt="reward.label" class="reward-value-icon" />
              <span>+{{ reward.amount }}</span>
            </span>
          </div>
          <span v-else class="claim-description">{{ t('daily_rewards.come_back_tomorrow') }}</span>
        </div>

        <ButtonText
            v-if="canClaim"
            height="44"
            padding="8px 18px"
            :loading="isClaiming"
            @click="handleClaim"
        >
          {{ t('daily_rewards.claim') }}
        </ButtonText>
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
  --berry: #e05b67;
  --berry-dark: #a93c4b;
  --gold: #e9b955;
  --green: #4f8b55;

  display: flex;
  flex-direction: column;
  gap: 12px;
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

.streak-panel {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px 12px;
  padding: 11px;
  border: 2px solid #8b6d51;
  border-radius: 4px;
  background:
      linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.48),
          transparent 65%
      ),
      var(--paper);
  box-shadow: 0 3px 0 #b99a77;
}

.streak-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.eyebrow {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.streak-number {
  font-size: 27px;
  font-weight: 900;
  line-height: 1;
}

.streak-number span {
  color: var(--muted);
  font-size: 13px;
}

.streak-fruit {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 2px solid #edc8a0;
  border-radius: 6px;
  background: #ffedd8;
}

.strawberry-large {
  width: 34px;
  height: 34px;
  object-fit: contain;
  image-rendering: pixelated;
}

.progress-track {
  grid-column: 1 / -1;
  height: 8px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid #8b6d51;
  border-radius: 2px;
  background: #e6d5b9;
}

.progress-fill {
  height: 100%;
  background: repeating-linear-gradient(
      90deg,
      var(--berry) 0,
      var(--berry) 8px,
      var(--berry-dark) 8px,
      var(--berry-dark) 10px
  );
  transition: width 0.25s ease;
  image-rendering: pixelated;
}

.rewards-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: bold;
}

.days-count {
  color: var(--muted);
  font-size: 10px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.day-wrapper {
  width: 100%;
  aspect-ratio: 1;
  filter: drop-shadow(0 2px 0 rgba(63, 46, 33, 0.12));
}

.day-card {
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 4px;
  transition:
      transform 0.15s ease,
      background-color 0.15s ease,
      opacity 0.15s ease;
}

.day-card-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 4px;
  box-sizing: border-box;
  text-align: center;
}

.day-number {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 16px;
  padding: 0 4px;
  border: 1px solid #d9c5a6;
  border-radius: 3px;
  background: #f3e4ca;
  color: var(--ink);
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.reward-values {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  color: var(--ink);
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
}

.reward-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  white-space: nowrap;
}

.reward-value-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
}

.day-wrapper-current {
  transform: translateY(-2px);
}

.day-wrapper-current .day-card {
  background-color: #fff2cb;
  box-shadow: inset 0 0 0 1px rgba(233, 185, 85, 0.8);
}

.day-wrapper-claimed {
  opacity: 0.8;
}

.day-wrapper-claimed .day-card {
  background-color: #f2ead7;
}

.day-wrapper-milestone .day-number {
  border-color: #d6a94c;
  background: #ffedbd;
  color: #805a16;
}

.claimed-mark {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1px solid #fff;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-family: sans-serif;
  font-size: 10px;
  font-weight: 900;
  z-index: 2;
}

.lock-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 3px;
  background: rgba(67, 51, 36, 0.15);
  z-index: 1;
}

.claim-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border: 2px solid #8b6d51;
  border-radius: 4px;
  background: #f6e8d0;
  box-shadow: 0 3px 0 #b99a77;
}

.daily-modal :deep(.claim-panel .btn-text) {
  font-size: 14px;
}

.claim-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.claim-title {
  font-size: 11px;
  font-weight: bold;
  line-height: 1.4;
}

.claim-description {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.4;
}

.claim-reward-values {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--ink);
  font-size: 11px;
  font-weight: bold;
}

.claim-reward-values .reward-value-icon {
  width: 18px;
  height: 18px;
}

@media (max-width: 360px) {
  .daily-modal {
    gap: 8px;
  }

  .days-grid {
    gap: 6px;
  }

  .reward-value-icon {
    width: 18px;
    height: 18px;
  }

  .claim-panel {
    gap: 5px;
    padding: 7px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .day-card,
  .progress-fill {
    transition: none;
  }
}
</style>