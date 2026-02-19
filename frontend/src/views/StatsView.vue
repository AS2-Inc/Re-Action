<template>
    <div class="home">
        <div class="display">
            <div class="data-display">
              <Navbar :links="navLinks" />
            <section class="level-section">
              <div class="level-rank">
                <p class="level-rank__label">Livello attuale</p>
                <h1 class="level-rank__value">{{ levelName }}</h1>
              </div>
              <div class="level-card">
                <div class="level-bar">
                  <div class="level-bar__header">
                    <span class="level-label">Utente</span>
                    <span class="level-value">{{ levelName }}</span>
                  </div>
                  <div class="level-bar__track">
                    <div
                      class="level-bar__fill"
                      :style="{ width: `${progressPercent}%` }"
                    ></div>
                  </div>
                  <div class="level-bar__meta">
                    <span>{{ Math.round(progressPercent) }}%</span>
                    <span>{{ points }} pt</span>
                  </div>
                  <div class="user-info-card" v-if="neighborhoodName">
                    <div class="neighborhood-header">
                      <h3 class="neighborhood-name"> Statistiche Ambientali</h3>
                    </div>
                    <div class="neighborhood-stats">
                      <div class="neighborhood-stat">
                        <span class="stat-label">CO₂ salvata</span>
                        <span class="stat-value">{{ co2Saved.toFixed(2) }} kg</span>
                      </div>
                      <div class="neighborhood-stat">
                        <span class="stat-label">Rifiuti riciclati</span>
                        <span class="stat-value">{{ wasteRecycled.toFixed(2) }} kg</span>
                      </div>
                      <div class="neighborhood-stat">
                        <span class="stat-label">KM green</span>
                        <span class="stat-value">{{ kmGreen.toFixed(2) }} km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="neighborhood-env-card" v-if="neighborhoodName">
                <div class="neighborhood-header">
                  <h3 class="neighborhood-name">{{ neighborhoodName }} - Dati ambientali</h3>
                  <div class="neighborhood-core-stats">
                    <div class="total-score-card">
                      <div class="total-score-display">
                        <span class="total-score-icon">️🏛️</span>
                        <div class="total-score-content">
                          <p class="total-score-label">Punteggio totale quartiere</p>
                          <p class="total-score-value">{{ neighborhoodTotalScore }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="total-score-side-info">
                      <div class="side-info-item">
                        <p class="side-info-label">Posizione</p>
                        <p class="side-info-value">#{{ neighborhoodRankingPosition }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="neighborhood-stats">
                  <div class="neighborhood-stat">
                    <span class="stat-label">CO₂ salvata (quartiere)</span>
                    <span class="stat-value">{{ neighborhoodCo2Saved.toFixed(1) }} kg</span>
                  </div>
                  <div class="neighborhood-stat">
                    <span class="stat-label">Rifiuti riciclati (quartiere)</span>
                    <span class="stat-value">{{ neighborhoodWasteRecycled.toFixed(1) }} kg</span>
                  </div>
                  <div class="neighborhood-stat">
                    <span class="stat-label">Km Green (quartiere)</span>
                    <span class="stat-value">{{ neighborhoodKmGreen.toFixed(1) }} km</span>
                  </div>
                </div>
              </div>
            </section>

            <hr class="section-sep" />

            <section class="streak-section">
              <h2 class="section-title">Streak</h2>
              <div class="streak-card">
                <div class="streak-display">
                  <span class="streak-icon">🔥</span>
                  <div class="streak-content">
                    <p class="streak-label">Streak attuale</p>
                    <p class="streak-value">{{ streak }} giorni</p>
                  </div>
                </div>
              </div>
            </section>

            <hr class="section-sep" />

            <section class="badges-section">
              <h2 class="section-title">Badge</h2>
              <p v-if="isLoading" class="state">Caricamento badge...</p>
              <p v-else-if="error" class="state error">{{ error }}</p>
              <ul v-else class="badge-list">
                <li v-if="earnedBadges.length === 0" class="state">
                  Nessun badge ottenuto.
                </li>
                <li v-for="badge in earnedBadges" :key="badge._id" class="badge-item">
                  <span class="badge-icon">{{ badge.icon }}</span>
                  <div class="badge-info">
                    <p class="badge-name">{{ badge.name }}</p>
                    <p class="badge-desc">{{ badge.description }}</p>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
    </div>
</template>

<script>
import BadgeCard from "@/components/BadgeCard.vue";
import Navbar from "@/components/Navbar.vue";
import apiService from "@/services/api.js";

export default {
  name: "StatsView",
  components: {
    Navbar,
    BadgeCard,
  },
  data() {
    return {
      navLinks: [
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
        { label: "Leaderboard", to: "/leaderboard" },
        { label: "Premi", to: "/rewards" },
        { label: "Profilo", to: "/profile" },
      ],
      badges: [],
      tasks: [],
      points: 0,
      level: "",
      levelThresholds: [],
      streak: 0,
      neighborhoodId: "",
      neighborhoodTotalScore: 0,
      neighborhoodName: "",
      neighborhoodRankingPosition: 0,
      co2Saved: 0,
      wasteRecycled: 0,
      kmGreen: 0,
      neighborhoodCo2Saved: 0,
      neighborhoodWasteRecycled: 0,
      neighborhoodKmGreen: 0,
      neighborhoodPeriod: "monthly",
      isLoading: false,
      error: "",
    };
  },
  computed: {
    earnedBadges() {
      return this.badges.filter((badge) => badge.earned);
    },
    assignedTasks() {
      return this.tasks.filter(
        (task) => task.assignment_status !== "AVAILABLE",
      );
    },
    quickTasks() {
      return this.assignedTasks.slice(0, 3);
    },
    levelName() {
      return this.level || "Cittadino Base";
    },
    progressPercent() {
      if (this.levelThresholds.length === 0) {
        return 0;
      }
      const sorted = [...this.levelThresholds].sort(
        (a, b) => a.points - b.points,
      );
      const currentIndex = [...sorted]
        .reverse()
        .findIndex((t) => this.points >= t.points);
      const currentLevelIndex =
        currentIndex === -1 ? 0 : sorted.length - 1 - currentIndex;
      const current = sorted[currentLevelIndex] || sorted[0];
      const next = sorted[currentLevelIndex + 1];

      if (!next) {
        return 100;
      }

      const range = next.points - current.points;
      if (range <= 0) {
        return 0;
      }

      const progress = ((this.points - current.points) / range) * 100;
      return Math.max(0, Math.min(100, progress));
    },
  },
  async mounted() {
    this.isLoading = true;
    this.error = "";

    try {
      const [badgesData, dashboardData, tasksData] = await Promise.all([
        apiService.get("/api/v1/users/me/badges"),
        apiService.get("/api/v1/users/me/dashboard"),
        apiService.get("/api/v1/tasks"),
      ]);

      this.badges = Array.isArray(badgesData) ? badgesData : [];
      this.tasks = Array.isArray(tasksData) ? tasksData : [];
      this.points = dashboardData?.user?.points || 0;
      this.level = dashboardData?.user?.level || "";
      this.streak = dashboardData?.user?.streak || 0;
      this.co2Saved = Number(dashboardData?.ambient?.co2_saved || 0);
      this.wasteRecycled = Number(dashboardData?.ambient?.waste_recycled || 0);
      this.kmGreen = Number(dashboardData?.ambient?.km_green || 0);

      const neighborhood = dashboardData?.neighborhood || null;
      this.neighborhoodId = neighborhood?.id || neighborhood?._id || "";
      this.neighborhoodName = neighborhood?.name || "";
      this.neighborhoodTotalScore = Number(neighborhood?.base_points || 0);
      this.neighborhoodRankingPosition =
        Number(neighborhood?.ranking_position || 0) || 0;
      this.neighborhoodCo2Saved = Number(
        neighborhood?.environmental_data?.co2_saved || 0,
      );
      this.neighborhoodWasteRecycled = Number(
        neighborhood?.environmental_data?.waste_recycled || 0,
      );
      this.neighborhoodKmGreen = Number(
        neighborhood?.environmental_data?.km_green || 0,
      );

      if (this.neighborhoodId) {
        await Promise.all([
          this.fetchNeighborhoodDetails(this.neighborhoodId),
          this.fetchNeighborhoodRanking(this.neighborhoodId),
        ]);
      }
      this.levelThresholds = dashboardData?.level_thresholds || [];
    } catch (error) {
      console.error(error);
      this.error = "Impossibile recuperare i dati.";
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    async fetchNeighborhoodDetails(neighborhoodId) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/neighborhood/${neighborhoodId}`,
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        this.neighborhoodName = data?.name || this.neighborhoodName;
        this.neighborhoodTotalScore = Number(data?.base_points || 0);
        this.neighborhoodCo2Saved = Number(
          data?.environmental_data?.co2_saved || 0,
        );
        this.neighborhoodWasteRecycled = Number(
          data?.environmental_data?.waste_recycled || 0,
        );
        this.neighborhoodKmGreen = Number(
          data?.environmental_data?.km_green || 0,
        );
      } catch (error) {
        console.error("Neighborhood details fetch error:", error);
      }
    },
    async fetchNeighborhoodRanking(neighborhoodId) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/neighborhood/ranking?period=${this.neighborhoodPeriod}&limit=200`,
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const leaderboard = Array.isArray(data) ? data : [];
        const entry = leaderboard.find(
          (item) => String(item.neighborhood_id) === String(neighborhoodId),
        );

        if (entry) {
          this.neighborhoodRankingPosition = Number(entry.rank || 0) || 0;
        }
      } catch (error) {
        console.error("Neighborhood ranking fetch error:", error);
      }
    },
    async onNeighborhoodPeriodChange() {
      if (!this.neighborhoodId) {
        return;
      }

      await this.fetchNeighborhoodRanking(this.neighborhoodId);
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

.section-title {
  font-family: "Caladea", serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.75rem;
}

.section-sep {
  width: 100%;
  max-width: 720px;
  border: 1px solid #333;
  margin: 0.5rem 0 1.5rem;
}

.level-rank {
  text-align: center;
  margin-bottom: 1rem;
}

.level-rank__label {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 1rem;
  color: #333;
}

.level-rank__value {
  margin: 0.25rem 0 0;
  font-family: "Caladea", serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: #333;
}

.level-section,
.badges-section {
  width: 100%;
  margin-top: 1rem;
  max-width: 720px;
}

.level-card {
  background-color: #f7f2e7;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.total-score-card {
  display: flex;
  align-items: center;
  
  width: 100%;
  max-width: 720px;
  background-color: rgba(127, 158, 62, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
}

.total-score-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.total-score-icon {
  font-size: 3.5rem;
}

.total-score-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.total-score-label {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 1.2rem;
  color: #333;
}

.total-score-side-info{
  display: flex;
  gap: 1rem;
  flex-direction: column;
}


.total-score-value {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 2rem;
  font-weight: 700;
  color: #7f9e3e;
}

.user-info-card {
  width: 100%;
  max-width: 720px;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  margin-top: 1rem;
}

.neighborhood-env-card {
  width: 100%;
  max-width: 720px;
  background-color: #f7f2e7;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  margin-top: 1rem;
}

.neighborhood-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.neighborhood-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.neighborhood-name {
  margin: 0;
  padding: 0;
  font-family: "Caladea", serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
}

.period-control {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-family: "Caladea", serif;
  font-size: 0.85rem;
  color: #333;
}

.period-control select {
  padding: 0.4rem 0.7rem;
  border-radius: 10px;
  border: 2px solid #cac6b2;
  background: #f7f2e7;
  font-family: "Caladea", serif;
}


.neighborhood-stats {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.neighborhood-stat {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  padding: 0.75rem;
  background-color: rgba(127, 158, 62, 0.1);
  border-radius: 8px;
}

.stat-label {
  font-family: "Caladea", serif;
  font-size: 0.85rem;
  color: #666;
}

.stat-value {
  font-family: "Caladea", serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #7f9e3e;
}

.side-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.75rem;
  height: 100%;
  width: 200px;
  background-color: rgba(127, 158, 62, 0.1);
  border-radius: 8px;
}

.side-info-label {
  font-family: "Caladea", serif;
  font-size: 1rem;
  color: #666;
}

.side-info-value {
  font-family: "Caladea", serif;
  font-size: 3rem;
  font-weight: 700;
  color: #7f9e3e;
}

.trend-up {
  color: #22c55e;
}

.trend-down {
  color: #ef4444;
}

.trend-stable {
  color: #7f9e3e;
}

.neighborhood-card {
  width: 100%;
  max-width: 720px;
  background-color: #f7f2e7;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.neighborhood-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.neighborhood-icon {
  font-size: 3rem;
}

.neighborhood-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.neighborhood-label {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #333;
}

.neighborhood-value {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: #333;
}

.neighborhood-core-stats{
  height: 100%;
  display: flex;
  gap: 1.5rem;
  margin-top: 0.75rem;
}

.level-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-bar__header,
.level-bar__meta {
  display: flex;
  justify-content: space-between;
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #333;
}

.level-label {
  font-weight: 700;
}

.level-bar__track {
  width: 100%;
  height: 10px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.level-bar__fill {
  height: 100%;
  background-color: #333;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.level-bar__fill--placeholder {
  width: 30%;
  opacity: 0.4;
}

.badge-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.badge-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.badge-group__title {
  margin: 0 0 0.75rem;
  font-family: "Caladea", serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.badge-mockup-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: #f7f2e7;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.badge-icon {
  font-size: 1.5rem;
}

.badge-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.badge-name {
  font-family: "Caladea", serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.badge-desc {
  margin: 0;
  font-size: 0.9rem;
  color: #444;
}

.state {
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #333;
}

.state.error {
  color: #b91c1c;
}

.streak-section {
  width: 100%;
  max-width: 720px;
}

.streak-card {
  background-color: #f7f2e7;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.streak-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.streak-icon {
  font-size: 3rem;
}

.streak-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.streak-label {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #333;
}

.streak-value {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: #d97706;
}
@media (max-width: 600px) {
    .home {
        flex-direction: column;
        align-items: center;
    }
    .display {
        margin: 0;
        width: 100%;
    }
  .data-display {
    padding: 0 1rem 2rem;
  }
  .level-rank__value {
    font-size: 1.8rem;
  }
}
</style>