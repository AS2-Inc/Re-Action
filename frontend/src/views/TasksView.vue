<template>
  <div class="home">
    <div class="display">
      <Navbar :links="navLinks" />
      <div class="data-display">
        <h1 class="page-title">Tasks</h1>
        <div v-if="loading" class="state state-loading">Caricamento task...</div>
        <div v-else-if="error" class="state state-error">{{ error }}</div>
        <div v-else class="tasks-grid">
          <div
            v-for="task in assignedTasks"
            :key="task._id"
            :id="`task-${task._id}`"
            class="task-card"
            @click="handleTaskClick(task)"
            :class="{ 'task-card--clickable': task.verification_method === 'QUIZ' }"
          >
            <div class="task-header">
              <h2 class="task-title">{{ task.title }}</h2>
              <div class="task-status-container">
                <span
                  v-if="task.assignment_status !== 'ASSIGNED'"
                  class="task-status"
                  :class="statusClass(task.assignment_status)"
                >
                  {{ task.assignment_status }}
                </span>
                <span
                  v-if="task.assignment_status === 'COMPLETED' && task.frequency !== 'onetime'"
                  class="task-repeatable"
                >
                  Ripetibile
                </span>
              </div>
            </div>
            <p class="task-description">{{ task.description || "Nessuna descrizione" }}</p>

            <div class="task-meta">
              <div class="meta-item">
                <span class="meta-label">Categoria</span>
                <span class="meta-value">{{ task.category }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Difficoltà</span>
                <span class="meta-value">{{ task.difficulty || "-" }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Punti</span>
                <span class="meta-value">{{ task.base_points }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Frequenza</span>
                <span class="meta-value">{{ capitalizeFrequency(task.frequency) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Verifica</span>
                <span class="meta-value">{{ task.verification_method }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Scadenza</span>
                <span class="meta-value">
                  {{ task.expires_at ? formatExpiresAt(task.expires_at) : "N/A" }}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Tempo rimanente</span>
                <span class="meta-value">
                  {{ task.expires_at ? formatTimeUntil(task.expires_at) : "N/A" }}
                </span>
              </div>
            </div>

            <div v-if="hasImpactMetrics(task)" class="task-impact">
              <div
                v-if="(task.impact_metrics?.co2_saved ?? 0) > 0"
                class="impact-item"
              >
                <span class="impact-label">CO2</span>
                <span class="impact-value">
                  {{ task.impact_metrics?.co2_saved }} kg
                </span>
              </div>
              <div
                v-if="(task.impact_metrics?.waste_recycled ?? 0) > 0"
                class="impact-item"
              >
                <span class="impact-label">Rifiuti</span>
                <span class="impact-value">
                  {{ task.impact_metrics?.waste_recycled }} kg
                </span>
              </div>
              <div
                v-if="(task.impact_metrics?.distance ?? 0) > 0"
                class="impact-item"
              >
                <span class="impact-label">Distanza</span>
                <span class="impact-value">
                  {{ task.impact_metrics?.distance }} km
                </span>
              </div>
            </div>
          </div>
          <div v-if="assignedTasks.length === 0" class="state state-empty">
            Nessun task assegnato al momento.
          </div>
        </div>
      </div>
    </div>
    <QuizModal
      :is-open="quizModalOpen"
      :quiz="selectedQuiz"
      :task-id="selectedTaskId"
      :task="selectedTask"
      @close="closeQuizModal"
      @quiz-submitted="onQuizSubmitted"
    />
  </div>
</template>

<script>
import Navbar from "@/components/Navbar.vue";
import QuizModal from "@/components/QuizModal.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "TasksView",
  components: {
    Navbar,
    QuizModal,
  },
  data() {
    return {
      navLinks: [
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
      ],
      tasks: [],
      loading: false,
      error: "",
      quizModalOpen: false,
      selectedQuiz: null,
      selectedTaskId: null,
      selectedTask: null,
    };
  },
  computed: {
    assignedTasks() {
      return this.tasks.filter(
        (task) => task.assignment_status !== "AVAILABLE",
      );
    },
    firstAssignedTask() {
      return this.assignedTasks[0] || null;
    },
    quickTasks() {
      return this.assignedTasks.slice(0, 3);
    },
  },
  async mounted() {
    this.loading = true;
    this.error = "";
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        this.error = payload?.error || "Impossibile recuperare i task.";
        return;
      }

      this.tasks = await response.json();
    } catch (error) {
      console.error(error);
      this.error = "Impossibile contattare il server.";
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async handleTaskClick(task) {
      if (task.verification_method === "QUIZ") {
        await this.loadAndOpenQuiz(task);
      }
    },
    async loadAndOpenQuiz(task) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/quizzes/${task.verification_criteria?.quiz_id}`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          alert("Impossibile caricare il quiz.");
          return;
        }

        const quiz = await response.json();
        this.selectedQuiz = quiz;
        this.selectedTaskId = task._id;
        this.selectedTask = task;
        this.quizModalOpen = true;
      } catch (error) {
        console.error(error);
        alert("Errore nel caricamento del quiz.");
      }
    },
    closeQuizModal() {
      this.quizModalOpen = false;
      this.selectedQuiz = null;
      this.selectedTaskId = null;
      this.selectedTask = null;
    },
    async onQuizSubmitted(payload) {
      const pointsEarned = payload?.points_earned || 0;
      alert(`Quiz inviato con successo! +${pointsEarned} punti`);

      // Refresh tasks and emit event to parent to update user info
      this.$emit("points-updated");

      this.loading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          this.error = payload?.error || "Impossibile recuperare i task.";
          return;
        }

        this.tasks = await response.json();
      } catch (error) {
        console.error(error);
        this.error = "Impossibile contattare il server.";
      } finally {
        this.loading = false;
      }
    },
    statusClass(status) {
      if (status === "COMPLETED") return "status-completed";
      if (status === "EXPIRED") return "status-expired";
      return "status-assigned";
    },
    capitalizeFrequency(frequency) {
      if (!frequency) return "-";
      return (
        frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase()
      );
    },
    hasImpactMetrics(task) {
      const metrics = task.impact_metrics || {};
      return (
        (metrics.co2_saved ?? 0) > 0 ||
        (metrics.waste_recycled ?? 0) > 0 ||
        (metrics.distance ?? 0) > 0
      );
    },
    formatExpiresAt(value) {
      const date = new Date(value);
      return date.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatTimeUntil(value) {
      const now = new Date();
      const end = new Date(value);
      const diffMs = end - now;
      if (Number.isNaN(diffMs)) return "N/A";
      if (diffMs <= 0) return "Scaduto";

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) return `${days}g ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
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
}

.page-title {
  font-family: "Caladea", serif;
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
  color: #1f1f1f;
}

.state {
  font-family: "Caladea", serif;
  font-weight: 600;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  background-color: #f1ecdf;
  color: #1f1f1f;
}

.state-error {
  background-color: #e7e0cf;
  color: #1f1f1f;
}

.state-empty {
  background-color: #f1ecdf;
  color: #1f1f1f;
}

.tasks-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem 2rem 2rem 2rem;
  margin: 0 auto;
}

.task-card {
  background-color: #fbf8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.task-card--clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.task-card--clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.task-card--clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.task-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.task-status-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.task-title {
  font-family: "Caladea", serif;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

.task-status {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.task-repeatable {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #add8e6;
  color: #1f1f1f;
}

.status-assigned {
  background-color: #e2ead1;
  color: #1f1f1f;
}

.status-completed {
  background-color: #cfe1b4;
  color: #1f1f1f;
}

.status-expired {
  background-color: #e7e0cf;
  color: #1f1f1f;
}

.task-description {
  margin: 0;
  color: #2a2a2a;
  font-family: "Caladea", serif;
}

.task-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.meta-label {
  font-size: 0.75rem;
  color: #3d3d3d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-weight: 600;
  color: #1f1f1f;
}

.task-impact {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.impact-item {
  background-color: #efe9db;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.impact-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3d3d3d;
}

.impact-value {
  font-weight: 600;
  color: #1f1f1f;
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
  .tasks-grid {
    grid-template-columns: 1fr;
  }
}
</style>