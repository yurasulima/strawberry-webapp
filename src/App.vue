<script setup lang="ts">

import { ExpandedViewport } from 'vue-tg'

import { useWebAppViewport} from 'vue-tg'

const vp = useWebAppViewport()
vp.disableVerticalSwipes()
</script>



<template>

  <ExpandedViewport />
  <router-view/>
</template>

<style scoped>
</style>
