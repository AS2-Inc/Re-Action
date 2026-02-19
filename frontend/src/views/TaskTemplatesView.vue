<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// Stato del componente
const templates = ref([]);
const loading = ref(true);
const error = ref(null);

// Tasks state
const tasks = ref([]);
const tasksLoading = ref(true);
const tasksError = ref(null);

// Task Detail Modal state
const showTaskModal = ref(false);
const editingTask = ref(null);
const taskModalLoading = ref(false);
const taskModalError = ref(null);

// Neighborhoods
const neighborhoods = ref([]);

// Gestione dei Filtri (Tab) - Solo Attivi, Archiviati e Tutti
const currentTab = ref("active");

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Recupera i Task Template dal database
const fetchTemplates = async () => {
  loading.value = true;
  error.value = null;

  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/tasks/templates`, {
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Sessione scaduta o permessi insufficienti.");
    }

    if (!response.ok) {
      throw new Error(`Errore HTTP! status: ${response.status}`);
    }

    const data = await response.json();
    templates.value = Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    error.value = err.message || "Impossibile caricare i modelli.";
    if (err.message.includes("Sessione scaduta")) {
      setTimeout(() => router.push("/login"), 2500);
    }
  } finally {
    loading.value = false;
  }
};

// Logica di filtraggio per i tab
const _filteredTemplates = computed(() => {
  if (currentTab.value === "all") return templates.value;

  return templates.value.filter((tpl) => {
    // is_active è booleano nel nuovo schema
    if (currentTab.value === "active") return tpl.is_active !== false;
    if (currentTab.value === "archived") return tpl.is_active === false;
    return true;
  });
});

const __confirmDelete = (templateId, templateTitle) => {
  const proceed = confirm(
    `Vuoi davvero eliminare il modello "${templateTitle}"?`,
  );
  if (proceed) {
    console.log(`Eliminazione richiesta per: ${templateId}`);
    alert("Funzionalità di eliminazione in fase di implementazione.");
  }
};

const __updateTemplate = (templateId) => {
  console.log(`Modifica richiesta per: ${templateId}`);
  alert("Reindirizzamento alla pagina di modifica...");
};

const fetchTasks = async () => {
  tasksLoading.value = true;
  tasksError.value = null;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/api/v1/tasks/all`, {
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    });

    if (!response.ok) {
      throw new Error(`Errore HTTP! status: ${response.status}`);
    }

    const data = await response.json();
    tasks.value = Array.isArray(data) ? data : [];
  } catch (err) {
    tasksError.value = err.message || "Impossibile caricare i task.";
  } finally {
    tasksLoading.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("it-IT");
};

