<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// TABS
const currentTab = ref("scratch"); // 'scratch' | 'template'

// COMMON STATE
const loading = ref(false);
const error = ref(null);
const successMessage = ref("");
const neighborhoods = ref([]);

// --- CREATE FROM SCRATCH STATE ---
const formData = ref({
  title: "",
  description: "",
  points: 10,
  base_points: 10,
  difficulty: "Medium",
  frequency: "daily",
  category: "Community",
  verification_method: "PHOTO_UPLOAD",
  neighborhood_id: "",
});

// --- CREATE FROM TEMPLATE STATE ---
const templates = ref([]);
const selectedTemplateId = ref("");
const templateFormData = ref({
  title: "",
  description: "",
  base_points: 0,
  neighborhood_id: "",
  // Dynamic fields will be added here
});

const selectedTemplate = computed(() =>
  templates.value.find((t) => t._id === selectedTemplateId.value),
);

// --- API CALLS ---

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

const fetchTemplates = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/api/v1/tasks/templates`, {
      headers: { "x-access-token": token },
    });
    if (response.ok) {
      const data = await response.json();
      templates.value = Array.isArray(data) ? data : data.data || [];
    }
  } catch (err) {
    console.error("Error fetching templates config", err);
  }
};

const handleTemplateChange = () => {
  if (!selectedTemplate.value) return;

  // Reset specific form data
  const t = selectedTemplate.value;
  templateFormData.value = {
    title: t.example_title || t.name,
    description: t.example_description || t.description,
    base_points: t.base_points_range ? t.base_points_range.min : 10,
    neighborhood_id: "",
  };

  // Initialize configurable fields with defaults
  if (t.configurable_fields) {
    t.configurable_fields.forEach((field) => {
      templateFormData.value[field.field_name] = field.default_value;
    });
  }
};

const createTask = async () => {
  loading.value = true;
  error.value = null;
  successMessage.value = "";

  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  try {
    const payload = {
      ...formData.value,
      base_points: formData.value.points, // Map points to base_points
    };

    // Remove empty neighborhood_id to avoid casting errors
    if (!payload.neighborhood_id) {
      delete payload.neighborhood_id;
    }

    const response = await fetch(`${API_BASE}/api/v1/tasks/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Sessione scaduta o permessi insufficienti.");
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(
        errData.message || `Errore HTTP! status: ${response.status}`,
      );
    }

    successMessage.value = "Task creato con successo!";
    setTimeout(() => router.push("/taskTemplates"), 1500);
  } catch (err) {
    error.value = err.message || "Errore durante la creazione del task.";
    if (err.message.includes("Sessione scaduta")) {
      setTimeout(() => router.push("/login"), 2500);
    }
  } finally {
    loading.value = false;
  }
};

