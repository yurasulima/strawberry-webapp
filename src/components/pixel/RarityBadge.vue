<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { evaluateCatRarity, type CatColors, type CatRarityTier } from '@/services/catRecolor'
import NinePatch from '../NinePatch.vue'

const props = defineProps<{
  colors?: CatColors
  tier?: CatRarityTier
}>()

const { t, te } = useI18n()
const rarity = computed(() => evaluateCatRarity(props.colors))

const currentTier = computed(() => props.tier || rarity.value.tier)

const rarityText = computed(() => {
  const key = `cats.rarity.${currentTier.value.toLowerCase()}`
  return te(key) ? t(key) : rarity.value.label
})

const badgeTexture = computed(() => {
  switch (currentTier.value) {
    case 'MYTHIC':
      return '/ui/badge_mythic.9.png'
    case 'LEGENDARY':
      return '/ui/badge_legendary.9.png'
    case 'EPIC':
      return '/ui/badge_epic.9.png'
    case 'RARE':
      return '/ui/badge_rare.9.png'
    default:
      return '/ui/badge_common.9.png'
  }
})
</script>

<template>
  <div class="rarity-badge-wrapper">
    <NinePatch :src="badgeTexture" :scale="1" class="badge__bg" />
    <span class="badge__content">{{ rarityText }}</span>
  </div>
</template>

<style scoped>
.rarity-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  user-select: none;
  line-height: 1;
  flex-shrink: 0;
}

.badge__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.badge__content {
  position: relative;
  z-index: 1;
  font-family: var(--font-pixel), sans-serif;
  font-size: 11px;
  font-weight: bold;
  color: #ffffff;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
