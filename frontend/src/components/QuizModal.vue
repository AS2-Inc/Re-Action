<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="exitQuiz">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">{{ quiz.title }}</h2>
        <button class="modal-close" @click="exitQuiz" aria-label="Chiudi">×</button>
      </div>

      <div class="modal-body">
        <p v-if="quiz.description" class="quiz-description">
          {{ quiz.description }}
        </p>

        <div v-if="!quizCompleted" class="quiz-container">
          <div v-if="alreadyCompleted" class="quiz-already-completed">
            <p>Questo quiz è già stato completato in questo periodo.</p>
            <p>Disponibile tra: <strong>{{ nextAvailableTime }}</strong></p>
          </div>
          <div v-else>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
            <p class="progress-text">
              Domanda {{ currentQuestionIndex + 1 }} di {{ totalQuestions }}
            </p>

            <div class="question-container">
              <h3 class="question-text">{{ currentQuestion.text }}</h3>

              <div class="options-list">
                <label
                  v-for="(option, index) in currentQuestion.options"
                  :key="index"
                  class="option-label"
                >
                  <input
                    type="radio"
                    :value="index"
                    v-model.number="answers[currentQuestionIndex]"
                    class="option-input"
                  />
                  <span class="option-text">{{ option }}</span>
                </label>
              </div>
            </div>

            <div class="quiz-actions">
              <button
                v-if="currentQuestionIndex > 0"
                class="btn btn-secondary"
                @click="previousQuestion"
              >
                Indietro
              </button>
              <button
                v-if="currentQuestionIndex < totalQuestions - 1"
                class="btn btn-primary"
                @click="nextQuestion"
                :disabled="answers[currentQuestionIndex] === undefined"
              >
                Avanti
              </button>
              <button
                v-else
                class="btn btn-primary"
                @click="finishQuiz"
                :disabled="answers[currentQuestionIndex] === undefined"
              >
                Completa Quiz
              </button>
            </div>
          </div>
        </div>

        <div v-else class="quiz-result">
          <div class="result-icon">
            {{ isSubmitting ? "⏳" : "✓" }}
          </div>
          <p class="result-status">
            {{ isSubmitting ? "Invio del quiz..." : "Quiz inviato con successo!" }}
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" @click="exitQuiz">
          {{ quizCompleted ? "Chiudi" : "Esci" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import apiService from "@/services/api.js";

export default {
  name: "QuizModal",
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    quiz: {
      type: Object,
      default: () => ({
        title: "",
        description: "",
        passing_score: 0.8,
        questions: [],
      }),
    },
    taskId: {
      type: String,
      default: null,
    },
    task: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      currentQuestionIndex: 0,
      answers: [],
      quizCompleted: false,
      resultPassed: false,
      isSubmitting: false,
      quizScore: 0,
      alreadyCompleted: false,
      nextAvailableTime: "",
    };
  },
  computed: {
    totalQuestions() {
      return this.quiz.questions?.length || 0;
    },
    currentQuestion() {
      return this.quiz.questions?.[this.currentQuestionIndex] || {};
    },
    progressPercent() {
      if (this.totalQuestions === 0) return 0;
      return ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
    },
    scorePercent() {
      // Score is only available after submission from backend
      return this.quizScore * 100;
    },
  },
  watch: {
    isOpen(newVal) {
      if (newVal) {
        this.resetQuiz();
        this.checkIfAlreadyCompleted();
      }
    },
  },
  methods: {
    checkIfAlreadyCompleted() {
      // Check if task has already been completed in this period
      this.alreadyCompleted = this.task?.assignment_status === "COMPLETED";
      if (this.alreadyCompleted) {
        this.calculateNextAvailableTime();
      }
    },
    calculateNextAvailableTime() {
      const frequency = this.task?.frequency;
      const now = new Date();
      const nextAvailable = new Date();

      if (frequency === "daily") {
        // Tomorrow at midnight
        nextAvailable.setDate(nextAvailable.getDate() + 1);
        nextAvailable.setHours(0, 0, 0, 0);
      } else if (frequency === "weekly") {
        // 7 days from now
        nextAvailable.setDate(nextAvailable.getDate() + 7);
      } else if (frequency === "monthly") {
        // Next month same day
        nextAvailable.setMonth(nextAvailable.getMonth() + 1);
      } else if (frequency === "onetime") {
        this.nextAvailableTime = "Mai";
        return;
      }

      const hours = Math.floor((nextAvailable - now) / (1000 * 60 * 60));
      const minutes = Math.floor(
        ((nextAvailable - now) % (1000 * 60 * 60)) / (1000 * 60),
      );
      const days = Math.floor(hours / 24);

      if (frequency === "onetime") {
        this.nextAvailableTime = "Mai";
      } else if (days > 0) {
        this.nextAvailableTime = `${days}g ${hours % 24}h`;
      } else if (hours > 0) {
        this.nextAvailableTime = `${hours}h ${minutes}m`;
      } else {
        this.nextAvailableTime = `${minutes}m`;
      }
    },
    nextQuestion() {
      if (this.currentQuestionIndex < this.totalQuestions - 1) {
        this.currentQuestionIndex++;
      }
    },
    previousQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--;
      }
    },
    finishQuiz() {
      this.quizCompleted = true;
      // Submit quiz to backend for verification
      this.submitQuiz();
    },
    resetQuiz() {
      this.currentQuestionIndex = 0;
      this.answers = new Array(this.totalQuestions).fill(undefined);
      this.quizCompleted = false;
      this.resultPassed = false;
    },
    async submitQuiz() {
      if (this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;
      try {
        const data = await apiService.post("/api/v1/tasks/submit", {
          task_id: this.taskId,
          proof: {
            quiz_answers: this.answers,
          },
        });

        this.quizScore = data?.proof?.quiz_score || data?.score || 0;
        this.resultPassed = true;

        // Show confirmation button for passing, or close automatically if passing
        setTimeout(() => {
          this.$emit("quiz-submitted", {
            points_earned: result?.points_earned || 0,
            new_badges: result?.new_badges || [],
          });
          this.exitQuiz();
        }, 1500);
      } catch (error) {
        console.error(error);
        alert("Impossibile contattare il server.");
        this.isSubmitting = false;
      }
    },
    exitQuiz() {
      this.$emit("close");
      this.resetQuiz();
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fbf8f0;
  border-radius: 16px;
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.modal-title {
  font-family: "Caladea", serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #1f1f1f;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  opacity: 0.7;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.quiz-description {
  font-family: "Caladea", serif;
  color: #2a2a2a;
  margin: 0 0 1.5rem;
}

.quiz-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #efe9db;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #a9ca5f;
  transition: width 0.3s ease;
}

.progress-text {
  font-family: "Caladea", serif;
  font-size: 0.9rem;
  color: #3d3d3d;
  margin: 0;
}

.question-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-text {
  font-family: "Caladea", serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: #efe9db;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.option-label:hover {
  background-color: #e7dfc8;
}

.option-input {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: #a9ca5f;
}

.option-text {
  font-family: "Caladea", serif;
  color: #1f1f1f;
  flex: 1;
}

.quiz-actions {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-top: 1rem;
}

.quiz-already-completed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.quiz-already-completed p {
  font-family: "Caladea", serif;
  font-size: 1.1rem;
  color: #1f1f1f;
  margin: 0;
}

.quiz-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.result-icon {
  font-size: 3rem;
  font-weight: 700;
  color: #a9ca5f;
}

.result-status {
  font-family: "Caladea", serif;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

.result-score {
  font-family: "Caladea", serif;
  font-size: 1.1rem;
  margin: 0;
  color: #2a2a2a;
}

.result-message {
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #3d3d3d;
  margin: 0;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  justify-content: flex-end;
}

.btn {
  font-family: "Caladea", serif;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #a9ca5f;
  color: #1f1f1f;
}

.btn-primary:hover:not(:disabled) {
  background-color: #98bc50;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #efe9db;
  color: #1f1f1f;
}

.btn-secondary:hover {
  background-color: #e7dfc8;
}

.btn-outline {
  background-color: transparent;
  color: #1f1f1f;
  border: 1px solid #1f1f1f;
}

.btn-outline:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-success {
  background-color: #a9ca5f;
  color: #1f1f1f;
}

.btn-success:hover:not(:disabled) {
  background-color: #98bc50;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
