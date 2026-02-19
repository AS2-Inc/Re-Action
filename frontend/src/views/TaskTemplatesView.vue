<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// Stato del componente
const templates = ref([]);
const loading = ref(true);
const error = ref(null);

// Task Template Modal state
const showTemplateModal = ref(false);
const templateModalMode = ref("create");
const editingTemplate = ref(null);
const templateModalLoading = ref(false);
const templateModalError = ref(null);

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

const defaultTemplateForm = () => ({
  name: "",
  description: "",
  category: "Mobility",
  verification_method: "GPS",
  default_difficulty: "Medium",
  default_frequency: "daily",
  base_points_range: { min: 5, max: 100 },
  impact_metrics_schema: {
    co2_saved: false,
    waste_recycled: false,
    km_green: false,
  },
  verification_setup: {
    qr_code_secret: "",
    photo_description: "",
    target_lat: "",
    target_lng: "",
    min_distance_meters: "",
    quiz_id: "",
  },
  configurable_fields: [],
  example_title: "",
  example_description: "",
  is_active: true,
});

const normalizeTemplateForEdit = (template) => {
  const clone = JSON.parse(JSON.stringify(template || {}));
  clone.base_points_range = clone.base_points_range || { min: 5, max: 100 };
  clone.impact_metrics_schema = clone.impact_metrics_schema || {
    co2_saved: false,
    waste_recycled: false,
    km_green: false,
  };
  clone.configurable_fields = (clone.configurable_fields || []).map((field) => {
    const validation = field.validation || {};
    return {
      field_name: field.field_name || "",
      field_type: field.field_type || "string",
      description: field.description || "",
      required: !!field.required,
      default_value:
        field.default_value !== undefined && field.default_value !== null
          ? field.default_value
          : "",
      validation: {
        min: validation.min ?? "",
        max: validation.max ?? "",
        pattern: validation.pattern || "",
        options_text: (validation.options || []).join(", "),
      },
    };
  });
  const qrField = clone.configurable_fields.find(
    (field) => field.field_name === "qr_code_secret",
  );
  const photoField = clone.configurable_fields.find(
    (field) => field.field_name === "photo_description",
  );
  const minDistanceField = clone.configurable_fields.find(
    (field) => field.field_name === "min_distance_meters",
  );
  const targetLocationField = clone.configurable_fields.find(
    (field) => field.field_name === "target_location",
  );
  const quizField = clone.configurable_fields.find(
    (field) => field.field_name === "quiz_id",
  );
  clone.verification_setup = {
    qr_code_secret: qrField?.default_value ?? "",
    photo_description: photoField?.default_value ?? "",
    target_lat: Array.isArray(targetLocationField?.default_value)
      ? targetLocationField.default_value[0]
      : "",
    target_lng: Array.isArray(targetLocationField?.default_value)
      ? targetLocationField.default_value[1]
      : "",
    min_distance_meters: minDistanceField?.default_value ?? "",
    quiz_id: quizField?.default_value ?? "",
  };
  clone.is_active = clone.is_active !== false;
  return clone;
};

