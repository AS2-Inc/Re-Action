<template>
<div class="presentation">
<div class="title-container">
    <h2 class="subtitle">Benvenuto in</h2>
    <h1 class="title">Reaction</h1>
</div>
<div class="statistics">
  <Statistic title="Utenti Registrati" content="1334" />
  <Statistic title="Comuni Aderenti" content="40" />
  <Statistic title="TODO" content="TODO" />
</div>
<div class="button-container">
  <Button to="/login" label="Login" />
  <Button to="/register" label="Registrati" />
</div>
</div>
</template>

<script>
import Button from "@/components/Button.vue";
import Statistic from "../components/Statistic.vue";
export default {
  name: "PresentationView",
  components: {
    Statistic,
    Button,
  },
};
</script>

<style scoped>
.presentation {
  display: flex;
  justify-content: top; 
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 1vh;
  gap: 2vh;
}

.title-container {
  font-family: "Caladea", serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #A9CA5F;
  height: 30vh;
  min-height: 200px;
  width: 80vw;
  border-radius: 10px;
}
.subtitle {
  font-weight: 100;
  font-size: 1.3rem;
  line-height: 1;
}
.title {
  line-height: 1;
  font-weight: 700;
  font-size: 4rem;
}
.statistics {
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
  padding-top: 2rem;
  padding-bottom: 2rem;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 5rem;
  margin-bottom: 10vh;
  gap: 6rem;
}
.button-container {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
}

@media (max-width: 600px) {
  .title-container {
  font-family: "Caladea", serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #A9CA5F;
  height: 30vh;
  min-height: 120px;
  width: 80vw;
  border-radius: 10px;
}
  .button-container {
    display: flex;
    justify-content: center;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 2rem;
    margin: 0;
  }

  .statistics {
    margin: 0;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
  padding-top: 2rem;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
  gap: 1rem;
  }
}
</style>