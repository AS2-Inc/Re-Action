<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import apiService from "@/services/api.js";

const router = useRouter();
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// TABS
const _currentTab = ref("scratch"); // 'scratch' | 'template'

// COMMON STATE
const loading = ref(false);
const error = ref(null);
const successMessage = ref("");
const neighborhoods = ref([]);

// Quiz state
const quizzes = ref([]);
const quizzesLoading = ref(false);
const quizzesError = ref(null);
const showQuizCreator = ref(false);
const quizForm = ref({
  title: "",
  description: "",
  passing_score: 80,
  questions: [
    {
      text: "",
      options_text: "",
      correct_option_index: 0,
    },
  ],
});

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
  is_active: true,
  verification_setup: {
    qr_code_secret: "",
    photo_description: "",
    target_lat: "",
    target_lng: "",
    min_distance_meters: "",
    quiz_id: "",
  },
});

// --- CREATE FROM TEMPLATE STATE ---
const templates = ref([]);
const selectedTemplateId = ref("");
const templateFormData = ref({
  title: "",
  description: "",
  base_points: 0,
  neighborhood_id: "",
  is_active: true,
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
  if (!apiService.isAuthenticated()) return;

  try {
    const data = await apiService.get("/api/v1/tasks/templates");
    templates.value = Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("Error fetching templates config", err);
  }
};

const fetchQuizzes = async () => {
  if (!apiService.isAuthenticated()) return;

  quizzesLoading.value = true;
  quizzesError.value = null;

  try {
    const data = await apiService.get("/api/v1/quizzes");
    quizzes.value = Array.isArray(data) ? data : [];
  } catch (err) {
    quizzesError.value = err.message || "Impossibile caricare i quiz.";
  } finally {
    quizzesLoading.value = false;
  }
};

const resetQuizForm = () => {
  quizForm.value = {
    title: "",
    description: "",
    passing_score: 80,
    questions: [
      {
        text: "",
        options_text: "",
        correct_option_index: 0,
      },
    ],
  };
};

const _addQuizQuestion = () => {
  quizForm.value.questions.push({
    text: "",
    options_text: "",
    correct_option_index: 0,
  });
};

const _removeQuizQuestion = (index) => {
  quizForm.value.questions.splice(index, 1);
};

const _createQuiz = async () => {
  if (!apiService.isAuthenticated()) return;

  if (!quizForm.value.title.trim()) {
    error.value = "Inserisci un titolo per il quiz.";
    return;
  }

  const questions = quizForm.value.questions
    .map((question) => {
      const options = question.options_text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        text: question.text.trim(),
        options,
        correct_option_index: Number(question.correct_option_index),
      };
    })
    .filter((question) => question.text && question.options.length > 0);

  if (questions.length === 0) {
    error.value = "Inserisci almeno una domanda valida.";
    return;
  }

  const payload = {
    title: quizForm.value.title.trim(),
    description: quizForm.value.description?.trim() || "",
    passing_score: Number(quizForm.value.passing_score || 0),
    questions,
  };

  loading.value = true;
  error.value = null;

  try {
    const created = await apiService.post("/api/v1/quizzes", payload);

    await fetchQuizzes();
    formData.value.verification_setup.quiz_id = created._id;
    showQuizCreator.value = false;
    resetQuizForm();
  } catch (err) {
    error.value = err.message || "Errore durante la creazione del quiz.";
  } finally {
    loading.value = false;
  }
};

const _handleTemplateChange = () => {
  if (!selectedTemplate.value) return;

  // Reset specific form data
  const t = selectedTemplate.value;
  templateFormData.value = {
    title: t.example_title || t.name,
    description: t.example_description || t.description,
    base_points: t.base_points_range ? t.base_points_range.min : 10,
    neighborhood_id: "",
    is_active: true,
  };

  if (t.impact_metrics_schema?.co2_saved) {
    templateFormData.value.co2_saved = 0;
  }
  if (t.impact_metrics_schema?.waste_recycled) {
    templateFormData.value.waste_recycled = 0;
  }
  if (t.impact_metrics_schema?.km_green) {
    templateFormData.value.km_green = 0;
  }

  // Initialize configurable fields with defaults
  if (t.configurable_fields) {
    t.configurable_fields.forEach((field) => {
      templateFormData.value[field.field_name] = field.default_value;
    });
  }
};

