<template>
  <div class="select-input-wrapper">
    <label v-if="label" class="select-input-label" :for="id">
      {{ label }}
    </label>
    <select
      :id="id"
      class="select-input"
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
      <slot></slot>
    </select>
    <p v-if="hint" class="select-hint">{{ hint }}</p>
  </div>
</template>

<script>
export default {
  name: "SelectInputForm",
  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    id: {
      type: String,
      default: "",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "",
    },
    hint: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
};
</script>

<style scoped>
.select-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: "Caladea", serif;
  margin-bottom: 1rem;
}

.select-input-label {
  color: #333;
  font-weight: 600;
}

.select-input {
  padding: 0.75rem 1rem;
  border: 1px solid #ccc;
  background-color: #d4d3b9;
  border-radius: 10px;
  font-size: 1rem;
  font-family: "Caladea", serif;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  width: 100%;
  appearance: none; /* Remove default arrow in some browsers if needed, or style it */
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 0.7rem top 50%;
  background-size: 0.65rem auto;
}

.select-input:focus {
  outline: none;
  border-color: #555;
  box-shadow: 0 0 0 2px rgba(85, 85, 85, 0.2);
}

.select-input:disabled {
  background-color: #e9e9e9;
  cursor: not-allowed;
  opacity: 0.7;
}

.select-hint {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
}
</style>
