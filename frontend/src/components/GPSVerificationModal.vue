<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Verifica Posizione</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="modal-body">
        <p class="description">
          Per completare questo task è necessario verificare la tua posizione.
        </p>

        <div v-if="error" class="message error">
          {{ error }}
        </div>

        <div v-if="loading" class="loading-container">
          <div class="spinner"></div>
          <p>{{ statusMessage }}</p>
        </div>

        <div v-else-if="!manualMode" class="actions">
          <button class="btn btn-primary" @click="useCurrentLocation">
            <span class="icon">📍</span> Usa la mia posizione
          </button>
          <button class="btn btn-secondary" @click="enableManualMode">
            <span class="icon">✏️</span> Inserisci coordinate
          </button>
        </div>

        <div v-else class="manual-form">
          <div class="form-group">
            <label for="latitude">Latitudine</label>
            <input 
              type="number" 
              id="latitude" 
              v-model.number="latitude" 
              step="any" 
              placeholder="es. 41.9028"
            >
          </div>
          <div class="form-group">
            <label for="longitude">Longitudine</label>
            <input 
              type="number" 
              id="longitude" 
              v-model.number="longitude" 
              step="any" 
              placeholder="es. 12.4964"
            >
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="manualMode = false">Indietro</button>
            <button class="btn btn-primary" @click="submitManual" :disabled="!isValidCoordinates">
              Verifica
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "GPSVerificationModal",
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    task: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      manualMode: false,
      loading: false,
      error: null,
      statusMessage: "",
      latitude: null,
      longitude: null,
    };
  },
  computed: {
    isValidCoordinates() {
      return (
        this.latitude !== null &&
        this.longitude !== null &&
        !isNaN(this.latitude) &&
        !isNaN(this.longitude) &&
        this.latitude >= -90 &&
        this.latitude <= 90 &&
        this.longitude >= -180 &&
        this.longitude <= 180
      );
    },
  },
  watch: {
    isOpen(newVal) {
      if (!newVal) {
        this.reset();
      }
    },
  },
  methods: {
    reset() {
      this.manualMode = false;
      this.loading = false;
      this.error = null;
      this.statusMessage = "";
      this.latitude = null;
      this.longitude = null;
    },
    close() {
      this.$emit("close");
    },
    enableManualMode() {
      this.manualMode = true;
      this.error = null;
    },
    useCurrentLocation() {
      if (!navigator.geolocation) {
        this.error = "La geolocalizzazione non è supportata dal tuo browser.";
        return;
      }

      this.loading = true;
      this.statusMessage = "Rilevamento posizione...";
      this.error = null;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.submitPosition(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy,
            position.timestamp,
          );
        },
        (err) => {
          this.loading = false;
          console.error(err);
          this.error =
            "Impossibile ottenere la posizione. Verifica i permessi o inserisci le coordinate manualmente.";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    },
    submitManual() {
      if (!this.isValidCoordinates) return;
      this.submitPosition(this.latitude, this.longitude, null, Date.now());
    },
    async submitPosition(lat, lng, accuracy, timestamp) {
      this.loading = true;
      this.statusMessage = "Verifica in corso...";

      const proof = {
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        timestamp: timestamp,
      };

      this.$emit("gps-submitted", proof);
      // Parent component will handle the API call and closing/error handling
      // But we might want to keep loading state here until parent responds?
      // simplified: assume parent handles everything including closing or we can wait.
      // For now, let's keep it simple and assume parent closes on success
      // or we can implement a better flow if parent passes back error.
      // Actually, viewing current architecture, modal emits event, parent does fetch.
      // So we should stay loading until parent closes or we reset?
      // Let's just emit and let parent handle UI feedback via alert for now as per other modals,
      // but ideally we should handle it inside.
      // Given existing patterns (QuizModal emits quiz-submitted), we'll do the same.
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fbf8f0;
  padding: 1.5rem;
  border-radius: 16px;
  width: 90%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  border: 1px solid rgba(0,0,0,0.05);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-family: "Caladea", serif;
  margin: 0;
  color: #1f1f1f;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.description {
  margin: 0;
  color: #4a4a4a;
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.manual-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #333;
}

.form-group input {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-family: "Inter", sans-serif;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.form-actions .btn {
  flex: 1;
}

.btn {
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  font-family: "Inter", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #1f1f1f;
  color: white;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e2e2e2;
  color: #1f1f1f;
}

.message.error {
  background-color: #ffebee;
  color: #c62828;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1f1f1f;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
