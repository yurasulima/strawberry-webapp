<script setup lang="ts">
import { computed } from 'vue'
import Image from './Image.vue'

const props = withDefaults(defineProps<{
  item?: string | number | null
  name?: string | number | null
  id?: string | number | null
  size?: number | string
  width?: number | string
  height?: number | string
  alt?: string
  fit?: 'contain' | 'cover' | 'fill' | 'none'
  fallback?: string
}>(), {
  item: '',
  name: '',
  id: '',
  size: undefined,
  width: undefined,
  height: undefined,
  alt: '',
  fit: 'contain',
  fallback: '/items/strawberry.png'
})

const itemId = computed<string>(() => {
  const val = props.item || props.name || props.id || ''
  return String(val).trim()
})

const textureSrc = computed<string>(() => {
  const raw = itemId.value
  if (!raw) return props.fallback || '/items/strawberry.png'

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/') || raw.startsWith('data:')) {
    return raw
  }

  const clean = raw.toLowerCase().trim().replace(/[\s-]+/g, '_')
  return `/items/${clean}.png`
})

const computedAlt = computed(() => {
  if (props.alt) return props.alt
  if (itemId.value) return itemId.value
  return 'Item'
})
</script>

<template>
  <Image
    :src="textureSrc"
    :alt="computedAlt"
    :size="size"
    :width="width"
    :height="height"
    :fit="fit"
    :fallback="fallback"
    class="item-icon-wrapper"
  />
</template>

<style scoped>
.item-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