const coerceFieldValue = (fieldType, value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (fieldType === "number") {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  }
  if (fieldType === "boolean") {
    if (value === true || value === false) return value;
    return value === "true";
  }
  if (fieldType === "array") {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (fieldType === "location") {
    const parts = String(value)
      .split(",")
      .map((item) => Number(item.trim()));
    if (parts.length === 2 && parts.every((item) => !Number.isNaN(item))) {
      return parts;
    }
    return undefined;
  }
  return String(value);
};

const buildTemplatePayload = (template) => {
  const baseMin = Number(template.base_points_range?.min ?? 0);
  const baseMax = Number(template.base_points_range?.max ?? 0);

  const upsertField = (fields, payload) => {
    const index = fields.findIndex(
      (field) => field.field_name === payload.field_name,
    );
    if (index >= 0) {
      fields[index] = payload;
    } else {
      fields.push(payload);
    }
    return fields;
  };

  const removeField = (fields, fieldName) =>
    fields.filter((field) => field.field_name !== fieldName);

  const configurable_fields = (template.configurable_fields || [])
    .map((field) => {
      if (!field.field_name) return null;
      const payload = {
        field_name: field.field_name.trim(),
        field_type: field.field_type,
        description: field.description || "",
        required: !!field.required,
      };

      const defaultValue = coerceFieldValue(
        field.field_type,
        field.default_value,
      );
      if (defaultValue !== undefined) payload.default_value = defaultValue;

      const validation = {};
      if (field.validation?.min !== "" && field.validation?.min !== undefined) {
        const min = Number(field.validation.min);
        if (!Number.isNaN(min)) validation.min = min;
      }
      if (field.validation?.max !== "" && field.validation?.max !== undefined) {
        const max = Number(field.validation.max);
        if (!Number.isNaN(max)) validation.max = max;
      }
      if (field.validation?.pattern) {
        validation.pattern = field.validation.pattern;
      }
      if (field.validation?.options_text) {
        const options = field.validation.options_text
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        if (options.length > 0) validation.options = options;
      }
      if (Object.keys(validation).length > 0) payload.validation = validation;

      return payload;
    })
    .filter(Boolean);

  const verificationSetup = template.verification_setup || {};
  let normalizedFields = [...configurable_fields];

  if (template.verification_method === "QR_SCAN") {
    const qrSecret = verificationSetup.qr_code_secret?.trim();
    const qrPayload = {
      field_name: "qr_code_secret",
      field_type: "string",
      description: "QR secret code for validation",
      required: true,
    };
    if (qrSecret) qrPayload.default_value = qrSecret;
    normalizedFields = upsertField(normalizedFields, qrPayload);
  } else {
    normalizedFields = removeField(normalizedFields, "qr_code_secret");
  }

  if (template.verification_method === "PHOTO_UPLOAD") {
    const photoDescription = verificationSetup.photo_description?.trim();
    const photoPayload = {
      field_name: "photo_description",
      field_type: "string",
      description: "Photo instructions for verification",
      required: true,
    };
    if (photoDescription) photoPayload.default_value = photoDescription;
    normalizedFields = upsertField(normalizedFields, photoPayload);
  } else {
    normalizedFields = removeField(normalizedFields, "photo_description");
  }

  if (template.verification_method === "GPS") {
    const minDistance = Number(verificationSetup.min_distance_meters);
    const targetLat = Number(verificationSetup.target_lat);
    const targetLng = Number(verificationSetup.target_lng);
    const minDistancePayload = {
      field_name: "min_distance_meters",
      field_type: "number",
      description: "Minimum distance in meters",
      required: true,
    };
    if (!Number.isNaN(minDistance)) {
      minDistancePayload.default_value = minDistance;
    }
    normalizedFields = upsertField(normalizedFields, minDistancePayload);

    const locationPayload = {
      field_name: "target_location",
      field_type: "location",
      description: "Target GPS location [lat, lng]",
      required: true,
    };
    if (!Number.isNaN(targetLat) && !Number.isNaN(targetLng)) {
      locationPayload.default_value = [targetLat, targetLng];
    }
    normalizedFields = upsertField(normalizedFields, locationPayload);
  } else {
    normalizedFields = removeField(normalizedFields, "min_distance_meters");
    normalizedFields = removeField(normalizedFields, "target_location");
  }

  if (template.verification_method === "QUIZ") {
    const quizId = verificationSetup.quiz_id?.trim();
    const quizPayload = {
      field_name: "quiz_id",
      field_type: "string",
      description: "Quiz ID for verification",
      required: true,
    };
    if (quizId) quizPayload.default_value = quizId;
    normalizedFields = upsertField(normalizedFields, quizPayload);
  } else {
    normalizedFields = removeField(normalizedFields, "quiz_id");
  }

  return {
    name: template.name?.trim(),
    description: template.description?.trim(),
    category: template.category,
    verification_method: template.verification_method,
    default_difficulty: template.default_difficulty,
    default_frequency: template.default_frequency,
    base_points_range: {
      min: Number.isNaN(baseMin) ? 0 : baseMin,
      max: Number.isNaN(baseMax) ? 0 : baseMax,
    },
    impact_metrics_schema: {
      co2_saved: !!template.impact_metrics_schema?.co2_saved,
      waste_recycled: !!template.impact_metrics_schema?.waste_recycled,
      km_green: !!template.impact_metrics_schema?.km_green,
    },
    configurable_fields: normalizedFields,
    example_title: template.example_title || "",
    example_description: template.example_description || "",
    is_active: template.is_active !== false,
  };
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

const fetchQuizzes = async () => {
  quizzesLoading.value = true;
  quizzesError.value = null;

  const token = localStorage.getItem("token");
  if (!token) {
    quizzesLoading.value = false;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/quizzes`, {
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
    });

    if (!response.ok) {
      throw new Error("Impossibile caricare i quiz.");
    }

    const data = await response.json();
    quizzes.value = Array.isArray(data) ? data : [];
  } catch (err) {
    quizzesError.value = err.message || "Impossibile caricare i quiz.";
  } finally {
    quizzesLoading.value = false;
  }
};

const addQuizQuestion = () => {
  quizForm.value.questions.push({
    text: "",
    options_text: "",
    correct_option_index: 0,
  });
};

const removeQuizQuestion = (index) => {
  quizForm.value.questions.splice(index, 1);
};

const createQuiz = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  if (!quizForm.value.title.trim()) {
    templateModalError.value = "Inserisci un titolo per il quiz.";
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
    templateModalError.value = "Inserisci almeno una domanda valida.";
    return;
  }

  const payload = {
    title: quizForm.value.title.trim(),
    description: quizForm.value.description?.trim() || "",
    passing_score: Number(quizForm.value.passing_score || 0),
    questions,
  };

  templateModalLoading.value = true;
  templateModalError.value = null;

  try {
    const response = await fetch(`${API_BASE}/api/v1/quizzes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Errore durante la creazione del quiz.");
    }

    const created = await response.json();
    await fetchQuizzes();
    if (editingTemplate.value?.verification_setup) {
      editingTemplate.value.verification_setup.quiz_id = created._id;
    }
    showQuizCreator.value = false;
    resetQuizForm();
  } catch (err) {
    templateModalError.value =
      err.message || "Errore durante la creazione del quiz.";
  } finally {
    templateModalLoading.value = false;
  }
};

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
    const response = await fetch(
      `${API_BASE}/api/v1/tasks/templates?active_only=false`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      },
    );

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