const fetchNeighborhoods = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/v1/neighborhood`);
    if (response.ok) {
      const data = await response.json();
      neighborhoods.value = Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error("Error fetching neighborhoods", err);
  }
};

const openTaskDetail = (task) => {
  // Deep clone, and normalize neighborhood_id to just the _id string
  const clone = JSON.parse(JSON.stringify(task));
  clone.neighborhood_id_value =
    clone.neighborhood_id?._id || clone.neighborhood_id || "";
  editingTask.value = clone;
  taskModalError.value = null;
  showTaskModal.value = true;
};

const closeTaskModal = () => {
  showTaskModal.value = false;
  editingTask.value = null;
  taskModalError.value = null;
};

const saveTask = async () => {
  if (!editingTask.value) return;
  const token = localStorage.getItem("token");
  if (!token) return;

  taskModalLoading.value = true;
  taskModalError.value = null;

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/tasks/${editingTask.value._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
        body: JSON.stringify({
          title: editingTask.value.title,
          description: editingTask.value.description,
          category: editingTask.value.category,
          difficulty: editingTask.value.difficulty,
          frequency: editingTask.value.frequency,
          verification_method: editingTask.value.verification_method,
          base_points: Number(editingTask.value.base_points),
          is_active: editingTask.value.is_active,
          neighborhood_id: editingTask.value.neighborhood_id_value || null,
          impact_metrics: {
            co2_saved: Number(editingTask.value.impact_metrics?.co2_saved || 0),
            waste_recycled: Number(
              editingTask.value.impact_metrics?.waste_recycled || 0,
            ),
            km_green: Number(editingTask.value.impact_metrics?.km_green || 0),
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Errore durante il salvataggio.");
    }

    closeTaskModal();
    await fetchTasks();
  } catch (err) {
    taskModalError.value = err.message;
  } finally {
    taskModalLoading.value = false;
  }
};

const toggleTaskActive = async () => {
  if (!editingTask.value) return;
  editingTask.value.is_active = !editingTask.value.is_active;
  await saveTask();
};

const deleteTask = async () => {
  if (!editingTask.value) return;
  if (!confirm(`Vuoi davvero eliminare il task "${editingTask.value.title}"?`))
    return;

  const token = localStorage.getItem("token");
  if (!token) return;

  taskModalLoading.value = true;
  taskModalError.value = null;

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/tasks/${editingTask.value._id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Errore durante l'eliminazione.");
    }

    closeTaskModal();
    await fetchTasks();
  } catch (err) {
    taskModalError.value = err.message;
  } finally {
    taskModalLoading.value = false;
  }
};

onMounted(() => {
  fetchTemplates();
  fetchTasks();
  fetchNeighborhoods();
});
</script>

<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><router-link to="/operatorDashboard" class="nav-link">Home</router-link></li>
        <li><router-link to="/reportsList" class="nav-link">Lista Report</router-link></li>
        <li><router-link to="/taskTemplates" class="nav-link active">Task Attive</router-link></li>
        <li><router-link to="/createTask" class="nav-link">Crea Task</router-link></li>
      </ul>
    </nav>

    <div class="header-section">
        <h1 class="page-title">Gestione Modelli</h1>
        
        <div class="tabs-container">
            <button 
                :class="['tab-btn', { active: currentTab === 'active' }]" 
                @click="currentTab = 'active'">
                🟢 Attivi
            </button>
            <button 
                :class="['tab-btn', { active: currentTab === 'archived' }]" 
                @click="currentTab = 'archived'">
                📦 Archiviati
            </button>
            <button 
                :class="['tab-btn', { active: currentTab === 'all' }]" 
                @click="currentTab = 'all'">
                📋 Tutti
            </button>
        </div>
    </div>

    <div v-if="loading" class="state-container loading">
        <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="state-container error">
        <span class="error-text">⚠️ {{ error }}</span>
    </div>

    <div v-else class="tasks-grid">
      <div v-for="tpl in _filteredTemplates" :key="tpl._id" class="task-card">
        <div class="card-content">
            <div class="card-header">
                <h2 class="task-title">{{ tpl.name }}</h2>
                <span class="points-badge" v-if="tpl.base_points_range">
                    {{ tpl.base_points_range.min }} - {{ tpl.base_points_range.max }} pts
                </span>
                <span class="points-badge" v-else>0 pts</span>
            </div>
            
            <p class="task-description">{{ tpl.description }}</p>
            
            <div class="badges-container">
                <!-- Status Badge -->
                <span v-if="currentTab === 'all' && tpl.is_active !== undefined" 
                      :class="['badge', tpl.is_active ? 'badge-status-active' : 'badge-status-archived']">
                    {{ tpl.is_active ? 'Attivo' : 'Archiviato' }}
                </span>

                <!-- Category Badge using existing styles or fallback -->
                <span class="badge badge-frequency">{{ tpl.category }}</span>

                <!-- Difficulty Badge -->
                <span :class="['badge', 'badge-' + (tpl.default_difficulty ? tpl.default_difficulty.toLowerCase() : 'default')]">
                    {{ tpl.default_difficulty }}
                </span>
                
                <!-- Frequency Badge -->
                <span class="badge badge-frequency">{{ tpl.default_frequency }}</span>
                
                <!-- Verification Method Badge -->
                 <span class="badge badge-verification">{{ tpl.verification_method }}</span>
            </div>
        </div>

        <div class="card-actions">
            <button @click="__updateTemplate(tpl._id)" class="btn-action btn-update">Modifica</button>
            <button @click="__confirmDelete(tpl._id, tpl.title)" class="btn-action btn-delete">Elimina</button>
        </div>
      </div>
    </div>

    <div v-if="!loading && _filteredTemplates.length === 0" class="empty-state">
        <p>Nessun modello trovato in questa categoria.</p>
    </div>

    <!-- ALL TASKS SECTION -->
    <section class="section tasks-section">
      <h2 class="section-title">Tutti i Task</h2>

      <div v-if="tasksLoading" class="state-container loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="tasksError" class="state-container error">
        <span class="error-text">⚠️ {{ tasksError }}</span>
      </div>

      <div v-else class="table-card">
        <div class="table-responsive">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Quartiere</th>
                <th>Categoria</th>
                <th>Difficoltà</th>
                <th>Frequenza</th>
                <th>Verifica</th>
                <th>Stato</th>
                <th>Punti</th>
                <th>Data Creazione</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tasks.length === 0">
                <td colspan="9" class="text-center">Nessun task trovato.</td>
              </tr>
              <tr v-for="task in tasks" :key="task._id" class="clickable-row" @click="openTaskDetail(task)">
                <td class="primary-text">{{ task.title }}</td>
                <td>{{ task.neighborhood_id?.name || '—' }}</td>
                <td><span class="badge badge-frequency">{{ task.category }}</span></td>
                <td>
                  <span :class="['badge', 'badge-' + (task.difficulty ? task.difficulty.toLowerCase() : 'default')]">{{ task.difficulty || 'N/A' }}</span>
                </td>
                <td>{{ task.frequency }}</td>
                <td><span class="badge badge-verification">{{ task.verification_method }}</span></td>
                <td>
                  <span :class="['status-badge', task.is_active !== false ? 'active' : 'inactive']">{{ task.is_active !== false ? 'Attivo' : 'Inattivo' }}</span>
                </td>
                <td>{{ task.base_points }}</td>
                <td>{{ formatDate(task.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TASK DETAIL/EDIT MODAL -->
    <Teleport to="body">
      <div v-if="showTaskModal" class="modal-overlay" @click.self="closeTaskModal">
        <div class="modal-card">
          <button class="close-btn" @click="closeTaskModal">×</button>

          <div v-if="taskModalLoading" class="modal-loading">
            <div class="spinner"></div>
            <p>Elaborazione...</p>
          </div>

          <div v-else-if="editingTask" class="modal-body-content">
            <header class="modal-header">
              <h2>Dettaglio Task</h2>
              <span :class="['status-badge', editingTask.is_active ? 'active' : 'inactive']">
                {{ editingTask.is_active ? 'Attivo' : 'Inattivo' }}
              </span>
            </header>

            <div v-if="taskModalError" class="modal-error">
              ⚠️ {{ taskModalError }}
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <label>Titolo</label>
                <input v-model="editingTask.title" type="text" class="form-input" />
              </div>

              <div class="form-group full-width">
                <label>Quartiere</label>
                <select v-model="editingTask.neighborhood_id_value" class="form-input">
                  <option value="">-- Nessun quartiere --</option>
                  <option v-for="n in neighborhoods" :key="n._id" :value="n._id">
                    {{ n.name }}
                  </option>
                </select>
              </div>

              <div class="form-group full-width">
                <label>Descrizione</label>
                <textarea v-model="editingTask.description" class="form-input form-textarea" rows="3"></textarea>
              </div>

              <div class="form-group">
                <label>Categoria</label>
                <select v-model="editingTask.category" class="form-input">
                  <option value="Mobility">Mobility</option>
                  <option value="Waste">Waste</option>
                  <option value="Community">Community</option>
                  <option value="Volunteering">Volunteering</option>
                </select>
              </div>

              <div class="form-group">
                <label>Difficoltà</label>
                <select v-model="editingTask.difficulty" class="form-input">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div class="form-group">
                <label>Frequenza</label>
                <select v-model="editingTask.frequency" class="form-input">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="on_demand">On Demand</option>
                  <option value="onetime">One Time</option>
                </select>
              </div>

              <div class="form-group">
                <label>Metodo Verifica</label>
                <select v-model="editingTask.verification_method" class="form-input">
                  <option value="GPS">GPS</option>
                  <option value="QR_SCAN">QR Scan</option>
                  <option value="PHOTO_UPLOAD">Photo Upload</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="MANUAL_REPORT">Manual Report</option>
                </select>
              </div>

              <div class="form-group">
                <label>Punti Base</label>
                <input v-model.number="editingTask.base_points" type="number" min="0" class="form-input" />
              </div>

              <div class="form-group">
                <label>CO₂ Risparmiata (kg)</label>
                <input v-model.number="editingTask.impact_metrics.co2_saved" type="number" min="0" step="0.1" class="form-input" />
              </div>

              <div class="form-group">
                <label>Rifiuti Riciclati (kg)</label>
                <input v-model.number="editingTask.impact_metrics.waste_recycled" type="number" min="0" step="0.1" class="form-input" />
              </div>

              <div class="form-group">
                <label>Km Green</label>
                <input v-model.number="editingTask.impact_metrics.km_green" type="number" min="0" step="0.1" class="form-input" />
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn-modal btn-delete-modal" @click="deleteTask">Elimina</button>
              <button class="btn-modal btn-toggle" @click="toggleTaskActive">
                {{ editingTask.is_active ? 'Disattiva' : 'Attiva' }}
              </button>
              <button class="btn-modal btn-save" @click="saveTask">Salva</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
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
  top: 5;
  left: 5;
  width: 75vw;
  min-height: 100vh;
  z-index: 10;
  box-sizing: border-box;
  left: 50%;
  transform: translateX(-50%);
  padding: 1.5rem;
  background-color: #f7faf8;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1b4332;
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

/* Header & Tabs */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d6a4f;
  margin: 0;
  position: relative;
  padding-left: 1rem;
}

.page-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  width: 4px;
  background-color: #52b788;
  border-radius: 2px;
}

.tabs-container {
  display: flex;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.tab-btn:hover {
  background: #f0fdf4;
  color: var(--primary-green);
}

.tab-btn.active {
  background: var(--primary-green);
  color: white;
  box-shadow: 0 2px 4px rgba(45, 106, 79, 0.2);
}

/* Grid e Card */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.task-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.02);
  transition: transform 0.2s, box-shadow 0.2s;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.card-content {
  padding: 1.5rem;
  flex-grow: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.task-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1b4332;
  margin: 0;
  line-height: 1.4;
}

.points-badge {
  background-color: #ffedd5;
  color: #c2410c;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  white-space: nowrap;
  margin-left: 0.75rem;
}

.task-description {
  color: #6c757d;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.badges-container {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  text-transform: capitalize;
}

.badge-low { background-color: #dcfce7; color: #166534; }
.badge-status-active { background-color: #d1fae5; color: #065f46; border: 1px solid #34d399; }
.badge-status-draft { background-color: #fef9c3; color: #854d0e; border: 1px solid #fbbf24; }
.badge-status-archived { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.badge-frequency { background-color: #dbeafe; color: #1e40af; }
.badge-verification { background-color: #f3e8ff; color: #6b21a8; }

.card-actions {
  background-color: #f8fafc;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
}

.btn-action {
  border: none;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
  font-size: 0.9rem;
}

.btn-update { color: #2563eb; }
.btn-update:hover { color: #1d4ed8; }

.btn-delete { color: #dc2626; }
.btn-delete:hover { color: #991b1b; }

/* Stati (Loading, Error, Empty) */
.state-container,
.empty-state {
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
  color: #6c757d;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2d6a4f;
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

.error-text {
  color: #b91c1c;
  font-weight: 500;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: 1rem;
    width: 95vw;
  }
  
  .dashboard-navbar {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .navbar-links {
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .header-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .tabs-container {
    justify-content: space-between;
    overflow-x: auto;
  }
}

/* Tasks Section */
.tasks-section {
  margin-top: 3rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d6a4f;
  margin-bottom: 1.5rem;
  padding-left: 1rem;
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 20px;
  width: 4px;
  background-color: #52b788;
  border-radius: 2px;
}

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
  min-width: 800px;
}

.modern-table th {
  background-color: #f0fdf4;
  color: #2d6a4f;
  font-weight: 600;
  padding: 1rem 1.25rem;
  border-bottom: 2px solid #d8f3dc;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modern-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  color: #4a5568;
  vertical-align: middle;
  font-size: 0.9rem;
}

.primary-text {
  font-weight: 600;
  color: #1b4332;
}

.text-center {
  text-align: center;
}

.status-badge {
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.8rem;
}

.status-badge.active {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background-color: #f3f4f6;
  color: #374151;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-row:hover {
  background-color: #f0fdf4;
}

/* Task Detail Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: white;
  width: 90%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;
  padding: 2.5rem;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.close-btn {
  position: absolute;
  top: 1.25rem;
  right: 1.5rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #64748b;
  line-height: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  color: #1b4332;
  font-size: 1.5rem;
}

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.modal-error {
  color: #b91c1c;
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #2d6a4f;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.form-input {
  padding: 0.6rem 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1b4332;
  background: #f8fafc;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #40916c;
  box-shadow: 0 0 0 3px rgba(64, 145, 108, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 70px;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  border-top: 1px solid #f1f5f9;
  padding-top: 1.5rem;
}

.btn-modal {
  padding: 0.7rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-save {
  background-color: #2d6a4f;
  color: white;
}
.btn-save:hover {
  background-color: #1b4332;
}

.btn-toggle {
  background-color: #fef3c7;
  color: #b45309;
}
.btn-toggle:hover {
  background-color: #fde68a;
}

.btn-delete-modal {
  background-color: #fee2e2;
  color: #b91c1c;
  margin-right: auto;
}
.btn-delete-modal:hover {
  background-color: #fecaca;
}
</style>