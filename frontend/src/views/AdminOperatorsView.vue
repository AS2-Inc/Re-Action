<template>
  <div class="admin-container">
    <div class="header">
      <h1 class="title">Gestione Operatori</h1>
      <div class="actions">
        <button class="btn logout-btn" @click="logout">Logout</button>
      </div>
    </div>

    <div class="content">
      <div class="toolbar">
        <button class="btn create-btn" @click="showCreateModal = true">
          + Aggiungi Operatore
        </button>
      </div>

      <div v-if="loading" class="loading">Caricamento...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>

      <table v-else class="operators-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cognome</th>
            <th>Email</th>
            <th>Ruolo</th>
            <th>Stato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="op in operators" :key="op._id">
            <td>{{ op.name }}</td>
            <td>{{ op.surname }}</td>
            <td>{{ op.email }}</td>
            <td>{{ op.role }}</td>
            <td>
              <span :class="['status', op.is_active ? 'active' : 'inactive']">
                {{ op.is_active ? "Attivo" : "In attesa" }}
              </span>
            </td>
            <td>
              <button
                v-if="op.role !== 'admin'"
                class="btn delete-btn"
                @click="deleteOperator(op._id)"
              >
                Elimina
              </button>
              <button
                v-if="op.role !== 'admin'"
                class="btn reset-btn"
                @click="forceResetPassword(op._id)"
              >
                Reset Pwd
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal">
        <h2>Nuovo Operatore</h2>
        <form @submit.prevent="createOperator">
          <TextInputForm
            v-model="newOperator.name"
            label="Nome"
            id="newOpName"
            required
          />
          <TextInputForm
            v-model="newOperator.surname"
            label="Cognome"
            id="newOpSurname"
            required
          />
          <TextInputForm
            v-model="newOperator.email"
            label="Email"
            id="newOpEmail"
            type="email"
            required
          />
          
          <div class="modal-actions">
            <button type="button" class="btn cancel-btn" @click="closeModal">Annulla</button>
            <button type="submit" class="btn save-btn" :disabled="creating">
              {{ creating ? "Creazione..." : "Crea" }}
            </button>
          </div>
          <p v-if="createError" class="form-message error">{{ createError }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import TextInputForm from "@/components/TextInputForm.vue";
import apiService from "@/services/api.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "AdminOperatorsView",
  components: { TextInputForm },
  data() {
    return {
      operators: [],
      loading: false,
      error: "",
      showCreateModal: false,
      newOperator: {
        name: "",
        surname: "",
        email: "",
      },
      creating: false,
      createError: "",
    };
  },
  async mounted() {
    await this.fetchOperators();
  },
  methods: {
    async fetchOperators() {
      this.loading = true;
      try {
        this.operators = await apiService.get("/api/v1/operators");
      } catch (err) {
        console.error(err);
        this.error = "Impossibile caricare gli operatori.";
      } finally {
        this.loading = false;
      }
    },
    async deleteOperator(id) {
      if (!confirm("Sei sicuro di voler eliminare questo operatore?")) return;

      try {
        await apiService.delete(`/api/v1/operators/${id}`);
        this.operators = this.operators.filter((op) => op._id !== id);
      } catch (err) {
        console.error(err);
        alert("Errore durante l'eliminazione.");
      }
    },
    async forceResetPassword(id) {
      if (!confirm("Inviare email di reset password a questo operatore?"))
        return;

      try {
        await apiService.post(
          `/api/v1/operators/${id}/force-reset-password`,
          {},
        );

        alert("Email di reset password inviata con successo.");
      } catch (err) {
        console.error(err);
        alert("Errore durante l'invio dell'email.");
      }
    },
    async createOperator() {
      this.creating = true;
      this.createError = "";
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/operators/register`,
          {
            method: "POST",
            headers: this.getAuthHeaders(),
            body: JSON.stringify(this.newOperator),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }

        await this.fetchOperators();
        this.closeModal();
      } catch (err) {
        console.error(err);
        this.createError = err.message;
      } finally {
        this.creating = false;
      }
    },
    closeModal() {
      this.showCreateModal = false;
      this.newOperator = { name: "", surname: "", email: "" };
      this.createError = "";
    },
    logout() {
      apiService.clearAuth();
      this.$router.push("/admin");
    },
  },
};
</script>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: "Caladea", serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.toolbar {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.create-btn {
  background-color: #2e7d32;
  color: white;
}

.logout-btn {
  background-color: #b00020;
  color: white;
}

.delete-btn {
  background-color: #d32f2f;
  color: white;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  margin-right: 0.5rem;
}

.reset-btn {
  background-color: #f57c00;
  color: white;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
}

.cancel-btn {
  background-color: #757575;
  color: white;
}

.save-btn {
  background-color: #2e7d32;
  color: white;
}

.operators-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.operators-table th,
.operators-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.operators-table th {
  background-color: #f5f5f5;
  font-weight: 600;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.status.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status.inactive {
  background-color: #fff3e0;
  color: #ef6c00;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.error-message {
  color: #d32f2f;
  padding: 1rem;
  background-color: #ffebee;
  border-radius: 4px;
}
</style>
