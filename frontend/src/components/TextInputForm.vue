<template>
	<div class="text-input-wrapper">
		<label v-if="props.label" class="text-input-label" :for="props.id">
			{{ props.label }}
		</label>
		<input
			:id="props.id"
			class="text-input"
			:type="props.type"
			:name="props.name"
			:placeholder="props.placeholder"
			:value="props.modelValue"
			@input="emit('update:modelValue', $event.target.value)"
		/>
	</div>
</template>

<script setup>
const emit = defineEmits(["update:modelValue"]);

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  id: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "text",
  },
});
</script>

<style scoped>
.text-input-wrapper {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	font-family: "Caladea", serif;
}

.text-input-label {
	color: #333;
	font-weight: 600;
}

.text-input {
	padding: 0.75rem 1rem;
	border: 1px solid #ccc;
    background-color: #d4d3b9;
	border-radius: 10px;
	font-size: 1rem;
	font-family: "Caladea", serif;
	transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.text-input:focus {
	outline: none;
	border-color: #555;
	box-shadow: 0 0 0 2px rgba(85, 85, 85, 0.2);
}
</style>
