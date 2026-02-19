<template>
  <div class="info-column">
    <h2 class="greeting">Ciao</h2>
    <h1 class="username">{{ displayName }}</h1>
    <hr class="sep" />
    <div class="level-progress">
      <div class="progress-ring">
        <svg
          class="progress-svg"
          width="100%"
          height="100%"
          :viewBox="`0 0 ${ringSize} ${ringSize}`"
        >
          <circle
            class="progress-ring__bg"
            :r="ringRadius"
            :cx="ringSize / 2"
            :cy="ringSize / 2"
          />
          <circle
            class="progress-ring__value"
            :r="ringRadius"
            :cx="ringSize / 2"
            :cy="ringSize / 2"
            :style="{
              strokeDasharray: `${ringCircumference} ${ringCircumference}`,
              strokeDashoffset: progressOffset,
            }"
          />
        </svg>
        <div class="progress-text">
          <span class="progress-value">{{ Math.round(progressPercent) }}%</span>
          <span class="progress-label">{{ points }} pt</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__track">
          <div
            class="progress-bar__fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <div class="progress-bar__text">
          <span class="progress-value">{{ Math.round(progressPercent) }}%</span>
          <span class="progress-label">{{ points }} pt</span>
        </div>
      </div>
      <div class="level-info">
        <p class="level-name">{{ levelName }}</p>
        <p v-if="nextLevelLabel" class="level-next">
          Prossimo: {{ nextLevelLabel }}
        </p>
      </div>
    </div>
    <hr class="sep sep-after" />
    <div v-if="quickTasks.length" class="quick-task">
      <h3 class="quick-task-title">Task in evidenza</h3>
      <div class="quick-task-list">
        <div
          v-for="task in quickTasks"
          :key="task._id"
          class="quick-task-card"
        >
          <p class="quick-task-name">{{ task.title }}</p>
          <p class="quick-task-meta">
            <span>{{ task.category }}</span>
            <span v-if="task.expires_at">
              · {{ quickTaskExpiresIn(task) }}
            </span>
          </p>
          <button class="quick-task-link" @click="navigateToTask(task)">
            Vai al task
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="info-name">
    <h1 class="username">{{ displayName }}</h1>
    <hr class="sep" />
    <div class="level-progress compact">
      <div class="progress-ring">
        <svg
          class="progress-svg"
          width="100%"
          height="100%"
          :viewBox="`0 0 ${ringSize} ${ringSize}`"
        >
          <circle
            class="progress-ring__bg"
            :r="ringRadius"
            :cx="ringSize / 2"
            :cy="ringSize / 2"
          />
          <circle
            class="progress-ring__value"
            :r="ringRadius"
            :cx="ringSize / 2"
            :cy="ringSize / 2"
            :style="{
              strokeDasharray: `${ringCircumference} ${ringCircumference}`,
              strokeDashoffset: progressOffset,
            }"
          />
        </svg>
        <div class="progress-text">
          <span class="progress-value">{{ Math.round(progressPercent) }}%</span>
          <span class="progress-label">{{ points }} pt</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__track">
          <div
            class="progress-bar__fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <div class="progress-bar__text">
          <span class="progress-value">{{ Math.round(progressPercent) }}%</span>
          <span class="progress-label">{{ points }} pt</span>
        </div>
      </div>
      <div class="level-info">
        <p class="level-name">{{ levelName }}</p>
        <p v-if="nextLevelLabel" class="level-next">
          Prossimo: {{ nextLevelLabel }}
        </p>
      </div>
    </div>
    <hr class="sep sep-after" />
  </div>
</template>

<script>
import apiService from "@/services/api.js";

