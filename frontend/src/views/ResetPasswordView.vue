<template>
  <div class="title-container">
    <h2 class="subtitle">Reaction</h2>
    <h1 class="title">Reset Password</h1>
  </div>
  <form class="login-form" @submit.prevent="submitReset">
    <TextInputForm
      v-model="form.password"
      label="Nuova Password"
      placeholder="Inserisci la nuova password"
      name="password"
      id="password"
      type="password"
      required
    />
    <TextInputForm
      v-model="form.confirmPassword"
      label="Conferma Password"
      placeholder="Conferma la nuova password"
      name="confirmPassword"
      id="confirmPassword"
      type="password"
      required
    />

    <p v-if="error" class="form-message error">{{ error }}</p>
    <p v-if="success" class="form-message success">{{ success }}</p>

    <div class="button-container">
      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Caricamento..." : "Imposta Password" }}
      </button>
    </div>
  </form>
</template>

<script>
import TextInputForm from "@/components/TextInputForm.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "ResetPasswordView",
  components: {
    TextInputForm,
  },
  data() {
    return {
      form: {
        password: "",
        confirmPassword: "",
      },
      loading: false,
      error: "",
      success: "",
      token: "",
      type: "user",
    };
  },
  mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    this.token = urlParams.get("token");
    this.type = urlParams.get("type") || "user";

    if (!this.token) {
      this.error = "Token mancante o non valido.";
    }
  },
  methods: {
    async submitReset() {
      this.error = "";
      this.success = "";

      if (this.form.password !== this.form.confirmPassword) {
        this.error = "Le password non coincidono.";
        return;
      }

      if (!this.token) {
        this.error = "Token mancante.";
        return;
      }

      this.loading = true;
      try {
        // Determine endpoint based on type
        const endpoint =
          this.type === "operator"
            ? `${API_BASE_URL}/api/v1/operators/reset-password`
            : `${API_BASE_URL}/api/v1/users/reset-password`; // Assuming this exists or will exist

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: this.token,
            password: this.form.password,
          }),
        });

        if (response.ok) {
          this.success = "Password aggiornata con successo. Reindirizzamento al login...";
          setTimeout(() => {
            this.$router.push(this.type === 'operator' ? '/admin' : '/login');
          }, 2000);
          return;
        }

        const payload = await response.json().catch(() => ({}));
        this.error = payload?.error || "Errore durante il reset della password.";
      } catch (error) {
        console.error(error);
        this.error = "Impossibile contattare il server.";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.title-container {
  font-family: "Caladea", serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #a9ca5f;
  height: 15vh;
  min-height: 100px;
  width: 80vw;
  border-radius: 10px;
}
.subtitle {
  font-weight: 100;
  font-size: 1.4rem;
  line-height: 1;
}
.title {
  line-height: 1;
  font-weight: 700;
  font-size: 3rem;
}

.button-container {
  display: flex;
  justify-content: center;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 2rem;
}

.btn {
  font-family: "Caladea", serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background-color: #333;
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  transition: background-color 0.3s ease;
  cursor: pointer;
  text-align: center;
  min-width: 120px;
  border: none;
}

.btn:disabled {
  background-color: #666;
  cursor: not-allowed;
}

.btn:hover:not(:disabled) {
  background-color: #555;
}

.form-message {
  font-family: "Caladea", serif;
  font-weight: 600;
}

.form-message.error {
  color: #b00020;
}

.form-message.success {
  color: #2e7d32;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 4rem;
}

@media (max-width: 600px) {
  .button-container {
    display: flex;
    justify-content: center;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 2rem;
  }
}
</style>