const _createTask = async () => {
  loading.value = true;
  error.value = null;
  successMessage.value = "";

  if (!apiService.isAuthenticated()) {
    router.push("/login");
    return;
  }

  try {
    const verificationCriteria = {};
    const verificationSetup = formData.value.verification_setup || {};
    const method = formData.value.verification_method;

    if (method === "QR_SCAN") {
      const secret = verificationSetup.qr_code_secret?.trim();
      if (!secret) {
        throw new Error("Inserisci il QR secret per la verifica.");
      }
      verificationCriteria.qr_code_secret = secret;
    }

    if (method === "PHOTO_UPLOAD") {
      const photoDescription = verificationSetup.photo_description?.trim();
      if (!photoDescription) {
        throw new Error("Inserisci la descrizione della foto richiesta.");
      }
      verificationCriteria.photo_description = photoDescription;
    }

    if (method === "GPS") {
      const targetLat = Number(verificationSetup.target_lat);
      const targetLng = Number(verificationSetup.target_lng);
      const minDistance = Number(verificationSetup.min_distance_meters);
      if (Number.isNaN(targetLat) || Number.isNaN(targetLng)) {
        throw new Error("Inserisci una posizione target valida.");
      }
      if (Number.isNaN(minDistance) || minDistance <= 0) {
        throw new Error("Inserisci una distanza minima valida.");
      }
      verificationCriteria.target_location = [targetLat, targetLng];
      verificationCriteria.min_distance_meters = minDistance;
    }

    if (method === "QUIZ") {
      const quizId = verificationSetup.quiz_id?.trim();
      if (!quizId) {
        throw new Error("Seleziona o crea un quiz.");
      }
      verificationCriteria.quiz_id = quizId;
    }

    const payload = {
      title: formData.value.title,
      description: formData.value.description,
      category: formData.value.category,
      difficulty: formData.value.difficulty,
      frequency: formData.value.frequency,
      verification_method: formData.value.verification_method,
      base_points: formData.value.points,
      neighborhood_id: formData.value.neighborhood_id,
      is_active: formData.value.is_active,
      verification_criteria:
        Object.keys(verificationCriteria).length > 0
          ? verificationCriteria
          : undefined,
    };

    // Remove empty neighborhood_id and optional verification_criteria
    if (!payload.neighborhood_id) delete payload.neighborhood_id;
    if (payload.is_active === undefined) delete payload.is_active;
    if (!payload.verification_criteria) delete payload.verification_criteria;

    await apiService.post("/api/v1/tasks/create", payload, {
      autoRedirect: true,
      router,
      authType: "operator",
    });

    successMessage.value = "Task creato con successo!";
    setTimeout(() => router.push("/taskTemplates"), 1500);
  } catch (err) {
    error.value = err.message || "Errore durante la creazione del task.";
  } finally {
    loading.value = false;
  }
};

const _createTaskFromTemplate = async () => {
  if (!selectedTemplateId.value) return;

  loading.value = true;
  error.value = null;
  successMessage.value = "";

  if (!apiService.isAuthenticated()) {
    router.push("/login");
    return;
  }

  try {
    const payload = {
      template_id: selectedTemplateId.value,
      ...templateFormData.value,
    };

    if (!payload.neighborhood_id) delete payload.neighborhood_id;
    if (payload.is_active === undefined) delete payload.is_active;

    await apiService.post("/api/v1/tasks/from-template", payload, {
      autoRedirect: true,
      router,
      authType: "operator",
    });

    successMessage.value = "Task da modello creato con successo!";
    setTimeout(() => router.push("/taskTemplates"), 1500);
  } catch (err) {
    error.value = err.message || "Errore creazione task da modello.";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTemplates();
  fetchNeighborhoods();
  fetchQuizzes();
});
</script>