export default {
  name: "UserInfoColumn",
  props: {
    quickTasks: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      user: {
        name: "",
        surname: "",
      },
      points: 0,
      level: "",
      levelThresholds: [],
      userLoadError: "",
      ringSize: 120,
      ringRadius: 52,
    };
  },
  computed: {
    displayName() {
      const name = `${this.user.name} ${this.user.surname}`.trim();
      return name || "Utente";
    },
    levelName() {
      return this.level || "Cittadino Base";
    },
    ringCircumference() {
      return 2 * Math.PI * this.ringRadius;
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
    progressOffset() {
      return this.ringCircumference * (1 - this.progressPercent / 100);
    },
    nextLevelLabel() {
      if (this.levelThresholds.length === 0) {
        return "";
      }
      const sorted = [...this.levelThresholds].sort(
        (a, b) => a.points - b.points,
      );
      const next = sorted.find((t) => this.points < t.points);
      if (!next) return "";
      return `${next.level} · ${next.points} pt`;
    },
    limitedQuickTasks() {
      return this.quickTasks.slice(0, 3);
    },
  },
  methods: {
    async refreshUserData() {
      try {
        const data = await apiService.get("/api/v1/users/me/dashboard");
        const user = data?.user || data;
        this.user.name = user?.name || "";
        this.user.surname = user?.surname || "";
        this.points = user?.points || 0;
        this.level = user?.level || "";
        this.levelThresholds = data?.level_thresholds || [];
      } catch (error) {
        console.error(error);
      }
    },
    navigateToTask(task) {
      if (!task?._id) return;
      this.$router.push(`/tasks#task-${task._id}`);
    },
    quickTaskExpiresIn(task) {
      if (!task?.expires_at) return "";
      const now = new Date();
      const end = new Date(task.expires_at);
      const diffMs = end - now;
      if (Number.isNaN(diffMs)) return "";
      if (diffMs <= 0) return "Scaduto";

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) return `Scade tra ${days}g ${hours}h`;
      if (hours > 0) return `Scade tra ${hours}h ${minutes}m`;
      return `Scade tra ${minutes}m`;
    },
  },
  watch: {
    quickTasks() {
      // Refresh user data when tasks change (after submission)
      this.refreshUserData();
    },
  },
  async mounted() {
    try {
      const data = await apiService.get("/api/v1/users/me/dashboard");
      const user = data?.user || data;
      this.user.name = user?.name || "";
      this.user.surname = user?.surname || "";
      this.points = user?.points || 0;
      this.level = user?.level || "";
      this.levelThresholds = data?.level_thresholds || [];
    } catch (error) {
      console.error(error);
      this.userLoadError = "Impossibile recuperare il profilo.";
    }
  },
};
</script>

<style scoped>
.info-name {
  display: none;
}
.info-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: sticky;
  justify-content: start;
  gap: 0;
  margin-left: 20px;
  min-height: 95vh;
  border-radius: 10px;
  width: 15%;
  background-color: #a9ca5f;
  padding: 1rem;
  top: 2vh;
}
.greeting {
  font-family: "Caladea", serif;
  font-weight: 100;
  font-size: 1.2rem;
  line-height: 2rem;
}
.username {
  font-family: "Caladea", serif;
  line-height: 1;
  font-weight: 700;
  font-size: 2rem;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.sep {
  width: 100%;
  border: 1px solid #333;
  margin: 1rem;
}

.sep-after {
  margin: 1rem 0 0;
}

.quick-task {
  margin-top: 1rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-family: "Caladea", serif;
}

.quick-task-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1f1f1f;
}

.quick-task-card {
  background-color: #f7f2e7;
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}

.quick-task-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.quick-task-name {
  margin: 0;
  font-weight: 700;
  color: #1f1f1f;
  font-size: 0.95rem;
}

.quick-task-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #2a2a2a;
}

.quick-task-link {
  align-self: flex-start;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1f1f1f;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.quick-task-link:hover {
  text-decoration: underline;
}

.level-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.25rem;
}

.level-progress.compact {
  margin-top: 0.5rem;
}

.progress-ring {
  position: relative;
  width: 120px;
  height: 120px;
}

.progress-svg {
  transform: rotate(-90deg);
}

.progress-ring__bg {
  fill: transparent;
  stroke: rgba(0, 0, 0, 0.15);
  stroke-width: 10;
}

.progress-ring__value {
  fill: transparent;
  stroke: #333;
  stroke-linecap: round;
  stroke-width: 10;
  transition: stroke-dashoffset 0.4s ease;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  font-family: "Caladea", serif;
}

.progress-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.progress-label {
  font-size: 0.85rem;
  color: #333;
}

.level-info {
  text-align: center;
  font-family: "Caladea", serif;
}

.level-name {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.level-next {
  font-size: 0.85rem;
  margin: 0.1rem 0 0;
  color: #333;
}

.progress-bar {
  display: none;
  width: 90%;
  gap: 0.35rem;
  flex-direction: column;
  align-items: center;
}

.progress-bar__track {
  width: 100%;
  height: 10px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background-color: #333;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.progress-bar__text {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-family: "Caladea", serif;
}

@media (max-width: 600px) {
  .info-column {
    display: none;
  }
  .info-name {
    display: flex;
    margin: 1rem 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 90vw;
    background-color: #a9ca5f;
    border-radius: 10px;
    padding: 1rem;
  }
  .info-name .sep {
    width: 100%;
  }
  .progress-ring {
    display: none;
  }
  .progress-bar {
    display: flex;
  }
}
</style>
