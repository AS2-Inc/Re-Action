<template>
  <div class="home">
    <div class="display">
      <div class="data-display">
        <Navbar :links="navLinks" />

        <section class="leaderboard-section">
          <header class="leaderboard__header">
            <div>
              <p class="leaderboard__eyebrow">Classifica quartieri</p>
              <h2 class="section-title">Leaderboard</h2>
            </div>
            <div class="leaderboard__controls">
              <label class="control">
                <span>Periodo</span>
                <select v-model="period" @change="fetchLeaderboard">
                  <option value="weekly">Settimanale</option>
                  <option value="monthly">Mensile</option>
                  <option value="annually">Annuale</option>
                </select>
              </label>
              <label class="control">
                <span>Risultati</span>
                <select v-model.number="limit" @change="fetchLeaderboard">
                  <option :value="10">Top 10</option>
                  <option :value="20">Top 20</option>
                  <option :value="50">Top 50</option>
                </select>
              </label>
            </div>
          </header>

          <div v-if="isLoading" class="state">Caricamento classifica...</div>
          <div v-else-if="error" class="state error">{{ error }}</div>

          <div v-else class="leaderboard__table">
            <div class="table__row table__row--header">
              <span>#</span>
              <span>Quartiere</span>
              <span>Città</span>
              <span>Punteggio Norm.</span>
              <span>Partecipazione</span>
              <span>Miglioramento</span>
            </div>

            <div
              v-for="entry in leaderboard"
              :key="entry.neighborhood_id"
              class="table__row"
            >
              <span class="rank">{{ entry.rank }}</span>
              <span class="name">{{ entry.name }}</span>
              <span class="city">{{ entry.city }}</span>
              <span class="score">{{ formatNumber(entry.normalized_points) }}</span>
              <span class="metric">{{ formatPercent(entry.participation_rate) }}</span>
              <span class="metric">{{ formatNumber(entry.improvement_factor) }}%</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import Navbar from "@/components/Navbar.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "LeaderboardView",
  components: {
    Navbar,
  },
  data() {
    return {
      leaderboard: [],
      period: "monthly",
      limit: 20,
      navLinks: [
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
        { label: "Leaderboard", to: "/leaderboard" },
        { label: "Profilo", to: "/profile" },
      ],
      isLoading: false,
      error: "",
    };
  },
  mounted() {
    this.fetchLeaderboard();
  },
  methods: {
    async fetchLeaderboard() {
      this.isLoading = true;
      this.error = "";

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/neighborhood/ranking?period=${this.period}&limit=${this.limit}`,
        );

        if (!response.ok) {
          this.error = "Impossibile recuperare la classifica.";
          return;
        }

        const data = await response.json();
        this.leaderboard = Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
        this.error = "Impossibile recuperare la classifica.";
      } finally {
        this.isLoading = false;
      }
    },
    formatNumber(value) {
      const num = Number(value || 0);
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatPercent(value) {
      const num = Number(value || 0);
      return `${Math.round(num * 10) / 10}%`;
    },
  },
};
</script>

<style scoped>
.home {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  width: 100%;
  height: 100%;
}

.display {
  margin-left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
}

.data-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  width: 100%;
  height: 100%;
  gap: 2rem;
}

.leaderboard-section {
  width: 100%;
  max-width: 1024px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-family: "Caladea", serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  margin: 0.2rem 0 0.75rem;
}

.leaderboard__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.leaderboard__eyebrow {
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7f9e3e;
  margin: 0;
}

.leaderboard__subtitle {
  margin: 0;
  color: #555;
}

.leaderboard__controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #333;
  font-family: "Caladea", serif;
}

.control select {
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  border: 2px solid #cac6b2;
  background: #f7f2e7;
  min-width: 140px;
  font-family: "Caladea", serif;
}

.state {
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #333;
  text-align: center;
}

.state.error {
  color: #b91c1c;
}

.leaderboard__table {
  display: grid;
  gap: 0.75rem;
}

.table__row {
  display: grid;
  grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 0.8fr 0.8fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: #f7f2e7;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  font-size: 0.95rem;
  color: #333;
}

.table__row--header {
  background: #f1f5e9;
  font-weight: 600;
  color: #4b5f2a;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  box-shadow: none;
}

.rank {
  font-weight: 700;
  color: #7f9e3e;
}

.name {
  font-weight: 600;
}

.score {
  font-weight: 700;
  color: #2c3e50;
}

.metric {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 900px) {
  .table__row {
    grid-template-columns: 36px 1.2fr 1fr 1fr;
    grid-auto-rows: auto;
  }

  .table__row span:nth-child(n + 5) {
    display: none;
  }
}

@media (max-width: 600px) {
  .leaderboard-section {
    padding: 0 1rem 1.5rem;
  }

  .table__row {
    grid-template-columns: 32px 1.4fr 1fr;
  }

  .table__row span:nth-child(4) {
    display: none;
  }
}
</style>
