<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Invia Foto</h2>
        <button class="modal-close" @click="closeModal" aria-label="Chiudi">
          ×
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-description">
          Carica una foto per completare il task:
          <strong>{{ task.title }}</strong>
        </p>

        <div class="upload-container">
          <div v-if="!previewUrl" class="upload-placeholder">
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              id="photo-upload"
              class="file-input"
            />
            <label for="photo-upload" class="upload-label">
              <span class="upload-icon">📷</span>
              <span>Clicca per caricare una foto</span>
            </label>
          </div>

          <div v-else class="preview-container">
            <img :src="previewUrl" alt="Preview" class="image-preview" />
            <button class="btn btn-outline change-btn" @click="clearFile">
              Cambia foto
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn btn-outline"
          @click="closeModal"
          :disabled="loading"
        >
          Annulla
        </button>
        <button
          class="btn btn-primary"
          @click="submitPhoto"
          :disabled="!selectedFile || loading"
        >
          {{ loading ? "Invio..." : "Invia Foto" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import apiService from "@/services/api.js";

export default {
  name: "PhotoSubmissionModal",
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    task: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },
  data() {
    return {
      selectedFile: null,
      previewUrl: null,
      loading: false,
      error: "",
    };
  },
  watch: {
    isOpen(newVal) {
      if (!newVal) {
        this.resetForm();
      }
    },
  },
  methods: {
    handleFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        this.error = "Per favore seleziona un file immagine.";
        return;
      }

      this.error = "";
      this.selectedFile = file;
      this.previewUrl = URL.createObjectURL(file);
    },
    clearFile() {
      this.selectedFile = null;
      this.previewUrl = null;
      this.error = "";
    },
    resetForm() {
      this.clearFile();
      this.loading = false;
    },
    closeModal() {
      if (this.loading) return;
      this.$emit("close");
    },
    async submitPhoto() {
      if (!this.selectedFile) return;

      this.loading = true;
      this.error = "";

      try {
        const formData = new FormData();
        formData.append("task_id", this.task._id);
        formData.append("photo", this.selectedFile);

        const response = await apiService.customRequest(
          "/api/v1/tasks/submit",
          {
            method: "POST",
            body: formData,
          },
        );

        const result = await response.json();
        this.$emit("photo-submitted", result);
        this.closeModal();
      } catch (err) {
        console.error(err);
        this.error = err.message || "Impossibile contattare il server.";
      } finally {
        this.loading = false;
      }
    },
  },
  beforeUnmount() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
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
  max-width: 500px;
  width: 90vw;
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
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.modal-description {
  font-family: "Caladea", serif;
  color: #2a2a2a;
  margin: 0;
}

.upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-placeholder {
  width: 100%;
}

.file-input {
  display: none;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  border: 2px dashed #a9ca5f;
  border-radius: 12px;
  cursor: pointer;
  background-color: #efe9db;
  transition: all 0.2s ease;
  width: 100%;
  box-sizing: border-box;
}

.upload-label:hover {
  background-color: #e7dfc8;
  border-color: #98bc50;
}

.upload-icon {
  font-size: 2rem;
}

.preview-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.image-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-message {
  color: #d32f2f;
  font-size: 0.9rem;
  text-align: center;
  background-color: #ffebee;
  padding: 0.5rem;
  border-radius: 8px;
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

.btn-outline {
  background-color: transparent;
  color: #1f1f1f;
  border: 1px solid #1f1f1f;
}

.btn-outline:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
