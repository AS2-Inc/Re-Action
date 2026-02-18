<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const _router = useRouter();

const submissions = ref([]);
const loading = ref(true);
const errorMessage = ref("");

// Modal State
const showModal = ref(false);
const selectedSubmission = ref(null);
const modalLoading = ref(false);

const _API_BASE = "http://localhost:5000/api/v1";

const fetchSubmissions = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    _router.push("/login");
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    // Fetch PENDING submissions by default
    const response = await fetch(`${_API_BASE}/tasks/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify({ status: "PENDING" }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sessione scaduta. Effettua nuovamente il login.");
      }
      throw new Error("Errore nel recupero delle submission");
    }

    const data = await response.json();
    submissions.value = Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    errorMessage.value = error.message;
    if (error.message.includes("Sessione scaduta")) {
      setTimeout(() => _router.push("/login"), 2500);
    }
  } finally {
    loading.value = false;
  }
};

const _openVerificationModal = (submission) => {
  selectedSubmission.value = submission;
  showModal.value = true;
};

const closeVerificationModal = () => {
  showModal.value = false;
  selectedSubmission.value = null;
};

const _verifySubmission = async (verdict) => {
  if (!selectedSubmission.value) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  modalLoading.value = true;

  try {
    const response = await fetch(
      `${_API_BASE}/tasks/submissions/${selectedSubmission.value._id}/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
        body: JSON.stringify({ verdict }),
      },
    );

    if (!response.ok) {
      throw new Error("Errore durante la verifica della submission");
    }

    // Success: Remove from list and close modal
    submissions.value = submissions.value.filter(
      (s) => s._id !== selectedSubmission.value._id,
    );
    closeVerificationModal();
    alert(
      `Submission ${verdict === "APPROVED" ? "approvata" : "rifiutata"} con successo!`,
    );
  } catch (error) {
    alert(error.message);
  } finally {
    modalLoading.value = false;
  }
};

onMounted(() => {
  fetchSubmissions();
});
</script>