const openCreateTemplate = () => {
  templateModalMode.value = "create";
  editingTemplate.value = defaultTemplateForm();
  templateModalError.value = null;
  showQuizCreator.value = false;
  resetQuizForm();
  showTemplateModal.value = true;
};

const openEditTemplate = (template) => {
  templateModalMode.value = "edit";
  editingTemplate.value = normalizeTemplateForEdit(template);
  templateModalError.value = null;
  showQuizCreator.value = false;
  resetQuizForm();
  showTemplateModal.value = true;
};

const closeTemplateModal = () => {
  showTemplateModal.value = false;
  editingTemplate.value = null;
  templateModalError.value = null;
};

const addConfigurableField = () => {
  if (!editingTemplate.value) return;
  editingTemplate.value.configurable_fields.push({
    field_name: "",
    field_type: "string",
    description: "",
    required: false,
    default_value: "",
    validation: {
      min: "",
      max: "",
      pattern: "",
      options_text: "",
    },
  });
};

const removeConfigurableField = (index) => {
  if (!editingTemplate.value) return;
  editingTemplate.value.configurable_fields.splice(index, 1);
};

const saveTemplate = async () => {
  if (!editingTemplate.value) return;
  const token = localStorage.getItem("token");
  if (!token) return;

  if (!editingTemplate.value.name || !editingTemplate.value.description) {
    templateModalError.value = "Nome e descrizione sono obbligatori.";
    return;
  }

  const verificationMethod = editingTemplate.value.verification_method;
  const verificationSetup = editingTemplate.value.verification_setup || {};
  if (
    verificationMethod === "QR_SCAN" &&
    !verificationSetup.qr_code_secret?.trim()
  ) {
    templateModalError.value = "Inserisci il QR secret per la verifica.";
    return;
  }
  if (
    verificationMethod === "PHOTO_UPLOAD" &&
    !verificationSetup.photo_description?.trim()
  ) {
    templateModalError.value =
      "Inserisci una descrizione della foto richiesta.";
    return;
  }
  if (verificationMethod === "GPS") {
    const targetLat = Number(verificationSetup.target_lat);
    const targetLng = Number(verificationSetup.target_lng);
    const minDistance = Number(verificationSetup.min_distance_meters);
    if (Number.isNaN(targetLat) || Number.isNaN(targetLng)) {
      templateModalError.value = "Inserisci una posizione target valida.";
      return;
    }
    if (Number.isNaN(minDistance) || minDistance <= 0) {
      templateModalError.value = "Inserisci una distanza minima valida.";
      return;
    }
  }
  if (verificationMethod === "QUIZ" && !verificationSetup.quiz_id?.trim()) {
    templateModalError.value = "Seleziona o crea un quiz.";
    return;
  }

  templateModalLoading.value = true;
  templateModalError.value = null;

  try {
    const payload = buildTemplatePayload(editingTemplate.value);
    const endpoint =
      templateModalMode.value === "edit"
        ? `${API_BASE}/api/v1/tasks/templates/${editingTemplate.value._id}`
        : `${API_BASE}/api/v1/tasks/templates`;
    const method = templateModalMode.value === "edit" ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Errore durante il salvataggio.");
    }

    closeTemplateModal();
    await fetchTemplates();
  } catch (err) {
    templateModalError.value = err.message || "Errore durante il salvataggio.";
  } finally {
    templateModalLoading.value = false;
  }
};

