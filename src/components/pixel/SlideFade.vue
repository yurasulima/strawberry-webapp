<script setup lang="ts">
withDefaults(defineProps<{
  name?: string
}>(), {
  name: 'slide-fade'
})
</script>

<template>
  <Transition :name="name" mode="out-in">
    <slot />
  </Transition>
</template>

<style>
/* Slide-Fade Анімація появи картки/панелі */
.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-fade-leave-active {
  transition: all 0.18s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
</style>
