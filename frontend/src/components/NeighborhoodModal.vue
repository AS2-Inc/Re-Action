<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="promt">Seleziona il tuo quartiere</h2>
        <button class="close-btn" @click="closeModal" aria-label="Chiudi">×</button>
      </div>
      <div class="modal-body">
        <p class="modal-description">
          Scegli il quartiere in cui vivi per partecipare alle attività locali e contribuire alla classifica del tuo quartiere.
        </p>
        
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Cerca per nome o città..."
            :disabled="loading"
          />
        </div>
        
        <div v-if="loading" class="loading-state">
          Caricamento quartieri...
        </div>
        
        <div v-else-if="error" class="error-state">
          {{ error }}
        </div>
        
        <div v-else-if="filteredNeighborhoods.length > 0" class="neighborhoods-list">
          <div 
            v-for="neighborhood in filteredNeighborhoods" 
            :key="neighborhood._id"
            class="neighborhood-item"
            :class="{ selected: selectedNeighborhood === neighborhood._id }"
            @click="selectNeighborhood(neighborhood._id)"
          >
            <div class="neighborhood-info">
              <span class="neighborhood-name">{{ neighborhood.name }}</span>
              <span class="neighborhood-city">{{ neighborhood.city }}</span>
            </div>
            <div v-if="selectedNeighborhood === neighborhood._id" class="check-icon">✓</div>
          </div>
        </div>
        
        <div v-else class="no-results">
          Nessun quartiere trovato per "{{ searchQuery }}"
        </div>
      </div>
      <div class="modal-footer">
        <button 
          class="btn btn-cancel" 
          @click="closeModal"
          :disabled="submitting"
        >
          Annulla
        </button>
        <button 
          class="btn btn-confirm" 
          @click="confirmSelection"
          :disabled="!selectedNeighborhood || submitting"
        >
          {{ submitting ? 'Conferma in corso...' : 'Conferma' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "NeighborhoodModal",
  props: {
    isVisible: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["close", "select"],
  data() {
    return {
      neighborhoods: [],
      selectedNeighborhood: null,
      loading: false,
      error: "",
      submitting: false,
      searchQuery: "",
    };
  },
  computed: {
    filteredNeighborhoods() {
      if (!this.searchQuery.trim()) {
        return this.neighborhoods;
      }

      const query = this.searchQuery.toLowerCase().trim();
      return this.neighborhoods.filter(
        (n) =>
          n.name.toLowerCase().includes(query) ||
          n.city.toLowerCase().includes(query),
      );
    },
  },
  watch: {
    isVisible(newVal) {
      if (newVal && this.neighborhoods.length === 0) {
        this.fetchNeighborhoods();
      }
    },
  },
  methods: {
    async fetchNeighborhoods() {
      this.loading = true;
      this.error = "";

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/neighborhood`);

        if (!response.ok) {
          throw new Error("Impossibile caricare i quartieri");
        }

        this.neighborhoods = await response.json();
      } catch (err) {
        console.error("Error fetching neighborhoods:", err);
        this.error = "Errore nel caricamento dei quartieri. Riprova.";
      } finally {
        this.loading = false;
      }
    },
    selectNeighborhood(id) {
      this.selectedNeighborhood = id;
    },
    closeModal() {
      if (!this.submitting) {
        this.$emit("close");
      }
    },
    confirmSelection() {
      if (this.selectedNeighborhood && !this.submitting) {
        this.submitting = true;
        this.$emit("select", this.selectedNeighborhood);
      }
    },
  },
};
</script>

<style scoped>
.promt {
  font-family: 'Caladea', serif;
  color: #333;
  font-weight: 700;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-family: 'Caladea', serif;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f0f0f0;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-description {
  margin: 0 0 1rem 0;
  color: #666;
  line-height: 1.5;
}

.search-container {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #A9CA5F;
}

.search-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-state {
  color: #b00020;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

.neighborhoods-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.neighborhood-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid #f7f2e7;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.neighborhood-item:hover {
  border-color: #A9CA5F;
  background-color: #f7f2e7;
}

.neighborhood-item.selected {
  border-color: #A9CA5F;
  background-color: #f0f8e0;
}

.neighborhood-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.neighborhood-name {
  font-weight: 600;
  font-size: 1rem;
  color: #333;
}

.neighborhood-city {
  font-size: 0.875rem;
  color: #666;
}

.check-icon {
  color: #A9CA5F;
  font-size: 1.5rem;
  font-weight: bold;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn {
  font-family: 'Caladea', serif;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 1rem;
}

.btn-cancel {
  background-color: #e0e0e0;
  color: #333;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #d0d0d0;
}

.btn-confirm {
  background-color: #A9CA5F;
  color: #333;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #98b952;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .modal-content {
    max-height: 90vh;
  }
  
  .modal-header h2 {
    font-size: 1.25rem;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
