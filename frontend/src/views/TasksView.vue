<template>
  <div class="home">
    <div class="display">
      <div class="data-display">
        <Navbar :links="navLinks" />
        <h1 class="page-title">Tasks</h1>
        <div v-if="loading" class="state state-loading">Caricamento task...</div>
        <div v-else-if="error" class="state state-error">{{ error }}</div>
        <div v-else class="tasks-grid">
          <TaskCard
            v-for="task in assignedTasks"
            :key="task._id"
            :id="`task-${task._id}`"
            :task="task"
            @task-click="handleTaskClick"
          />
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
    <PhotoSubmissionModal
      :is-open="photoModalOpen"
      :task="selectedTaskForPhoto"
      @close="closePhotoModal"
      @photo-submitted="onPhotoSubmitted"
    />
  </div>
</template>

<script>
import Navbar from "@/components/Navbar.vue";
import PhotoSubmissionModal from "@/components/PhotoSubmissionModal.vue";
import QuizModal from "@/components/QuizModal.vue";
import TaskCard from "@/components/TaskCard.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "TasksView",
  components: {
    Navbar,
    TaskCard,
    QuizModal,
    PhotoSubmissionModal,
  },
  data() {
    return {
      navLinks: [
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
        { label: "Profilo", to: "/profile" },
      ],
      tasks: [],
      loading: false,
      error: "",
      quizModalOpen: false,
      selectedQuiz: null,
      selectedTaskId: null,
      selectedTask: null,
      photoModalOpen: false,
      selectedTaskForPhoto: {},
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
    await this.fetchTasks();
  },
  methods: {
    async handleTaskClick(task) {
      if (task.verification_method === "QUIZ") {
        await this.loadAndOpenQuiz(task);
      } else if (task.verification_method === "PHOTO_UPLOAD") {
        this.selectedTaskForPhoto = task;
        this.photoModalOpen = true;
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

      await this.fetchTasks();
    },
    closePhotoModal() {
      this.photoModalOpen = false;
      this.selectedTaskForPhoto = {};
    },
    async onPhotoSubmitted(result) {
      if (result.submission_status === "PENDING") {
        alert("Foto inviata! In attesa di approvazione.");
      } else {
        alert(`Foto inviata con successo! +${result.points_earned} punti.`);
      }
      this.$emit("points-updated");
      await this.fetchTasks();
    },
    async fetchTasks() {
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
  padding-top: 1rem;
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