<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const _router = useRouter();

// Stato locale (Variabili reattive collegate al template)
const environmentalData = ref({});
const neighborhoods = ref([]);
const reportsStats = ref([]);
const loading = ref(true);
const errorMessage = ref("");

// Funzione principale per recuperare i dati
const fetchDashboardData = async () => {
  // const token = localStorage.getItem('token');

  // COMMENTATO PER TESTARE LA GRAFICA SENZA LOGIN
  /*
  if (!token) {
    router.push('/login');
    return;
  }
  */

  const _API_BASE = "http://localhost:5000/api/v1";

  loading.value = true;
  errorMessage.value = "";

  try {
    /* --- CHIAMATE API REALI (DA SCOMMENTARE IN FUTURO) ---
    const envResponse = await fetch(`${API_BASE}/operators/dashboard/environmental`, {
      headers: { 'x-access-token': token }
    });
    const neighResponse = await fetch(`${API_BASE}/operators/dashboard/neighborhoods`, {
      headers: { 'x-access-token': token }
    });

    if (!envResponse.ok || !neighResponse.ok) {
      throw new Error('Errore nel recupero dei dati dal server');
    }

    environmentalData.value = await envResponse.json();
    neighborhoods.value = await neighResponse.json();
    */

    // --- DATI FINTI PER TESTARE IL CSS (MOCKING) ---

    // Simuliamo un ritardo di rete di 800ms per vedere l'animazione di caricamento
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Riempiamo le variabili con dati inventati
    environmentalData.value = {
      "CO2 Risparmiata (kg)": 1250,
      "Rifiuti Riciclati (kg)": 3400,
      "Task Totali Completate": 156,
    };

    neighborhoods.value = [
      { id: "q1", name: "Centro Storico", score: 85, completed_tasks: 42 },
      { id: "q2", name: "San Martino", score: 60, completed_tasks: 15 },
      { id: "q3", name: "Cristo Re", score: 92, completed_tasks: 68 },
      { id: "q4", name: "Zona Industriale", score: 45, completed_tasks: 8 },
    ];

    reportsStats.value = [
      {
        category: "Rifiuti Abbandonati",
        total: 45,
        resolved: 40,
        pending: 5,
        avg_time: "24h",
      },
      {
        category: "Manutenzione Stradale",
        total: 12,
        resolved: 8,
        pending: 4,
        avg_time: "48h",
      },
      {
        category: "Illuminazione",
        total: 8,
        resolved: 8,
        pending: 0,
        avg_time: "12h",
      },
      {
        category: "Verde Pubblico",
        total: 15,
        resolved: 10,
        pending: 5,
        avg_time: "36h",
      },
    ];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false; // Ferma la rotellina di caricamento
  }
};

// Funzione per il bottone della tabella
const _viewDetails = (id) => {
  console.log(`Hai cliccato per vedere i dettagli del quartiere: ${id}`);
  // In futuro scommenterai questa riga per cambiare pagina:
  // router.push(`/operator-dashboard/neighborhood/${id}`);
};

// Avvia tutto non appena la pagina viene aperta nel browser
onMounted(() => {
  fetchDashboardData();
});
</script>



<template>
  <div class="dashboard-wrapper">
    <header class="dashboard-header">
      <h1>Dashboard Operatore Comunale</h1>
      <p class="subtitle">Monitoraggio ambientale e gestione del territorio</p>
    </header>

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
              <strong class="stat-value">{{ value }}</strong>
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
                      <span 
                        class="score-badge" 
                        :class="{
                          'high': neighborhood.score >= 80, 
                          'medium': neighborhood.score >= 60 && neighborhood.score < 80, 
                          'low': neighborhood.score < 60
                        }"
                      >
                        {{ neighborhood.score }}
                      </span>
                    </td>
                    <td class="task-count">{{ neighborhood.completed_tasks }}</td>
                    <td class="text-right">
                      <button class="btn-details" @click="viewDetails(neighborhood.id)">
                        Vedi Dettagli
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Reports Stats Section -->
        <section class="section reports-section">
          <h2 class="section-title">Monitoraggio Segnalazioni</h2>
          <div class="table-card">
            <div class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Totale Segnalazioni</th>
                    <th>Risolte</th>
                    <th>In Attesa</th>
                    <th>Tempo Medio Risoluzione</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in reportsStats" :key="stat.category">
                    <td class="primary-text">{{ stat.category }}</td>
                    <td class="font-bold">{{ stat.total }}</td>
                    <td>
                      <span class="score-badge high">{{ stat.resolved }}</span>
                    </td>
                    <td>
                      <span v-if="stat.pending > 0" class="score-badge medium">{{ stat.pending }}</span>
                      <span v-else class="score-badge high">0</span>
                    </td>
                    <td>{{ stat.avg_time }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
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
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
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

/* Header */
.dashboard-header {
  margin-bottom: 2.5rem;
  text-align: center;
}

.dashboard-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #2d6a4f; /* Primary Green */
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #40916c;
  font-size: 1.1rem;
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-top: 2rem;
  text-align: center;
}

.loading .spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2d6a4f;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

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
  grid-template-columns: 1fr ;
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
  border: 1px solid rgba(0,0,0,0.02);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  font-size: 2.2rem;
  margin-right: 1.5rem;
  background-color: #d8f3dc; /* Light green bg for icon */
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
  border: 1px solid rgba(0,0,0,0.02);
}

.table-responsive {
  overflow-x: auto;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 600px; /* Prevent squishing on very small screens */
}

.modern-table th {
  background-color: #f0fdf4; /* Very light green header */
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
  background-color: #fafbfb; /* Zebra striping */
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

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: 1rem;
  }
  
  .dashboard-header h1 {
    font-size: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr; /* Stack vertically on mobile */
  }

  .stat-card {
    padding: 1.25rem;
  }
  
  .modern-table th, .modern-table td {
    padding: 1rem;
  }
  
  .btn-details {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>