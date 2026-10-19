<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string | number
  label?: string
  options: Array<{ value: string | number; label: string }>
  disabled?: boolean
}>(), {
  modelValue: '',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="app-dropdown" :class="{ 'is-disabled': disabled }">
    <label v-if="label" class="dropdown-label">{{ label }}</label>
    <select
        :value="modelValue"
        :disabled="disabled"
        class="dropdown-select"
        @change="onChange"
    >
      <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.app-dropdown {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-label {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: #3f2e21;
}

.dropdown-select {
  padding: 10px 12px;
  border-radius: 6px;
  border: 2px solid #5d4037;
  background-color: #fff8eb;
  font-family: var(--font-pixel-retro);
  font-size: 18px;
  color: #3f2e21;
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
  width: 100%;
}

.dropdown-select:focus {
  border-color: #2e7d32;
}
</style>
