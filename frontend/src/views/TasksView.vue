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
    <QRScannerModal
      :is-open="qrScannerOpen"
      @close="closeQRScanner"
      @scanned="onQRScanned"
    />
    <GPSVerificationModal
      :is-open="gpsModalOpen"
      :task="selectedTaskForGPS || {}"
      @close="closeGPSModal"
      @gps-submitted="onGPSSubmitted"
    />
    <ToastNotification ref="toast" />
  </div>
</template>

<script>
import GPSVerificationModal from "@/components/GPSVerificationModal.vue";
import Navbar from "@/components/Navbar.vue";
import PhotoSubmissionModal from "@/components/PhotoSubmissionModal.vue";
import QRScannerModal from "@/components/QRScannerModal.vue";
import QuizModal from "@/components/QuizModal.vue";
import TaskCard from "@/components/TaskCard.vue";
import ToastNotification from "@/components/ToastNotification.vue";
import apiService from "@/services/api.js";

export default {
  name: "TasksView",
  components: {
    Navbar,
    TaskCard,
    QuizModal,
    PhotoSubmissionModal,
    QRScannerModal,
    GPSVerificationModal,
    ToastNotification,
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
      tasks: [],
      loading: false,
      error: "",
      quizModalOpen: false,
      selectedQuiz: null,
      selectedTaskId: null,
      selectedTask: null,
      photoModalOpen: false,
      selectedTaskForPhoto: {},
      qrScannerOpen: false,
      selectedTaskForQR: null,
      gpsModalOpen: false,
      selectedTaskForGPS: null,
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
      } else if (task.verification_method === "GPS") {
        this.selectedTaskForGPS = task;
        this.gpsModalOpen = true;
      } else if (task.verification_method === "QR_SCAN") {
        this.selectedTaskForQR = task;
        this.qrScannerOpen = true;
      }
    },
    async loadAndOpenQuiz(task) {
      try {
        const quizId = task.verification_criteria?.quiz_id;

        if (!quizId) {
          this.$refs.toast.show({
            message: "Questo task non ha un quiz configurato correttamente.",
            type: "error",
          });
          return;
        }

        const quiz = await apiService.get(`/api/v1/quizzes/${quizId}`);
        this.selectedQuiz = quiz;
        this.selectedTaskId = task._id;
        this.selectedTask = task;
        this.quizModalOpen = true;
      } catch (error) {
        console.error("Error fetching quiz:", error);
        this.$refs.toast.show({
          message: "Errore nel caricamento del quiz.",
          type: "error",
        });
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
      this.$refs.toast.show({
        title: "Ottimo lavoro!",
        message: `Quiz inviato con successo! +${pointsEarned} punti`,
        type: "success",
      });

      // Refresh tasks and emit event to parent to update user info
      this.$emit("points-updated");

      await this.fetchTasks();
    },
    closePhotoModal() {
      this.photoModalOpen = false;
      this.selectedTaskForPhoto = {};
    },
    async onPhotoSubmitted(_result) {
      this.closePhotoModal();
      this.$emit("points-updated");
      await this.fetchTasks();
    },
    async onGPSSubmitted(proof) {
      try {
        console.log("Proof: ", proof);
        const gpsLocation = Array.isArray(proof)
          ? proof
          : [proof?.latitude, proof?.longitude];

        const result = await apiService.post("/api/v1/tasks/submit", {
          task_id: this.selectedTaskForGPS._id,
          proof: { gps_location: gpsLocation },
        });

        if (result.submission_status === "APPROVED") {
          this.$refs.toast.show({
            title: "Task Completato!",
            message: `Hai guadagnato +${result.points_earned} punti`,
            type: "success",
          });
          this.closeGPSModal();
          this.$emit("points-updated");
          await this.fetchTasks();
        } else {
          this.$refs.toast.show({
            message:
              "Verifica GPS fallita. Riprova più vicino alla posizione target.",
            type: "error",
          });
          this.closeGPSModal();
        }
      } catch (error) {
        console.error(error);
        this.$refs.toast.show({
          message: error.message,
          type: "error",
        });
        this.closeGPSModal();
      }
    },
    closeGPSModal() {
      this.gpsModalOpen = false;
      this.selectedTaskForGPS = null;
    },
    closeQRScanner() {
      this.qrScannerOpen = false;
      this.selectedTaskForQR = null;
    },
    async onQRScanned(qrContent) {
      if (!this.selectedTaskForQR) return;

      try {
        const result = await apiService.post("/api/v1/tasks/submit", {
          task_id: this.selectedTaskForQR._id,
          proof: { qr_code_data: qrContent },
        });

        if (result.submission_status === "APPROVED") {
          this.$refs.toast.show({
            title: "Task Completato!",
            message: `Hai guadagnato +${result.points_earned} punti`,
            type: "success",
          });
          this.$emit("points-updated");
          await this.fetchTasks();
        } else {
          this.$refs.toast.show({
            title: "Codice QR non valido",
            message:
              "Il codice scansionato non corrisponde a questo task. Assicurati di scansionare il codice QR corretto fornito per questa attività.",
            type: "error",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error(error);
        const errorMessage = error.message;
        if (errorMessage === "Invalid QR Code") {
          this.$refs.toast.show({
            message:
              "CODICE QR NON VALIDO!\\n\\nIl codice scansionato non corrisponde a questo task. Assicurati di scansionare il codice QR corretto fornito per questa attività.",
            type: "error",
            duration: 5000,
          });
        } else {
          this.$refs.toast.show({
            message: errorMessage,
            type: "error",
          });
        }
      }
    },
    async fetchTasks() {
      this.loading = true;
      this.error = "";
      try {
        this.tasks = await apiService.get("/api/v1/tasks");
      } catch (error) {
        console.error(error);
        this.error = error.message || "Impossibile recuperare i task.";
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