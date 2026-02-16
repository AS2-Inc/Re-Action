<template>
  <div class="title-container">
    <h2 class="subtitle">Reaction</h2>
    <h1 class="title">Accedi</h1>
  </div>
  <form class="login-form" @submit.prevent="submitLogin">
    <TextInputForm
      v-model="form.email"
      label="Email"
      placeholder="Inserisci la tua email"
      name="email"
      id="email"
      type="email"
    />
    <TextInputForm
      v-model="form.password"
      label="Password"
      placeholder="Inserisci la tua password"
      name="password"
      id="password"
      type="password"
    />

    <p v-if="error" class="form-message error">{{ error }}</p>
    <p v-if="success" class="form-message success">{{ success }}</p>

    <div class="button-container">
      <button class="btn" type="submit" :disabled="isBusy">
        {{ loading ? "Accesso in corso..." : "Login" }}
      </button>
      <button class="btn" type="button" :disabled="isBusy" @click="loginWithGoogle">
        {{ oauthLoading ? "Connessione Google..." : "Login con Google" }}
      </button>
    </div>
  </form>
</template>

<script>
import TextInputForm from "@/components/TextInputForm.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default {
  name: "LoginView",
  components: {
    TextInputForm,
  },
  data() {
    return {
      form: {
        email: "",
        password: "",
      },
      loading: false,
      oauthLoading: false,
      error: "",
      success: "",
    };
  },
  computed: {
    isBusy() {
      return this.loading || this.oauthLoading;
    },
  },
  methods: {
    async submitLogin() {
      this.error = "";
      this.success = "";

      if (!this.form.email || !this.form.password) {
        this.error = "Email e password sono obbligatori.";
        return;
      }

      this.loading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies
          body: JSON.stringify({
            email: this.form.email.trim(),
            password: this.form.password,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          this.error = payload?.error || "Errore durante il login.";
          return;
        }

        const _data = await response.json();
        this.success = "Login effettuato con successo.";

        // Redirect to main area
        setTimeout(() => {
          this.$router.push("/tasks");
        }, 1000);
      } catch (error) {
        console.error(error);
        this.error = "Impossibile contattare il server.";
      } finally {
        this.loading = false;
      }
    },
    async loginWithGoogle() {
      this.error = "";
      this.success = "";

      if (!GOOGLE_CLIENT_ID) {
        this.error = "Google OAuth non configurato.";
        return;
      }

      if (!window.google?.accounts?.id) {
        this.error = "Google Identity Services non disponibile.";
        return;
      }

      this.oauthLoading = true;

      try {
        const buttonDiv = document.createElement("div");
        buttonDiv.style.display = "none";
        document.body.appendChild(buttonDiv);

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: this.handleGoogleCredential,
        });

        window.google.accounts.id.renderButton(buttonDiv, {
          theme: "outline",
          size: "large",
        });

        const button = buttonDiv.querySelector('div[role="button"]');
        if (button) {
          button.click();
        } else {
          throw new Error("Impossibile inizializzare Google Sign-In");
        }

        setTimeout(() => buttonDiv.remove(), 1000);
      } catch (error) {
        console.error(error);
        this.error = error.message || "Impossibile completare Google OAuth.";
        this.oauthLoading = false;
      }
    },
    async handleGoogleCredential(response) {
      try {
        if (!response?.credential) {
          this.error = "Credenziali Google non ricevute.";
          this.oauthLoading = false;
          return;
        }

        const apiResponse = await fetch(
          `${API_BASE_URL}/api/v1/users/auth/google`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ credential: response.credential }),
          },
        );

        if (!apiResponse.ok) {
          const payload = await apiResponse.json().catch(() => ({}));
          this.error =
            payload?.error || "Errore durante l'autenticazione Google.";
          this.oauthLoading = false;
          return;
        }

        const _data = await apiResponse.json();
        this.success = "Login Google completato.";

        setTimeout(() => {
          this.$router.push("/tasks");
        }, 1000);
      } catch (error) {
        console.error(error);
        this.error = "Impossibile contattare il server.";
      } finally {
        this.oauthLoading = false;
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
  gap: 2rem;
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
    gap: 2rem;
    padding: 2rem;
  }
}
</style>
