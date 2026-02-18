<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const _router = useRouter();

// Stato del componente
const templates = ref([]);
const loading = ref(true);
const error = ref(null);

// Gestione dei Filtri (Tab) - Solo Attivi, Archiviati e Tutti
const currentTab = ref("active");

const _API_BASE = "http://localhost:5000/api/v1";

// Recupera i Task Template dal database
const fetchTemplates = async () => {
  loading.value = true;
  error.value = null;

  const token = localStorage.getItem("token");
  if (!token) {
    _router.push("/login");
    return;
  }

  try {
    const response = await fetch(`${_API_BASE}/tasks/templates`, {
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
      setTimeout(() => _router.push("/login"), 2500);
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

const _confirmDelete = (templateId, templateTitle) => {
  const proceed = confirm(
    `Vuoi davvero eliminare il modello "${templateTitle}"?`,
  );
  if (proceed) {
    console.log(`Eliminazione richiesta per: ${templateId}`);
    alert("Funzionalità di eliminazione in fase di implementazione.");
  }
};

const _updateTemplate = (templateId) => {
  console.log(`Modifica richiesta per: ${templateId}`);
  alert("Reindirizzamento alla pagina di modifica...");
};

onMounted(() => {
  fetchTemplates();
});
</script>

<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><a href="/operatorDashboard" class="nav-link">Home</a></li>
        <li><a href="/taskManagement" class="nav-link active">Task Attive</a></li>
        <li><a href="/createTask" class="nav-link">Crea Task</a></li>
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
      <div v-for="tpl in filteredTemplates" :key="tpl._id" class="task-card">
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
            <button @click="updateTemplate(tpl._id)" class="btn-action btn-update">Modifica</button>
            <button @click="confirmDelete(tpl._id, tpl.title)" class="btn-action btn-delete">Elimina</button>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredTemplates.length === 0" class="empty-state">
        <p>Nessun modello trovato in questa categoria.</p>
    </div>
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
</style>