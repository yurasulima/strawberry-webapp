<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import CatCompanionItem from '@/components/CatCompanionItem.vue'

// Скільки котиків показувати над навбаром (найновіші першими)
const MAX_VISIBLE_CATS = 2

const userStore = useUserStore()
const visibleCats = computed(() => userStore.cats.slice(0, MAX_VISIBLE_CATS))
</script>

<template>
  <CatCompanionItem
      v-for="(cat, i) in visibleCats"
      :key="cat.id ?? `cat-${i}`"
      :cat="cat"
      :index="i"
      :total="visibleCats.length"
  />
</template>
