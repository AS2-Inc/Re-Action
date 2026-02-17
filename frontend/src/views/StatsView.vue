<template>
    <div class="home">
        <UserInfoColumn :quick-tasks="quickTasks" />
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
                </div>
                <div class="level-bar">
                  <div class="level-bar__header">
                    <span class="level-label">Quartiere</span>
                    <span class="level-value">TODO</span>
                  </div>
                  <div class="level-bar__track">
                    <div class="level-bar__fill level-bar__fill--placeholder"></div>
                  </div>
                  <div class="level-bar__meta">
                    <span>TODO</span>
                    <span>TODO</span>
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
import Navbar from "@/components/Navbar.vue";
import UserInfoColumn from "@/components/UserInfoColumn.vue";
import BadgeCard from "@/components/BadgeCard.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "StatsView",
  components: {
    Navbar,
    UserInfoColumn,
    BadgeCard,
  },
  data() {
    return {
      navLinks: [
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
      ],
      badges: [],
      tasks: [],
      points: 0,
      level: "",
      levelThresholds: [],
      streak: 0,
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
      const [badgesRes, dashboardRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/users/me/badges`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/v1/users/me/dashboard`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/v1/tasks`, {
          credentials: "include",
        }),
      ]);

      if (!badgesRes.ok || !dashboardRes.ok || !tasksRes.ok) {
        this.error = "Impossibile recuperare i dati.";
        return;
      }

      const [badgesData, dashboardData, tasksData] = await Promise.all([
        badgesRes.json(),
        dashboardRes.json(),
        tasksRes.json(),
      ]);

      this.badges = Array.isArray(badgesData) ? badgesData : [];
      this.tasks = Array.isArray(tasksData) ? tasksData : [];
      this.points = dashboardData?.user?.points || 0;
      this.level = dashboardData?.user?.level || "";
      this.streak = dashboardData?.user?.streak || 0;
      this.levelThresholds = dashboardData?.level_thresholds || [];
    } catch (error) {
      console.error(error);
      this.error = "Impossibile recuperare i dati.";
    } finally {
      this.isLoading = false;
    }
  },
};
</script>

<style scoped>
.home {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
    width: 100vw;
    height: 100%;
} 
.display {
    margin-left: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    width: 80%;
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