<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><router-link to="/operatorDashboard" class="nav-link">Home</router-link></li>
        <li><router-link to="/reportsList" class="nav-link">Lista Report</router-link></li>
        <li><router-link to="/taskTemplates" class="nav-link">Task attive</router-link></li>
        <li><router-link to="/_createTask" class="nav-link active">Crea Task</router-link></li>
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
                :class="{ active: _currentTab === 'scratch' }"
                @click="_currentTab = 'scratch'"
            >
                Crea da Zero
            </button>
            <button 
                class="tab-btn" 
                :class="{ active: _currentTab === 'template' }"
                @click="_currentTab = 'template'"
            >
                Usa un Modello
            </button>
        </div>

        <div class="form-card">
            
            <!-- FORM: CREATE FROM SCRATCH -->
            <form v-if="_currentTab === 'scratch'" @submit.prevent="_createTask">
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
                        <option value="onetime">Una Tantum</option>
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
                        </select>
                    </div>

                    <div
                      v-if="formData.verification_method === 'QR_SCAN'"
                      class="form-group span-2 verification-panel"
                    >
                      <label>QR Secret</label>
                      <input
                        v-model="formData.verification_setup.qr_code_secret"
                        type="text"
                        class="input-field"
                        placeholder="Inserisci il codice segreto del QR"
                      />
                      <p class="helper-text">
                        Il codice deve combaciare con il QR scannerizzato.
                      </p>
                    </div>

                    <div
                      v-if="formData.verification_method === 'PHOTO_UPLOAD'"
                      class="form-group span-2 verification-panel"
                    >
                      <label>Descrizione Foto</label>
                      <textarea
                        v-model="formData.verification_setup.photo_description"
                        class="input-field"
                        rows="2"
                        placeholder="Descrivi cosa deve mostrare la foto"
                      ></textarea>
                      <p class="helper-text">
                        Fornisci indicazioni chiare per la verifica manuale.
                      </p>
                    </div>

                    <div
                      v-if="formData.verification_method === 'GPS'"
                      class="form-group span-2 verification-panel"
                    >
                      <label>Verifica GPS</label>
                      <div class="verification-grid">
                        <div class="form-group">
                          <label>Latitudine</label>
                          <input
                            v-model="formData.verification_setup.target_lat"
                            type="number"
                            step="any"
                            class="input-field"
                            placeholder="Es. 41.9028"
                          />
                        </div>
                        <div class="form-group">
                          <label>Longitudine</label>
                          <input
                            v-model="formData.verification_setup.target_lng"
                            type="number"
                            step="any"
                            class="input-field"
                            placeholder="Es. 12.4964"
                          />
                        </div>
                        <div class="form-group">
                          <label>Distanza massima (m)</label>
                          <input
                            v-model="formData.verification_setup.min_distance_meters"
                            type="number"
                            min="1"
                            class="input-field"
                            placeholder="100"
                          />
                        </div>
                      </div>
                      <p class="helper-text">
                        Imposta il punto target e la distanza massima consentita.
                      </p>
                    </div>

                    <div
                      v-if="formData.verification_method === 'QUIZ'"
                      class="form-group span-2 verification-panel"
                    >
                      <label>Seleziona Quiz</label>
                      <select
                        v-model="formData.verification_setup.quiz_id"
                        class="input-field"
                      >
                        <option value="">-- Seleziona quiz --</option>
                        <option v-for="quiz in quizzes" :key="quiz._id" :value="quiz._id">
                          {{ quiz.title }}
                        </option>
                      </select>
                      <div class="inline-actions">
                        <button class="btn-submit" type="button" @click="showQuizCreator = !showQuizCreator">
                          {{ showQuizCreator ? 'Chiudi creazione quiz' : 'Crea nuovo quiz' }}
                        </button>
                      </div>
                      <p v-if="quizzesLoading" class="helper-text">Caricamento quiz...</p>
                      <p v-else-if="quizzesError" class="helper-text">{{ quizzesError }}</p>

                      <div v-if="showQuizCreator" class="quiz-creator">
                        <div class="form-grid">
                          <div class="form-group span-2">
                            <label>Titolo Quiz</label>
                            <input v-model="quizForm.title" type="text" class="input-field" />
                          </div>
                          <div class="form-group span-2">
                            <label>Descrizione Quiz</label>
                            <textarea
                              v-model="quizForm.description"
                              class="input-field"
                              rows="2"
                            ></textarea>
                          </div>
                          <div class="form-group">
                            <label>Soglia Superamento (%)</label>
                            <input
                              v-model.number="quizForm.passing_score"
                              type="number"
                              min="1"
                              max="100"
                              class="input-field"
                            />
                          </div>
                        </div>

                        <div class="quiz-questions">
                          <div class="quiz-questions-header">
                            <h4>Domande</h4>
                            <button class="btn-submit" type="button" @click="_addQuizQuestion">
                              + Aggiungi domanda
                            </button>
                          </div>

                          <div
                            v-for="(question, index) in quizForm.questions"
                            :key="index"
                            class="quiz-question-card"
                          >
                            <div class="form-grid">
                              <div class="form-group span-2">
                                <label>Testo Domanda</label>
                                <input v-model="question.text" type="text" class="input-field" />
                              </div>
                              <div class="form-group span-2">
                                <label>Opzioni (separate da virgola)</label>
                                <input
                                  v-model="question.options_text"
                                  type="text"
                                  class="input-field"
                                />
                              </div>
                              <div class="form-group">
                                <label>Indice Risposta Corretta</label>
                                <input
                                  v-model.number="question.correct_option_index"
                                  type="number"
                                  min="0"
                                  class="input-field"
                                />
                              </div>
                            </div>
                            <div class="inline-actions">
                              <button class="btn-submit" type="button" @click="_removeQuizQuestion(index)">
                                Rimuovi domanda
                              </button>
                            </div>
                          </div>
                        </div>

                        <div class="inline-actions">
                          <button class="btn-submit" type="button" @click="_createQuiz">
                            Salva quiz
                          </button>
                        </div>
                      </div>
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

                    <div class="form-group span-2">
                      <label class="checkbox-label">
                        <input type="checkbox" v-model="formData.is_active" />
                        Task attivo
                      </label>
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
            <form v-else @submit.prevent="_createTaskFromTemplate">
                <div class="form-header-note">Scegli un modello predefinito per configurare rapidamente il task.</div>

                <div class="form-grid">
                    <!-- Template Selector -->
                    <div class="form-group span-2">
                        <label>Seleziona Modello</label>
                        <select v-model="selectedTemplateId" @change="_handleTemplateChange" class="input-field" required>
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

                        <div class="form-group span-2">
                          <label class="checkbox-label">
                            <input type="checkbox" v-model="templateFormData.is_active" />
                            Task attivo
                          </label>
                        </div>

                        <div
                          v-if="selectedTemplate.impact_metrics_schema?.co2_saved"
                          class="form-group"
                        >
                          <label>CO2 Risparmiata (kg)</label>
                          <input
                            v-model.number="templateFormData.co2_saved"
                            type="number"
                            min="0"
                            step="0.1"
                            class="input-field"
                          />
                        </div>

                        <div
                          v-if="selectedTemplate.impact_metrics_schema?.waste_recycled"
                          class="form-group"
                        >
                          <label>Rifiuti Riciclati (kg)</label>
                          <input
                            v-model.number="templateFormData.waste_recycled"
                            type="number"
                            min="0"
                            step="0.1"
                            class="input-field"
                          />
                        </div>

                        <div
                          v-if="selectedTemplate.impact_metrics_schema?.km_green"
                          class="form-group"
                        >
                          <label>Km Green</label>
                          <input
                            v-model.number="templateFormData.km_green"
                            type="number"
                            min="0"
                            step="0.1"
                            class="input-field"
                          />
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

.verification-panel {
  background-color: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 1rem;
}

.verification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
}

.helper-text {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.inline-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 0.75rem;
}

.quiz-creator {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.quiz-questions {
  margin-top: 1rem;
}

.quiz-questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.quiz-question-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background: #f9fafb;
  margin-bottom: 1rem;
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