<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'title' | 'subtitle' | 'body' | 'caption'
  color?: 'default' | 'primary' | 'muted' | 'success' | 'danger' | 'gold'
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
}>(), {
  variant: 'body',
  color: 'default',
  as: 'span'
})

const tag = computed(() => props.as)
</script>

<template>
  <component :is="tag" class="app-text" :class="[`variant-${variant}`, `color-${color}`]">
    <slot />
  </component>
</template>

<style scoped>
.app-text {
  margin: 0;
  line-height: 1.4;
  user-select: none;
}

/* Variants */
.variant-title {
  font-family: var(--font-pixel);
  font-size: 15px;
  font-weight: bold;
}

.variant-subtitle {
  font-family: var(--font-pixel);
  font-size: 12px;
  font-weight: bold;
}

.variant-body {
  font-family: var(--font-pixel-retro);
  font-size: 18px;
}

.variant-caption {
  font-family: var(--font-pixel-retro);
  font-size: 15px;
}

/* Colors */
.color-default {
  color: #3f2e21;
}

.color-primary {
  color: #2b1f17;
}

.color-muted {
  color: #7c624d;
}

.color-success {
  color: #2e7d32;
}

.color-danger {
  color: #c62828;
}

.color-gold {
  color: #d97706;
  text-shadow: 1px 1px 0 #1a1008;
}
</style>
