<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  type?: string
  error?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  type: 'text',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="app-text-field" :class="{ 'has-error': error, 'is-disabled': disabled }">
    <label v-if="label" class="field-label">{{ label }}</label>
    <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="field-input"
        @input="onInput"
    />
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.app-text-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.field-label {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: #3f2e21;
}

.field-input {
  padding: 10px 12px;
  border-radius: 6px;
  border: 2px solid #5d4037;
  background-color: #fff8eb;
  font-family: var(--font-pixel-retro);
  font-size: 18px;
  color: #3f2e21;
  outline: none;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  width: 100%;
}

.field-input:focus {
  border-color: #2e7d32;
  background-color: #ffffff;
}

.has-error .field-input {
  border-color: #c62828;
}

.field-error {
  font-family: var(--font-pixel-retro);
  font-size: 14px;
  color: #c62828;
}
</style>
