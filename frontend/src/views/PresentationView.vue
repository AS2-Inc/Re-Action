<template>
<div class="presentation">
<div class="title-container">
    <h2 class="subtitle">Benvenuto in</h2>
    <h1 class="title">Reaction</h1>
</div>
<div class="statistics">
  <Statistic title="Utenti Registrati" :content="totalUsers" />
  <Statistic title="Comuni Aderenti" :content="totalNeighborhoods" />
  <Statistic title="CO₂ Risparmiata" :content="totalCO2Saved" />
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
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
export default {
  name: "PresentationView",
  components: {
    Statistic,
    Button,
  },
  data() {
    return {
      totalUsers: 0,
      totalNeighborhoods: 0,
      totalCO2Saved: 0,
      isLoading: false,
      error: "",
    };
  },
  async mounted() {
    this.isLoading = true;
    this.error = "";

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/stats/public`);

      if (!response.ok) {
        this.error = "Impossibile recuperare le statistiche.";
        return;
      }

      const data = await response.json();

      this.totalUsers = Number(data?.total_users || 0);
      this.totalNeighborhoods = Number(data?.total_neighborhoods || 0);
      this.totalCO2Saved = Math.round(Number(data?.total_co2_saved || 0));
    } catch (error) {
      console.error("Public stats fetch error:", error);
      this.error = "Impossibile recuperare le statistiche.";
    } finally {
      this.isLoading = false;
    }
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