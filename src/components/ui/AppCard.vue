<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'cream' | 'paper' | 'slot'
  padding?: boolean
}>(), {
  variant: 'paper',
  padding: true
})
</script>

<template>
  <div
      class="app-card"
      :class="[
        `variant-${variant}`,
        { 'has-padding': padding }
      ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.app-card {
  box-sizing: border-box;
  width: 100%;
}

.has-padding {
  padding: 16px;
}

/* Honeywood variants */
.variant-cream {
  border-style: solid;
  border-width: 16px;
  border-image: url('/honeywood/ui/panel_cream.png') 16 fill stretch;
  color: #3f2e21;
}

.variant-paper {
  border-style: solid;
  border-width: 16px;
  border-image: url('/honeywood/ui/panel_paper.png') 16 fill stretch;
  color: #3f2e21;
}

.variant-slot {
  border-style: solid;
  border-width: 12px;
  border-image: url('/honeywood/ui/slot_empty.png') 12 fill stretch;
  background: transparent;
}
</style>
