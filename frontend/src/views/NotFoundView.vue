<template>
  <div class="not-found">
    <div class="content">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <RouterLink class="btn" to="/tasks">Go to Home</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  color: var(--color-text);
}

.content {
  text-align: center;
  padding: 2rem;
  border-radius: 10px;
  min-width: 300px;
}

h1 {
  font-size: 8rem;
  font-weight: bold;
  margin: 0;
  line-height: 1;
  color: #2c3e50;
}

h2 {
  font-size: 2rem;
  margin: 1rem 0;
  font-weight: 600;
  color: #2c3e50;
}

p {
  font-size: 1.2rem;
  margin: 1.5rem 0 2rem;
  color: #2c3e50;
}

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
