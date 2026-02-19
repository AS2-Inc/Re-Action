<template>
	<nav class="navbar">
		<ul class="navbar-list">
			<li v-for="link in links" :key="link.to" class="navbar-item">
				<RouterLink
					:to="link.to"
					class="navbar-link"
					active-class="active"
					exact-active-class="active"
				>
					{{ link.label }}
				</RouterLink>
			</li>
		</ul>
	</nav>
</template>

<script setup>
const props = defineProps({
  links: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.navbar {
	display: inline-flex;
	align-items: center;
	padding: 0.5rem 1rem;
	margin-top: 1rem;
	border: 2px solid #cac6b2;
	border-radius: 10px;
	background: transparent;
}

.navbar-list {
	list-style: none;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin: 0;
	padding: 0;
}

.navbar-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.navbar-item + .navbar-item::before {
	content: "|";
	color: #cac6b2;
}

.navbar-link {
	font-family: "Caladea", serif;
	color: #333;
	text-decoration: none;
	font-weight: 600;
	padding: 0.25rem 0.5rem;
	border-radius: 6px;
	transition: background-color 0.2s ease, color 0.2s ease;
}

.navbar-link.active {
	background-color: #333;
	color: #A9CA5F;
}
</style>