const createTaskFromTemplate = async () => {
  if (!selectedTemplateId.value) return;

  loading.value = true;
  error.value = null;
  successMessage.value = "";

  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  try {
    const payload = {
      template_id: selectedTemplateId.value,
      ...templateFormData.value,
    };

    if (!payload.neighborhood_id) delete payload.neighborhood_id;

    const response = await fetch(`${API_BASE}/api/v1/tasks/from-template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Sessione scaduta o permessi insufficienti.");
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(
        errData.message || `Errore HTTP! status: ${response.status}`,
      );
    }

    successMessage.value = "Task da modello creato con successo!";
    setTimeout(() => router.push("/taskTemplates"), 1500);
  } catch (err) {
    error.value = err.message || "Errore creazione task da modello.";
    if (err.message.includes("Sessione scaduta")) {
      setTimeout(() => router.push("/login"), 2500);
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTemplates();
  fetchNeighborhoods();
});
</script>

<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><a href="/operatorDashboard" class="nav-link">Home</a></li>
        <li><a href="/reportsList" class="nav-link">Lista Report</a></li>
        <li><a href="/taskTemplates" class="nav-link">Task attive</a></li>
        <li><a href="/createTask" class="nav-link active">Crea Task</a></li>
      </ul>
    </nav>

    <div class="header-section">
        <h1 class="page-title">Crea Nuovo Task</h1>
    </div>

    <div class="content-container">
        
        <!-- TABS -->
        <div class="tabs-container">
            <button 
                class="tab-btn" 
                :class="{ active: currentTab === 'scratch' }"
                @click="currentTab = 'scratch'"
            >
                Crea da Zero
            </button>
            <button 
                class="tab-btn" 
                :class="{ active: currentTab === 'template' }"
                @click="currentTab = 'template'"
            >
                Usa un Modello
            </button>
        </div>

        <div class="form-card">
            
            <!-- FORM: CREATE FROM SCRATCH -->
            <form v-if="currentTab === 'scratch'" @submit.prevent="createTask">
                <div class="form-header-note">Stai creando un task completamente personalizzato.</div>
                
                <div class="form-grid">
                    <!-- Title -->
                    <div class="form-group span-2">
                        <label>Titolo Task</label>
                        <input v-model="formData.title" required type="text" class="input-field" placeholder="Es. Pulizia Parco Giochi" />
                    </div>

                    <!-- Description -->
                    <div class="form-group span-2">
                        <label>Descrizione</label>
                        <textarea v-model="formData.description" required class="input-field" rows="4" placeholder="Descrivi i dettagli del task..."></textarea>
                    </div>

                    <!-- Points -->
                    <div class="form-group">
                        <label>Punti</label>
                        <input v-model.number="formData.points" required type="number" min="1" class="input-field" />
                    </div>

                    <!-- Category -->
                    <div class="form-group">
                        <label>Categoria</label>
                        <select v-model="formData.category" class="input-field">
                            <option value="Mobility">Mobilità</option>
                            <option value="Waste">Rifiuti</option>
                            <option value="Community">Comunità</option>
                            <option value="Volunteering">Volontariato</option>
                        </select>
                    </div>

                    <!-- Difficulty -->
                    <div class="form-group">
                        <label>Difficoltà</label>
                        <select v-model="formData.difficulty" class="input-field">
                            <option value="Low">Bassa</option>
                            <option value="Medium">Media</option>
                            <option value="High">Alta</option>
                        </select>
                    </div>

                    <!-- Frequency -->
                    <div class="form-group">
                        <label>Frequenza</label>
                        <select v-model="formData.frequency" class="input-field">
                            <option value="daily">Giornaliera</option>
                            <option value="weekly">Settimanale</option>
                            <option value="monthly">Mensile</option>
                            <option value="on_demand">Su Richiesta</option>
                        </select>
                    </div>

                    <!-- Verification Method -->
                    <div class="form-group">
                        <label>Metodo Verifica</label>
                        <select v-model="formData.verification_method" class="input-field">
                            <option value="GPS">GPS</option>
                            <option value="QR_SCAN">Scansione QR</option>
                            <option value="QUIZ">Quiz</option>
                            <option value="PHOTO_UPLOAD">Caricamento Foto</option>
                            <option value="MANUAL_REPORT">Report Manuale</option>
                            <option value="AUTO">Automatico</option>
                        </select>
                    </div>

                    <!-- Neighborhood -->
                    <div class="form-group span-2">
                        <label>Quartiere (Opzionale)</label>
                        <select v-model="formData.neighborhood_id" class="input-field">
                            <option value="">-- Nessun quartiere specifico --</option>
                            <option v-for="n in neighborhoods" :key="n._id" :value="n._id">
                                {{ n.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn-submit" :disabled="loading">
                        <span v-if="loading" class="spinner-sm"></span>
                        <span v-else>Crea Task</span>
                    </button>
                </div>
            </form>


            <!-- FORM: CREATE FROM TEMPLATE -->
            <form v-else @submit.prevent="createTaskFromTemplate">
                <div class="form-header-note">Scegli un modello predefinito per configurare rapidamente il task.</div>

                <div class="form-grid">
                    <!-- Template Selector -->
                    <div class="form-group span-2">
                        <label>Seleziona Modello</label>
                        <select v-model="selectedTemplateId" @change="handleTemplateChange" class="input-field" required>
                            <option value="" disabled>-- Scegli un Modello --</option>
                            <option v-for="tpl in templates" :key="tpl._id" :value="tpl._id">
                                {{ tpl.name }} ({{ tpl.category }})
                            </option>
                        </select>
                    </div>

                    <div v-if="selectedTemplate" class="span-2 template-fields-wrapper">
                         <!-- Title Override -->
                        <div class="form-group span-2">
                            <label>Titolo Task</label>
                            <input v-model="templateFormData.title" required type="text" class="input-field" />
                        </div>

                        <!-- Description Override -->
                        <div class="form-group span-2">
                            <label>Descrizione</label>
                            <textarea v-model="templateFormData.description" required class="input-field" rows="3"></textarea>
                        </div>
                        
                        <!-- Points Override (Range validated) -->
                        <div class="form-group">
                            <label>Punti (Range: {{ selectedTemplate.base_points_range.min }} - {{ selectedTemplate.base_points_range.max }})</label>
                            <input 
                                v-model.number="templateFormData.base_points" 
                                required 
                                type="number" 
                                :min="selectedTemplate.base_points_range.min" 
                                :max="selectedTemplate.base_points_range.max"
                                class="input-field" 
                            />
                        </div>

                         <!-- Neighborhood -->
                         <div class="form-group">
                            <label>Quartiere (Opzionale)</label>
                            <select v-model="templateFormData.neighborhood_id" class="input-field">
                                <option value="">-- Nessun quartiere specifico --</option>
                                <option v-for="n in neighborhoods" :key="n._id" :value="n._id">
                                    {{ n.name }}
                                </option>
                            </select>
                        </div>

                         <!-- DYNAMIC FIELDS FROM TEMPLATE CONFIG -->
                         <div v-if="selectedTemplate.configurable_fields && selectedTemplate.configurable_fields.length > 0" class="span-2 dynamic-section">
                            <h4 class="dynamic-title">Parametri Specifici del Modello</h4>
                            <div class="dynamic-grid">
                                <div v-for="field in selectedTemplate.configurable_fields" :key="field.field_name" class="form-group">
                                    <label>
                                        {{ field.description || field.field_name }} 
                                        <span v-if="field.required">*</span>
                                    </label>
                                    
                                    <!-- Number Input -->
                                    <input 
                                        v-if="field.field_type === 'number'"
                                        v-model.number="templateFormData[field.field_name]"
                                        :required="field.required"
                                        type="number"
                                        :min="field.validation?.min"
                                        :max="field.validation?.max"
                                        class="input-field" 
                                    />
                                    
                                    <!-- Boolean Input (Checkbox) -->
                                    <div v-else-if="field.field_type === 'boolean'" class="checkbox-wrapper">
                                         <input 
                                            type="checkbox" 
                                            v-model="templateFormData[field.field_name]"
                                            :id="field.field_name"
                                        />
                                        <label :for="field.field_name" class="checkbox-label">Abilita</label>
                                    </div>

                                     <!-- Default Text Input -->
                                     <input 
                                        v-else
                                        v-model="templateFormData[field.field_name]"
                                        :required="field.required"
                                        type="text"
                                        class="input-field" 
                                    />
                                </div>
                            </div>
                         </div>
                    </div>
                
                </div>

                <div class="form-actions" v-if="selectedTemplate">
                    <button type="submit" class="btn-submit" :disabled="loading">
                        <span v-if="loading" class="spinner-sm"></span>
                        <span v-else>Crea da Modello</span>
                    </button>
                </div>
            </form>

            <!-- SHARED MESSAGES -->
            <div v-if="error" class="message error-message mt-4">⚠️ {{ error }}</div>
            <div v-if="successMessage" class="message success-message mt-4">✅ {{ successMessage }}</div>

        </div>
    </div>
  </div>
</template>

<style scoped>
/* Stili Condivisi */
:root {
  --primary-green: #2d6a4f;
  --secondary-green: #40916c;
  --white: #ffffff;
  --text-dark: #1b4332;
  --text-light: #6c757d;
  --border-color: #e2e8f0;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
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

.navbar-brand { font-size: 1.5rem; font-weight: 700; color: var(--primary-green); }
.navbar-links { display: flex; gap: 2rem; list-style: none; margin: 0; padding: 0; }
.nav-link { text-decoration: none; color: var(--text-light); font-weight: 500; transition: all 0.2s ease; padding-bottom: 2px; border-bottom: 2px solid transparent; }
.nav-link:hover, .nav-link.active { color: var(--primary-green); font-weight: 600; border-bottom-color: var(--secondary-green); }

/* Header */
.header-section { margin-bottom: 2rem; }
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
  left: 0; top: 50%; transform: translateY(-50%);
  height: 24px; width: 4px; background-color: #52b788; border-radius: 2px;
}

/* Tabs */
.tabs-container {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
}

.tab-btn {
    background: transparent;
    border: 2px solid #e2e8f0;
    padding: 0.75rem 1.5rem;
    border-radius: 30px;
    font-weight: 600;
    color: #6c757d;
    cursor: pointer;
    transition: all 0.2s;
}

.tab-btn.active {
    background: #2d6a4f;
    color: white;
    border-color: #2d6a4f;
    box-shadow: 0 4px 6px rgba(45, 106, 79, 0.2);
}

.tab-btn:hover:not(.active) {
    background: #f1f5f9;
    color: #1b4332;
}

/* Form Styles */
.content-container {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.form-card {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    width: 100%;
    max-width: 800px;
    border: 1px solid rgba(0, 0, 0, 0.02);
}

.form-header-note {
    text-align: center;
    color: #64748b;
    margin-bottom: 2rem;
    font-size: 0.95rem;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

/* Dynamic Template Fields */
.template-fields-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1rem;
    border-top: 1px solid #f1f5f9;
    padding-top: 1.5rem;
}
.dynamic-section {
    background-color: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
}
.dynamic-title {
    margin: 0 0 1rem 0;
    color: #475569;
    font-size: 1rem;
    font-weight: 600;
    grid-column: span 2;
}
.dynamic-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.span-2 { grid-column: span 2; }

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-weight: 600;
    color: #1b4332;
    font-size: 0.95rem;
}

.input-field {
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    color: #334155;
    transition: border-color 0.2s, box-shadow 0.2s;
    background-color: #f8fafc;
}

.input-field:focus {
    outline: none;
    border-color: #40916c;
    box-shadow: 0 0 0 3px rgba(64, 145, 108, 0.1);
    background-color: white;
}

textarea.input-field {
    resize: vertical;
}

.checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
}
.checkbox-label {
    margin: 0;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
}

.form-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.btn-submit {
    background-color: #2d6a4f;
    color: white;
    font-weight: 600;
    padding: 0.85rem 2.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-submit:hover {
    background-color: #1b4332;
}

.btn-submit:active {
    transform: translateY(1px);
}

.btn-submit:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}

.message {
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 500;
    width: 100%;
    text-align: center;
}

.mt-4 { margin-top: 1.5rem; }

.error-message {
    background-color: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fecaca;
}

.success-message {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    .dashboard-wrapper {
        width: 100%;
        padding: 1rem;
    }
    .form-grid, .template-fields-wrapper, .dynamic-grid {
        grid-template-columns: 1fr;
    }
    .span-2 { grid-column: span 1; }
    .dashboard-navbar { flex-direction: column; gap: 1rem; }
    .navbar-links { flex-wrap: wrap; justify-content: center; }
}
</style>