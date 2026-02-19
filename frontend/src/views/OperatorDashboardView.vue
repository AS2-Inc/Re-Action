<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import apiService from "@/services/api.js";

const router = useRouter();

const environmentalData = ref({});
const neighborhoods = ref([]);

const loading = ref(true);
const errorMessage = ref("");

// Modal State
const showModal = ref(false);
const selectedNeighborhood = ref(null);
const modalLoading = ref(false);

const fetchDashboardData = async () => {
  if (!apiService.isAuthenticated()) {
    router.push("/login");
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const neighData = await apiService.get(
      "/api/v1/operators/dashboard/neighborhoods",
      {
        autoRedirect: true,
        router,
        authType: "operator",
      },
    );

    // --- 1. MAPPATURA QUARTIERI ---
    const arrayQuartieri = Array.isArray(neighData)
      ? neighData
      : neighData.data || [];

    neighborhoods.value = arrayQuartieri.map((n) => {
      return {
        id: n._id || n.id,
        name: n.name || "N/A",
        score: n.normalized_points || 0,
        completed_tasks: n.completed_tasks || 0,
      };
    });

    // --- 2. CALCOLO DATI AMBIENTALI GLOBALI DAI QUARTIERI ---
    let totalCo2 = 0;
    let totalWaste = 0;
    let totalGreenKm = 0;

    arrayQuartieri.forEach((quartiere) => {
      if (quartiere.environmental_data) {
        totalCo2 += quartiere.environmental_data.co2_saved || 0;
        totalWaste += quartiere.environmental_data.waste_recycled || 0;
        totalGreenKm += quartiere.environmental_data.km_green || 0;
      }
    });

    // Riempiamo l'oggetto reattivo. Le chiavi diventano le etichette delle card in automatico.
    environmentalData.value = {
      "CO2 Risparmiata (kg)": totalCo2,
      "Rifiuti Riciclati (kg)": totalWaste,
      "Km Green Percorsi": totalGreenKm,
    };
  } catch (error) {
    errorMessage.value = error.message;
    // Auto-redirect already handled by API service
  } finally {
    loading.value = false;
  }
};

