<template>
  <RouterLink :to="to" class="btn">
    {{ label }}
  </RouterLink>
</template>

<script setup>
const props = defineProps({
  to: {
    type: String,
    default: "/login",
  },
  label: {
    type: String,
    default: "Login",
  },
});
</script>

<style scoped>
.btn {
  font-family: "Caladea", serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background-color: #333;
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  transition: background-color 0.3s ease;
  cursor: pointer;
  text-align: center;
  min-width: 120px;
}

.btn:hover {
  background-color: #555;
}
</style>