<template>
  <div class="dashboard-wrapper">
    <nav class="dashboard-navbar">
      <div class="navbar-brand">Dashboard Operatore</div>
      <ul class="navbar-links">
        <li><a href="/operatorDashboard" class="nav-link">Home</a></li>
        <li><a href="/reportsList" class="nav-link active">Lista Report</a></li>
        <li><a href="/taskTemplates" class="nav-link">Task Attive</a></li>
        <li><a href="/createTask" class="nav-link">Crea Task</a></li>
      </ul>
    </nav>

    <div v-if="loading" class="state-container loading">
      <div class="spinner"></div>
      <p>Caricamento segnalazioni in corso...</p>
    </div>

    <div v-if="errorMessage" class="state-container error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>

    <div v-if="!loading && !errorMessage" class="dashboard-content">
      <section class="section">
        <h2 class="section-title">Segnalazioni da Verificare (Pending)</h2>
        
        <div class="table-card">
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo Verifica</th>
                  <th>Stato</th>
                  <th class="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="submissions.length === 0">
                    <td colspan="4" class="text-center">Nessuna submission in attesa.</td>
                </tr>
                <tr v-for="sub in submissions" :key="sub._id">
                  <td>{{ new Date(sub.created_at || Date.now()).toLocaleDateString() }}</td>
                  <td>
                    {{ sub.task_id ? sub.task_id.verification_method : 'N/A' }}
                  </td>
                  <td>
                    <span class="status-badge pending">
                      {{ sub.status }}
                    </span>
                  </td>
                  <td class="text-right">
                    <button class="btn-details" @click="_openVerificationModal(sub)">
                      Verifica
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- VERIFICATION MODAL -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeVerificationModal">
        <div class="modal-card">
          <button class="close-btn" @click="closeVerificationModal">×</button>

          <div v-if="modalLoading" class="modal-loading">
            <div class="spinner"></div>
            <p>Elaborazione...</p>
          </div>

          <div v-else-if="selectedSubmission" class="modal-content">
             <header class="modal-header">
                <h2>Verifica Task</h2>
                <span class="status-badge pending">PENDING</span>
            </header>

            <div class="submission-details">
                <div class="detail-row">
                    <strong>Tipo Verifica:</strong>
                    <span>{{ selectedSubmission.task_id?.verification_method || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                    <strong>Task (Titolo):</strong>
                    <span>{{ selectedSubmission.task_id?.title || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                    <strong>Descrizione Task:</strong>
                    <p>{{ selectedSubmission.task_id?.description || 'N/A' }}</p>
                </div>
            </div>

            <div class="proof-section">
                <h3>Prova Fornita</h3>
                <!-- Photo Proof -->
                <div v-if="selectedSubmission.proof?.photo_url" class="photo-proof">
                     <img 
                        :src="`http://localhost:5000${selectedSubmission.proof.photo_url}`" 
                        alt="Prova fotografica" 
                        class="proof-img"
                    />
                </div>
                <!-- GPS Trace Proof -->
                <div v-else-if="selectedSubmission.proof?.gps_trace && selectedSubmission.proof.gps_trace.length > 0" class="gps-proof">
                    <div class="gps-info">
                        <p><strong>Tracciato GPS Registrato</strong></p>
                        <p>Punti: {{ selectedSubmission.proof.gps_trace.length }}</p>
                    </div>
                    <div class="text-proof">
                        <pre>{{ JSON.stringify(selectedSubmission.proof.gps_trace, null, 2) }}</pre>
                    </div>
                </div>
                <!-- Generic JSON/Text Proof -->
                <div v-else class="text-proof">
                    <pre>{{ JSON.stringify(selectedSubmission.proof, null, 2) }}</pre>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-reject" @click="_verifySubmission('REJECTED')">Rifiuta</button>
                <button class="btn-approve" @click="_verifySubmission('APPROVED')">Approva</button>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
/* Keeping logic from previous step, utilizing root vars */
:root {
  --primary-green: #2d6a4f;
  --secondary-green: #40916c;
  --light-green: #d8f3dc;
  --bg-green-tint: #f0fdf4;
  --white: #ffffff;
  --text-dark: #1b4332;
  --text-light: #6c757d;
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

.dashboard-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--white);
  padding: 1rem 2rem;
  border-radius: var(--radius);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d6a4f;
}

.navbar-links {
  display: flex;
  gap: 2rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-link {
  text-decoration: none;
  color: #6c757d;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.2s ease;
  padding-bottom: 2px;
  border-bottom: 2px solid transparent;
}

.nav-link:hover,
.nav-link.active {
  color: #2d6a4f;
  font-weight: 600;
  border-bottom-color: #40916c;
}

/* State Containers */
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  border: 1px solid #fee2e2;
  background-color: #fef2f2;
  color: #b91c1c;
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

.primary-text {
  font-weight: 600;
  color: #1b4332;
}

.text-right {
  text-align: right;
}

.status-badge {
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
}
.status-badge.pending {
  background-color: #fef3c7;
  color: #b45309;
}

.btn-details {
  background-color: #40916c;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-details:hover {
  background-color: #2d6a4f;
  transform: translateY(-2px);
}

/* Modal Specifics */
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
    max-width: 600px; /* Smaller than dashboard details modal */
    border-radius: 20px;
    padding: 2.5rem;
    position: relative;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 1rem;
}

.modal-header h2 {
    margin: 0;
    color: #1b4332;
    font-size: 1.5rem;
}

.submission-details {
    margin-bottom: 2rem;
}

.detail-row {
    margin-bottom: 1rem;
    font-size: 1rem;
}

.detail-row strong {
    color: #2d6a4f;
    display: block;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
}

.proof-section {
    background-color: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
}

.proof-section h3 {
    margin-top: 0;
    font-size: 1.1rem;
    color: #475569;
    margin-bottom: 1rem;
}

.photo-proof img {
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.text-proof pre {
    background: #e2e8f0;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.85rem;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.btn-approve, .btn-reject {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: transform 0.1s;
}

.btn-approve {
    background-color: #2d6a4f;
    color: white;
}
.btn-approve:hover {
    background-color: #1b4332;
}

.btn-reject {
    background-color: #fee2e2;
    color: #b91c1c;
}
.btn-reject:hover {
    background-color: #fecaca;
}

@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: 1rem;
    width: 95vw;
  }
}
</style>
