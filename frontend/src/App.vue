<script setup>
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Caladea:ital,wght@0,400;0,700;1,400;1,700&display=swap');

* {
  margin: 0;
  padding: 0;
}

html, body {
  background: #e4e6ce;
  color: #333;
  line-height: 1.6;
  height: 100vh;
  width: 100vw;
}

#app {
  display: flex;
  justify-content: top; 
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 1vh;
}
</style>