const deleteTemplate = async (template) => {
  if (!template?._id) return;
  const proceed = confirm(
    `Vuoi davvero eliminare il modello "${template.name}"?`,
  );
  if (!proceed) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  templateModalLoading.value = true;
  templateModalError.value = null;

  try {
    const response = await fetch(
      `${API_BASE}/api/v1/tasks/templates/${template._id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Errore durante l'eliminazione.");
    }

    closeTemplateModal();
    await fetchTemplates();
  } catch (err) {
    templateModalError.value = err.message || "Errore durante l'eliminazione.";
  } finally {
    templateModalLoading.value = false;
  }
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

  if (!clone.neighborhood_id_value && clone.neighborhood_name) {
    const match = neighborhoods.value.find(
      (n) => n.name === clone.neighborhood_name,
    );
    clone.neighborhood_id_value = match?._id || "";
  }
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
        <li><router-link to="/taskTemplates" class="nav-link active">Task Attive</router-link></li>
        <li><router-link to="/createTask" class="nav-link">Crea Task</router-link></li>
        <li><router-link to="/operatorRewards" class="nav-link">Premi</router-link></li>
      </ul>
    </nav>

    <div class="header-section">
      <div class="header-left">
        <h1 class="page-title">Gestione Modelli</h1>
        <p class="page-subtitle">Crea, modifica e gestisci i task template.</p>
      </div>

      <div class="header-actions">
        <div class="tabs-container">
          <button
            :class="['tab-btn', { active: currentTab === 'active' }]"
            @click="currentTab = 'active'"
          >
            🟢 Attivi
          </button>
          <button
            :class="['tab-btn', { active: currentTab === 'archived' }]"
            @click="currentTab = 'archived'"
          >
            📦 Archiviati
          </button>
          <button
            :class="['tab-btn', { active: currentTab === 'all' }]"
            @click="currentTab = 'all'"
          >
            📋 Tutti
          </button>
        </div>

        <button class="btn-create" @click="openCreateTemplate">
          + Nuovo Modello
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
          <button @click="openEditTemplate(tpl)" class="btn-action btn-update">
            Modifica
          </button>
          <button @click="deleteTemplate(tpl)" class="btn-action btn-delete">
            Elimina
          </button>
        </div>
      </div>
    </div>

    <div v-if="!loading && _filteredTemplates.length === 0" class="empty-state">
        <p>Nessun modello trovato in questa categoria.</p>
    </div>

    <Teleport to="body">
      <div
        v-if="showTemplateModal"
        class="modal-overlay"
        @click.self="closeTemplateModal"
      >
        <div class="modal-card template-modal-card">
          <button class="close-btn" @click="closeTemplateModal">×</button>

          <div v-if="templateModalLoading" class="modal-loading">
            <div class="spinner"></div>
            <p>Elaborazione...</p>
          </div>

          <div v-else-if="editingTemplate" class="modal-body-content">
            <header class="modal-header">
              <h2>
                {{ templateModalMode === "edit" ? "Modifica Template" : "Nuovo Template" }}
              </h2>
              <span
                v-if="templateModalMode === 'edit'"
                :class="['status-badge', editingTemplate.is_active ? 'active' : 'inactive']"
              >
                {{ editingTemplate.is_active ? 'Attivo' : 'Inattivo' }}
              </span>
            </header>

            <div v-if="templateModalError" class="modal-error">
              ⚠️ {{ templateModalError }}
            </div>

            <div class="form-grid">
              <div class="form-group full-width">
                <label>Nome</label>
                <input v-model="editingTemplate.name" type="text" class="form-input" />
              </div>

              <div class="form-group full-width">
                <label>Descrizione</label>
                <textarea
                  v-model="editingTemplate.description"
                  class="form-input form-textarea"
                  rows="3"
                ></textarea>
              </div>

              <div class="form-group">
                <label>Categoria</label>
                <select v-model="editingTemplate.category" class="form-input">
                  <option value="Mobility">Mobility</option>
                  <option value="Waste">Waste</option>
                  <option value="Community">Community</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div class="form-group">
                <label>Metodo Verifica</label>
                <select
                  v-model="editingTemplate.verification_method"
                  class="form-input"
                >
                  <option value="GPS">GPS</option>
                  <option value="QR_SCAN">QR Scan</option>
                  <option value="PHOTO_UPLOAD">Photo Upload</option>
                  <option value="QUIZ">Quiz</option>
                </select>
              </div>

              <div
                v-if="editingTemplate.verification_method === 'QR_SCAN'"
                class="form-group full-width verification-panel"
              >
                <label>QR Secret</label>
                <input
                  v-model="editingTemplate.verification_setup.qr_code_secret"
                  type="text"
                  class="form-input"
                  placeholder="Inserisci il codice segreto del QR"
                />
                <p class="helper-text">
                  Questo codice deve combaciare con il QR scannerizzato.
                </p>
              </div>

              <div
                v-if="editingTemplate.verification_method === 'PHOTO_UPLOAD'"
                class="form-group full-width verification-panel"
              >
                <label>Descrizione Foto</label>
                <textarea
                  v-model="editingTemplate.verification_setup.photo_description"
                  class="form-input form-textarea"
                  rows="2"
                  placeholder="Descrivi cosa deve mostrare la foto"
                ></textarea>
                <p class="helper-text">
                  Fornisci indicazioni chiare per la verifica manuale.
                </p>
              </div>

              <div
                v-if="editingTemplate.verification_method === 'GPS'"
                class="form-group full-width verification-panel"
              >
                <label>Verifica GPS</label>
                <div class="verification-grid">
                  <div class="form-group">
                    <label>Latitudine</label>
                    <input
                      v-model="editingTemplate.verification_setup.target_lat"
                      type="number"
                      step="any"
                      class="form-input"
                      placeholder="Es. 41.9028"
                    />
                  </div>
                  <div class="form-group">
                    <label>Longitudine</label>
                    <input
                      v-model="editingTemplate.verification_setup.target_lng"
                      type="number"
                      step="any"
                      class="form-input"
                      placeholder="Es. 12.4964"
                    />
                  </div>
                  <div class="form-group">
                    <label>Distanza massima (m)</label>
                    <input
                      v-model="editingTemplate.verification_setup.min_distance_meters"
                      type="number"
                      min="1"
                      class="form-input"
                      placeholder="100"
                    />
                  </div>
                </div>
                <p class="helper-text">
                  Imposta il punto target e la distanza massima consentita.
                </p>
              </div>

              <div
                v-if="editingTemplate.verification_method === 'QUIZ'"
                class="form-group full-width verification-panel"
              >
                <label>Seleziona Quiz</label>
                <select
                  v-model="editingTemplate.verification_setup.quiz_id"
                  class="form-input"
                >
                  <option value="">-- Seleziona quiz --</option>
                  <option v-for="quiz in quizzes" :key="quiz._id" :value="quiz._id">
                    {{ quiz.title }}
                  </option>
                </select>
                <div class="inline-actions">
                  <button class="btn-action btn-update" @click="showQuizCreator = !showQuizCreator">
                    {{ showQuizCreator ? 'Chiudi creazione quiz' : 'Crea nuovo quiz' }}
                  </button>
                </div>
                <p v-if="quizzesLoading" class="helper-text">Caricamento quiz...</p>
                <p v-else-if="quizzesError" class="helper-text">{{ quizzesError }}</p>

                <div v-if="showQuizCreator" class="quiz-creator">
                  <div class="form-grid">
                    <div class="form-group full-width">
                      <label>Titolo Quiz</label>
                      <input v-model="quizForm.title" type="text" class="form-input" />
                    </div>
                    <div class="form-group full-width">
                      <label>Descrizione Quiz</label>
                      <textarea
                        v-model="quizForm.description"
                        class="form-input form-textarea"
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
                        class="form-input"
                      />
                    </div>
                  </div>

                  <div class="quiz-questions">
                    <div class="quiz-questions-header">
                      <h4>Domande</h4>
                      <button class="btn-action btn-update" @click="addQuizQuestion">
                        + Aggiungi domanda
                      </button>
                    </div>

                    <div
                      v-for="(question, index) in quizForm.questions"
                      :key="index"
                      class="quiz-question-card"
                    >
                      <div class="form-grid">
                        <div class="form-group full-width">
                          <label>Testo Domanda</label>
                          <input v-model="question.text" type="text" class="form-input" />
                        </div>
                        <div class="form-group full-width">
                          <label>Opzioni (separate da virgola)</label>
                          <input
                            v-model="question.options_text"
                            type="text"
                            class="form-input"
                          />
                        </div>
                        <div class="form-group">
                          <label>Indice Risposta Corretta</label>
                          <input
                            v-model.number="question.correct_option_index"
                            type="number"
                            min="0"
                            class="form-input"
                          />
                        </div>
                      </div>
                      <div class="config-field-actions">
                        <button class="btn-action btn-delete" @click="removeQuizQuestion(index)">
                          Rimuovi domanda
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="inline-actions">
                    <button class="btn-action btn-update" @click="createQuiz">
                      Salva quiz
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Difficolta Default</label>
                <select
                  v-model="editingTemplate.default_difficulty"
                  class="form-input"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div class="form-group">
                <label>Frequenza Default</label>
                <select
                  v-model="editingTemplate.default_frequency"
                  class="form-input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="on_demand">On Demand</option>
                  <option value="onetime">One Time</option>
                </select>
              </div>

              <div class="form-group">
                <label>Punti Minimi</label>
                <input
                  v-model.number="editingTemplate.base_points_range.min"
                  type="number"
                  min="0"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label>Punti Massimi</label>
                <input
                  v-model.number="editingTemplate.base_points_range.max"
                  type="number"
                  min="0"
                  class="form-input"
                />
              </div>

              <div class="form-group full-width">
                <label>Impatto Ambientale</label>
                <div class="checkbox-row">
                  <label class="checkbox-item">
                    <input
                      v-model="editingTemplate.impact_metrics_schema.co2_saved"
                      type="checkbox"
                    />
                    CO2 Risparmiata
                  </label>
                  <label class="checkbox-item">
                    <input
                      v-model="editingTemplate.impact_metrics_schema.waste_recycled"
                      type="checkbox"
                    />
                    Rifiuti Riciclati
                  </label>
                  <label class="checkbox-item">
                    <input
                      v-model="editingTemplate.impact_metrics_schema.km_green"
                      type="checkbox"
                    />
                    Km Green
                  </label>
                </div>
              </div>

              <div class="form-group full-width">
                <label>Esempio Titolo</label>
                <input
                  v-model="editingTemplate.example_title"
                  type="text"
                  class="form-input"
                />
              </div>

              <div class="form-group full-width">
                <label>Esempio Descrizione</label>
                <textarea
                  v-model="editingTemplate.example_description"
                  class="form-input form-textarea"
                  rows="2"
                ></textarea>
              </div>

              <div class="form-group full-width">
                <label class="checkbox-item">
                  <input v-model="editingTemplate.is_active" type="checkbox" />
                  Template attivo
                </label>
              </div>
            </div>

            <div class="config-fields">
              <div class="config-fields-header">
                <h3>Campi Configurabili</h3>
                <button class="btn-action btn-update" @click="addConfigurableField">
                  + Aggiungi Campo
                </button>
              </div>

              <div
                v-for="(field, index) in editingTemplate.configurable_fields"
                :key="index"
                class="config-field-card"
              >
                <div class="config-grid">
                  <div class="form-group">
                    <label>Nome Campo</label>
                    <input v-model="field.field_name" type="text" class="form-input" />
                  </div>

                  <div class="form-group">
                    <label>Tipo</label>
                    <select v-model="field.field_type" class="form-input">
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                      <option value="location">Location</option>
                      <option value="date">Date</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Richiesto</label>
                    <select v-model="field.required" class="form-input">
                      <option :value="true">Si</option>
                      <option :value="false">No</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Valore Default</label>
                    <input v-model="field.default_value" type="text" class="form-input" />
                  </div>

                  <div class="form-group full-width">
                    <label>Descrizione</label>
                    <input v-model="field.description" type="text" class="form-input" />
                  </div>

                  <div class="form-group">
                    <label>Valore Min</label>
                    <input v-model="field.validation.min" type="number" class="form-input" />
                  </div>

                  <div class="form-group">
                    <label>Valore Max</label>
                    <input v-model="field.validation.max" type="number" class="form-input" />
                  </div>

                  <div class="form-group">
                    <label>Pattern</label>
                    <input v-model="field.validation.pattern" type="text" class="form-input" />
                  </div>

                  <div class="form-group full-width">
                    <label>Opzioni (separate da virgola)</label>
                    <input v-model="field.validation.options_text" type="text" class="form-input" />
                  </div>
                </div>

                <div class="config-field-actions">
                  <button class="btn-action btn-delete" @click="removeConfigurableField(index)">
                    Rimuovi
                  </button>
                </div>
              </div>

              <div v-if="editingTemplate.configurable_fields.length === 0" class="empty-config">
                Nessun campo configurabile.
              </div>
            </div>

            <div class="modal-actions">
              <button
                v-if="templateModalMode === 'edit'"
                class="btn-modal btn-delete-modal"
                @click="deleteTemplate(editingTemplate)"
              >
                Elimina
              </button>
              <button class="btn-modal btn-save" @click="saveTemplate">
                Salva
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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
                <td>{{ task.neighborhood_name || task.neighborhood_id?.name || '—' }}</td>
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

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.page-subtitle {
  margin: 0;
  color: #4b5563;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
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

.btn-create {
  border: none;
  background: #2d6a4f;
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 6px 14px rgba(45, 106, 79, 0.2);
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(45, 106, 79, 0.25);
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

.verification-panel {
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 0.75rem 1rem;
}

.helper-text {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.verification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
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

.template-modal-card {
  max-width: 820px;
}

.checkbox-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  color: #1f2937;
}

.config-fields {
  border-top: 1px solid #f1f5f9;
  padding-top: 1.5rem;
  margin-top: 1rem;
}

.config-fields-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.config-fields-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1b4332;
}

.config-field-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #f8fafc;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.config-field-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.empty-config {
  padding: 0.75rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

@media (max-width: 720px) {
  .header-section {
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>