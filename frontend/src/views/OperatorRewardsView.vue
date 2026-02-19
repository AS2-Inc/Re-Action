<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><router-link to="/operatorDashboard" class="nav-link">Home</router-link></li>
        <li><router-link to="/reportsList" class="nav-link">Lista Report</router-link></li>
        <li><router-link to="/taskTemplates" class="nav-link">Task Attive</router-link></li>
        <li><router-link to="/createTask" class="nav-link">Crea Task</router-link></li>
        <li><router-link to="/operatorRewards" class="nav-link active">Premi</router-link></li>
      </ul>
    </nav>

    <div class="header-section">
      <div class="header-left">
        <h1 class="page-title">Gestione Premi</h1>
        <p class="page-subtitle">Crea, modifica e gestisci i premi disponibili per gli utenti.</p>
      </div>
    </div>

    <!-- Create Button -->
    <div class="create-button-container">
      <button class="btn-action btn-create" @click="_openCreateModal">
        + Crea Nuovo Premio
      </button>
    </div>

    <!-- Loading State -->
      <div v-if="loading" class="state-loading">Caricamento premi...</div>

      <!-- Error State -->
      <div v-else-if="error" class="state-error">{{ error }}</div>

      <!-- Rewards Table -->
      <div v-else class="section">
        <div class="table-card">
          <div class="table-responsive">
            <table v-if="rewards.length > 0" class="modern-table">
          <thead>
            <tr>
              <th>Titolo</th>
              <th>Tipo</th>
              <th>Costo Punti</th>
              <th>Quantità</th>
              <th>Stato</th>
              <th>Quartieri</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reward in rewards" :key="reward._id" :class="{ inactive: !reward.active }">
              <td>{{ reward.title }}</td>
              <td>
                <span class="badge" :class="`badge-${reward.type.toLowerCase()}`">
                  {{ _formatRewardType(reward.type) }}
                </span>
              </td>
              <td>{{ reward.points_cost }}</td>
              <td>{{ reward.quantity_available }}</td>
              <td>
                <span class="status-badge" :class="reward.active ? 'active' : 'inactive'">
                  {{ reward.active ? 'Attivo' : 'Inattivo' }}
                </span>
              </td>
              <td>
                <div class="neighborhoods-cell">
                  <span v-if="!reward.neighborhoods || reward.neighborhoods.length === 0" class="text-muted">
                    Tutti i quartieri
                  </span>
                  <span v-else class="neighborhoods-list">
                    {{ _formatNeighborhoods(reward.neighborhoods) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action btn-edit" @click="_openEditModal(reward)" title="Modifica">
                    Modifica
                  </button>
                  <button 
                    class="btn-action btn-delete" 
                    @click="_confirmDelete(reward)" 
                    title="Rimuovi"
                  >
                    Rimuovi
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
          </div>
        </div>
        <div v-if="rewards.length === 0" class="empty-state">
          <p>Nessun premio trovato. Crea il primo premio!</p>
        </div>
      </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card">
          <button class="close-btn" @click="closeModal">×</button>

          <div v-if="modalLoading" class="modal-loading">
            <div class="spinner"></div>
            <p>Salvataggio...</p>
          </div>

          <div v-else class="modal-body-content">
            <header class="modal-header">
              <h2>{{ modalMode === 'create' ? 'Crea Nuovo Premio' : 'Modifica Premio' }}</h2>
            </header>
            <div v-if="modalError" class="modal-error">
              Errore: {{ modalError }}
            </div>

            <form @submit.prevent="_saveReward">
              <div class="form-grid">
                <div class="form-group">
                  <label for="title">Titolo *</label>
                  <input 
                    id="title"
                    v-model="rewardForm.title" 
                    type="text"
                    class="form-input" 
                    required 
                    placeholder="Es: Buono Trasporto Pubblico"
                  />
                </div>

                <div class="form-group">
                  <label for="type">Tipo *</label>
                  <select id="type" v-model="rewardForm.type" class="form-input" required>
                    <option value="COUPON">Coupon</option>
                    <option value="DIGITAL_BADGE">Badge Digitale</option>
                    <option value="PHYSICAL_ITEM">Oggetto Fisico</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="points_cost">Costo in Punti *</label>
                  <input 
                    id="points_cost"
                    v-model.number="rewardForm.points_cost" 
                    type="number"
                    class="form-input" 
                    min="0"
                    required 
                    placeholder="100"
                  />
                </div>

                <div class="form-group">
                  <label for="quantity">Quantità Disponibile *</label>
                  <input 
                    id="quantity"
                    v-model.number="rewardForm.quantity_available" 
                    type="number"
                    class="form-input" 
                    min="0"
                    required 
                    placeholder="50"
                  />
                </div>

                <div class="form-group full-width">
                  <label for="description">Descrizione</label>
                  <textarea 
                    id="description"
                    v-model="rewardForm.description"
                    class="form-input form-textarea" 
                    rows="3"
                    placeholder="Descrivi il premio..."
                  ></textarea>
                </div>

                <div class="form-group">
                  <label for="provider">Fornitore</label>
                  <input 
                    id="provider"
                    v-model="rewardForm.provider" 
                    type="text"
                    class="form-input" 
                    placeholder="Es: Trento Trasporti"
                  />
                </div>

                <div class="form-group">
                  <label for="expiry_date">Data Scadenza</label>
                  <input 
                    id="expiry_date"
                    v-model="rewardForm.expiry_date" 
                    type="date"
                    class="form-input"
                  />
                </div>

                <div class="form-group full-width">
                  <label class="checkbox-item">
                    <input 
                      v-model="rewardForm.active" 
                      type="checkbox"
                    />
                    Premio Attivo
                  </label>
                </div>

                <div class="form-group full-width">
                  <label>Quartieri Assegnati</label>
                  <div class="neighborhoods-selection">
                    <div class="checkbox-row">
                      <label class="checkbox-item">
                        <input 
                          type="checkbox"
                          :checked="isAllNeighborhoodsSelected"
                          @change="_toggleAllNeighborhoods"
                        />
                        <strong>Tutti i quartieri</strong>
                      </label>
                    </div>
                    <div class="checkbox-row">
                      <label 
                        v-for="neighborhood in neighborhoods" 
                        :key="neighborhood._id"
                        class="checkbox-item"
                      >
                        <input 
                          type="checkbox"
                          :value="neighborhood._id"
                          v-model="rewardForm.neighborhoods"
                        />
                        {{ neighborhood.name }}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-action btn-cancel" @click="closeModal" :disabled="modalLoading">
                  Annulla
                </button>
                <button type="submit" class="btn-action btn-update" :disabled="modalLoading">
                  {{ modalLoading ? 'Salvataggio...' : 'Salva' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
        <div class="modal-card modal-small">
          <button class="close-btn" @click="closeDeleteModal">×</button>
          
          <div class="modal-body-content">
            <header class="modal-header">
              <h2>Conferma Rimozione</h2>
            </header>
            
            <div class="modal-message">
              <p>Sei sicuro di voler rimuovere il premio <strong>{{ rewardToDelete?.title }}</strong>?</p>
              <p class="text-muted">Il premio verrà eliminato definitivamente dal database.</p>
            </div>

            <div class="modal-actions">
              <button class="btn-action btn-cancel" @click="closeDeleteModal" :disabled="deleteLoading">
                Annulla
              </button>
              <button class="btn-action btn-delete" @click="_deleteReward" :disabled="deleteLoading">
                {{ deleteLoading ? 'Rimozione...' : 'Rimuovi' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// State
const rewards = ref([]);
const neighborhoods = ref([]);
const loading = ref(true);
const error = ref(null);

// Modal State
const showModal = ref(false);
const modalMode = ref("create"); // 'create' or 'edit'
const modalLoading = ref(false);
const modalError = ref(null);

// Delete Modal State
const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const rewardToDelete = ref(null);

// Form State
const defaultForm = () => ({
  title: "",
  description: "",
  type: "COUPON",
  points_cost: 0,
  quantity_available: 0,
  provider: "",
  active: true,
  expiry_date: "",
  neighborhoods: [],
});

const rewardForm = ref(defaultForm());

// Computed
const isAllNeighborhoodsSelected = computed(() => {
  return rewardForm.value.neighborhoods.length === 0;
});

// Methods
const fetchRewards = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/admin");
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`${API_BASE}/api/v1/rewards/all`, {
      headers: {
        "x-access-token": token,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      throw new Error("Errore nel caricamento dei premi");
    }

    rewards.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const fetchNeighborhoods = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/neighborhood`);
    if (response.ok) {
      neighborhoods.value = await response.json();
    }
  } catch (err) {
    console.error("Error fetching neighborhoods:", err);
  }
};

const openCreateModal = () => {
  modalMode.value = "create";
  rewardForm.value = defaultForm();
  modalError.value = null;
  showModal.value = true;
};

const openEditModal = (reward) => {
  modalMode.value = "edit";
  rewardForm.value = {
    _id: reward._id,
    title: reward.title,
    description: reward.description || "",
    type: reward.type,
    points_cost: reward.points_cost,
    quantity_available: reward.quantity_available,
    provider: reward.provider || "",
    active: reward.active,
    expiry_date: reward.expiry_date
      ? new Date(reward.expiry_date).toISOString().split("T")[0]
      : "",
    neighborhoods: reward.neighborhoods
      ? reward.neighborhoods.map((n) => n._id || n)
      : [],
  };
  modalError.value = null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  rewardForm.value = defaultForm();
  modalError.value = null;
};

const _toggleAllNeighborhoods = () => {
  // If "All" is currently checked (empty array), keep it checked (do nothing)
  // If some neighborhoods are selected, clear them to select all
  if (!isAllNeighborhoodsSelected.value) {
    rewardForm.value.neighborhoods = [];
  }
};

const saveReward = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/admin");
    return;
  }

  modalLoading.value = true;
  modalError.value = null;

  try {
    const payload = {
      title: rewardForm.value.title,
      description: rewardForm.value.description,
      type: rewardForm.value.type,
      points_cost: rewardForm.value.points_cost,
      quantity_available: rewardForm.value.quantity_available,
      provider: rewardForm.value.provider,
      active: rewardForm.value.active,
      expiry_date: rewardForm.value.expiry_date || undefined,
      neighborhoods:
        rewardForm.value.neighborhoods.length > 0
          ? rewardForm.value.neighborhoods
          : [],
    };

    const isEdit = modalMode.value === "edit";
    const url = isEdit
      ? `${API_BASE}/api/v1/rewards/${rewardForm.value._id}`
      : `${API_BASE}/api/v1/rewards`;

    const response = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Errore nel salvataggio del premio");
    }

    await fetchRewards();
    closeModal();
  } catch (err) {
    modalError.value = err.message;
  } finally {
    modalLoading.value = false;
  }
};

const _confirmDelete = (reward) => {
  rewardToDelete.value = reward;
  showDeleteModal.value = true;
};

const _confirmDeleteFromModal = () => {
  if (rewardForm.value._id) {
    rewardToDelete.value = {
      _id: rewardForm.value._id,
      title: rewardForm.value.title,
    };
    showDeleteModal.value = true;
  }
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  rewardToDelete.value = null;
};

const __deleteReward = async () => {
  if (!rewardToDelete.value) return;

  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/admin");
    return;
  }

  deleteLoading.value = true;

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/rewards/${rewardToDelete.value._id}`,
      {
        method: "DELETE",
        headers: {
          "x-access-token": token,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Errore nella rimozione del premio");
    }

    await fetchRewards();
    closeDeleteModal();
    // Also close the edit modal if it was open
    if (showModal.value) {
      closeModal();
    }
  } catch (err) {
    alert(err.message);
  } finally {
    deleteLoading.value = false;
  }
};

const _formatRewardType = (type) => {
  const types = {
    COUPON: "Coupon",
    DIGITAL_BADGE: "Badge Digitale",
    PHYSICAL_ITEM: "Oggetto Fisico",
  };
  return types[type] || type;
};

const _formatNeighborhoods = (neighborhoods) => {
  if (!neighborhoods || neighborhoods.length === 0) {
    return "Tutti";
  }
  return neighborhoods.map((n) => n.name || n).join(", ");
};

onMounted(() => {
  fetchRewards();
  fetchNeighborhoods();
});
</script>

<style scoped>
/* Color Palette */
:root {
  --primary-green: #2d6a4f;
  --secondary-green: #40916c;
  --light-green: #d8f3dc;
  --bg-green-tint: #f0fdf4;
  --white: #ffffff;
  --text-dark: #1b4332;
  --text-light: #6c757d;
  --border-color: #e2e8f0;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --radius: 12px;
}

.dashboard-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 75vw;
  min-height: 100vh;
  padding: 1.5rem;
  background-color: #f7faf8;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1b4332;
  box-sizing: border-box;
}

/* Navbar */
.dashboard-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--white);
  padding: 1rem 2rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  margin-bottom: 2rem;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-green);
}

.navbar-links {
  display: flex;
  gap: 2rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.navbar-links li {
  margin: 0;
  padding: 0;
}

.nav-link {
  text-decoration: none;
  color: var(--text-light);
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.2s ease;
  padding-bottom: 2px;
  border-bottom: 2px solid transparent;
}

.nav-link:hover,
.nav-link.active {
  color: var(--primary-green);
  font-weight: 600;
  border-bottom-color: var(--secondary-green);
}

/* Dashboard Content */
.dashboard-content {
  margin-top: 1rem;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-left {
  flex: 1;
  text-align: center;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-dark);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--text-light);
  font-size: 1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Create Button Container */
.create-button-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

/* States */
.state-loading,
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 2rem;
  text-align: center;
}

.state-error {
  border: 1px solid #fee2e2;
  background-color: #fef2f2;
  color: #b91c1c;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-light);
  font-size: 1.1rem;
}

/* Section */
.section {
  margin-bottom: 2rem;
}

/* Table Styles */
.table-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.table-responsive {
  overflow-x: auto;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 600px;
}

.modern-table th {
  background-color: #f0fdf4;
  color: #2d6a4f;
  font-weight: 600;
  padding: 1.25rem 1.5rem;
  border-bottom: 2px solid #d8f3dc;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modern-table td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  color: #4a5568;
  vertical-align: middle;
}

.modern-table tr:hover {
  background-color: #f8fafb;
}

.modern-table tr.inactive {
  opacity: 0.6;
  background-color: #f9fafb;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.35rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.badge-coupon {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-digital_badge {
  background: #f3e5f5;
  color: #7b1fa2;
}

.badge-physical_item {
  background: #e8f5e9;
  color: #388e3c;
}

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.neighborhoods-cell {
  max-width: 250px;
}

.neighborhoods-list {
  font-size: 0.9rem;
  color: #4a5568;
}

.text-muted {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-create {
  background-color: #2d6a4f !important;
  color: white !important;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.btn-create:hover {
  background-color: #1e4d35 !important;
}

.btn-edit {
  background-color: #3b82f6;
  color: white;
  border: none;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  border-radius: 6px;
}

.btn-edit:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.btn-delete {
  background-color: #dc2626;
  color: white;
  border: none;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  border-radius: 6px;
}

.btn-delete:hover {
  background-color: #b91c1c;
  transform: translateY(-1px);
}

.btn-delete:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-update {
  background-color: #2d6a4f !important;
  color: white !important;
}

.btn-update:hover {
  background-color: #1e4d35 !important;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background-color: #5a6268;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  position: relative;
}

.modal-card.modal-small {
  max-width: 500px;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #9ca3af;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #4b5563;
}

.modal-loading {
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-green);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-body-content {
  padding: 2rem;
}

.modal-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: var(--text-dark);
  font-size: 1.5rem;
  font-weight: 700;
}

.modal-error {
  background: #fee2e2;
  color: #b91c1c;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.modal-message {
  margin-bottom: 2rem;
}

.modal-message p {
  margin: 0.5rem 0;
  color: #4b5563;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* Form Styles */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-dark);
  font-size: 0.95rem;
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-green);
  box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.neighborhoods-selection {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 1rem;
  max-height: 250px;
  overflow-y: auto;
  background-color: #f9fafb;
}

.checkbox-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.checkbox-item:hover {
  background-color: #f3f4f6;
}

.checkbox-item input[type="checkbox"] {
  cursor: pointer;
  width: 1.1rem;
  height: 1.1rem;
}

.checkbox-item input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-wrapper {
    width: 95vw;
    padding: 1rem;
  }

  .navbar-links {
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }

  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .modern-table {
    font-size: 0.85rem;
  }

  .modern-table th,
  .modern-table td {
    padding: 0.75rem;
  }
}
</style>