// Funzione per il bottone della tabella
const _viewDetails = async (id) => {
  if (!apiService.isAuthenticated()) return;

  showModal.value = true;
  modalLoading.value = true;
  selectedNeighborhood.value = null;

  try {
    const data = await apiService.get(
      `/api/v1/operators/dashboard/neighborhoods/${id}`,
    );

    // Calculate submissions this week from daily_activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let submissionsThisWeek = 0;
    if (data.daily_activity && Array.isArray(data.daily_activity)) {
      submissionsThisWeek = data.daily_activity
        .filter((day) => new Date(day._id) >= oneWeekAgo)
        .reduce((sum, day) => sum + day.count, 0);
    }

    selectedNeighborhood.value = {
      name: data.neighborhood.name,
      city: data.neighborhood.city,
      base_points: data.neighborhood.base_points,
      normalized_points: data.neighborhood.normalized_points,
      ranking_position: data.neighborhood.ranking_position,
      user_count: data.stats.total_users,
      submissions_this_week: submissionsThisWeek,
      environmental_data: data.neighborhood.environmental_data || {},
    };
  } catch (_err) {
    alert("Impossibile caricare i dettagli del quartiere.");
    showModal.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const _closeModal = () => {
  showModal.value = false;
  selectedNeighborhood.value = null;
};

// Avvia tutto non appena la pagina viene aperta nel browser
onMounted(() => {
  fetchDashboardData();
});
</script>



<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><router-link to="/operatorDashboard" class="nav-link active">Home</router-link></li>
        <li><router-link to="/reportsList" class="nav-link">Lista Report</router-link></li>
        <li><router-link to="/taskTemplates" class="nav-link">Task Attive</router-link></li>
        <li><router-link to="/createTask" class="nav-link">Crea Task</router-link></li>
        
      </ul>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="state-container loading">
      <div class="spinner"></div>
      <p>Caricamento dati in corso...</p>
    </div>

    <!-- Error State -->
    <div v-if="errorMessage" class="state-container error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>

    <!-- Main Content -->
    <div v-if="!loading && !errorMessage" class="dashboard-content">

      <!-- Environmental Stats Section -->
      <section class="section stats-section">
        <h2 class="section-title">Indicatori Ambientali Globali</h2>
        <div class="stats-grid">
          <div class="stat-card" v-for="(value, key) in environmentalData" :key="key">
            <div class="stat-icon">🍃</div>
            <div class="stat-info">
              <span class="stat-label">{{ key }}</span>
              <strong class="stat-value">{{ Number(value).toFixed(2) }}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Neighborhoods Table Section -->
      <div class="dashboard-grid">
        <!-- Neighborhoods Table Section -->
        <section class="section neighborhoods-section">
          <h2 class="section-title">Stato Quartieri</h2>
          <div class="table-card">
            <div class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Nome Quartiere</th>
                    <th>Punteggio Eco</th>
                    <th>Task Completate</th>
                    <th class="text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="neighborhood in neighborhoods" :key="neighborhood.id">
                    <td class="primary-text">{{ neighborhood.name }}</td>
                    <td>
                      <!-- Inline conditional classes for status indication -->
                      <span class="score-badge" :class="{
                        'high': neighborhood.score >= 200,
                        'medium': neighborhood.score >= 101 && neighborhood.score < 200,
                        'low': neighborhood.score < 100
                      }">
                        {{ neighborhood.score }}
                      </span>
                    </td>
                    <td class="task-count">{{ neighborhood.completed_tasks }}</td>
                    <td class="text-right">
                      <button class="btn-details" @click="_viewDetails(neighborhood.id)">
                        Vedi Dettagli
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

   

      </div>
    </div>
   
    <!-- MODAL -->
    <Teleport to="body">
        <div v-if="showModal" class="modal-overlay" @click.self="_closeModal">
            <div class="modal-card">
                <button class="close-btn" @click="_closeModal">×</button>
                
                <div v-if="modalLoading" class="modal-loading">
                    <div class="spinner"></div>
                    <p>Caricamento dettagli...</p>
                </div>
                
                <div v-else-if="selectedNeighborhood" class="modal-content">
                    <header class="modal-header">
                        <h2>{{ selectedNeighborhood.name }}</h2>
                        <span class="city-badge">{{ selectedNeighborhood.city }}</span>
                    </header>
                    
                    <div class="modal-grid">
                        <div class="detail-item">
                            <label>Ranking</label>
                            <div class="value">#{{ selectedNeighborhood.ranking_position }}</div>
                        </div>
                        <div class="detail-item">
                            <label>Punteggio Eco</label>
                            <div class="value highlight">{{ selectedNeighborhood.normalized_points }}</div>
                        </div>
                        <div class="detail-item">
                            <label>Utenti Attivi</label>
                            <div class="value">{{ selectedNeighborhood.user_count }}</div>
                        </div>
                        <div class="detail-item">
                            <label>Task (Questa Settimana)</label>
                            <div class="value">{{ selectedNeighborhood.submissions_this_week }}</div>
                        </div>
                    </div>

                    <div class="env-section">
                        <h3>Dati Ambientali</h3>
                        <div class="env-grid">
                            <div class="env-item">
                                <span class="env-label">CO2 Risparmiata (kg)</span>
                                <span class="env-value">{{ Number(selectedNeighborhood.environmental_data.co2_saved || 0).toFixed(2) }}</span>
                            </div>
                            <div class="env-item">
                                <span class="env-label">Rifiuti Riciclati (kg)</span>
                                <span class="env-value">{{ Number(selectedNeighborhood.environmental_data.waste_recycled || 0).toFixed(2) }}</span>
                            </div>
                             <div class="env-item">
                                <span class="env-label">Km Green Percorsi</span>
                                <span class="env-value">{{ Number(selectedNeighborhood.environmental_data.km_green || 0).toFixed(2) }}</span>
                            </div>
                        </div>
                        <div class="last-updated">
                            Ultimo aggiornamento: {{ new Date(selectedNeighborhood.environmental_data.last_updated || Date.now()).toLocaleDateString() }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>

  </div>
</template>

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

/* States (Loading/Error) */
.state-container {
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

.loading .spinner, .modal-loading .spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2d6a4f;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.error {
  border: 1px solid #fee2e2;
  background-color: #fef2f2;
  color: #b91c1c;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

/* Sections */
.section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #2d6a4f;
  position: relative;
  padding-left: 1rem;
}

.section-title::before {
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Dashboard Grid (Neighborhoods + Reports) */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 1.75rem;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  font-size: 2.2rem;
  margin-right: 1.5rem;
  background-color: #d8f3dc;
  /* Light green bg for icon */
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1b4332;
}

/* Table Card */
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
  /* Prevent squishing on very small screens */
}

.modern-table th {
  background-color: #f0fdf4;
  /* Very light green header */
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

.modern-table tbody tr {
  transition: background-color 0.15s;
}

.modern-table tbody tr:hover {
  background-color: #f8fafc;
}

.modern-table tbody tr:nth-child(even) {
  background-color: #fafbfb;
  /* Zebra striping */
}

.primary-text {
  font-weight: 600;
  color: #1b4332;
  font-size: 1.05rem;
}

.text-right {
  text-align: right;
}

/* Badges */
.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.85rem;
  min-width: 3rem;
}

.score-badge.high {
  background-color: #d1fae5;
  color: #047857;
}

.score-badge.medium {
  background-color: #fef3c7;
  color: #b45309;
}

.score-badge.low {
  background-color: #fee2e2;
  color: #b91c1c;
}

.task-count {
  font-family: monospace;
  font-size: 1.1rem;
  color: #2d6a4f;
  font-weight: 600;
}

/* Buttons */
.btn-details {
  background-color: #40916c;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(64, 145, 108, 0.2);
}

.btn-details:hover {
  background-color: #2d6a4f;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(64, 145, 108, 0.3);
}

.btn-details:active {
  transform: translateY(0);
}

/* Modal Styles */
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
    z-index: 100;
    backdrop-filter: blur(4px);
}

.modal-card {
    background: white;
    width: 90%;
    max-width: 800px;
    border-radius: 20px;
    padding: 3rem;
    position: relative;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.close-btn {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #64748b;
    line-height: 1;
}

.modal-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 0;
}

.modal-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 1.5rem;
}

.modal-header h2 {
    margin: 0;
    color: #1b4332;
    font-size: 1.8rem;
}

.city-badge {
    background-color: #f1f5f9;
    color: #475569;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
}

.modal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
}

.detail-item label {
    display: block;
    color: #64748b;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    font-weight: 500;
}

.detail-item .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
}

.detail-item .value.highlight {
    color: #2d6a4f;
}

.env-section {
    background-color: #f0fdf4;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #dcfce7;
}

.env-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #166534;
}

.env-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}

.env-item {
    display: flex;
    flex-direction: column;
}

.env-label {
    font-size: 0.8rem;
    color: #166534;
    margin-bottom: 0.25rem;
}

.env-value {
    font-weight: 700;
    font-size: 1.1rem;
    color: #14532d;
}

.last-updated {
    margin-top: 1rem;
    font-size: 0.8rem;
    color: #86efac;
    text-align: right;
    font-style: italic;
    color: #15803d;
}


/* Mobile Responsiveness */
@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: 1rem;
  }

  .dashboard-header h1 {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    /* Stack vertically on mobile */
  }

  .stat-card {
    padding: 1.25rem;
  }

  .modern-table th,
  .modern-table td {
    padding: 1rem;
  }

  .btn-details {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>