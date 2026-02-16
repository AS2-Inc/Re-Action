<template>
  <div class="title-container">
    <h2 class="subtitle">Reaction</h2>
    <h1 class="title">Registrati</h1>
  </div>
  <form class="login-form" @submit.prevent="submitRegister">
    <div class="sub-form">
      <TextInputForm
        v-model="form.name"
        label="Nome"
        placeholder="Inserisci il tuo nome"
        name="name"
        id="name"
        type="text"
      />
      <TextInputForm
        v-model="form.surname"
        label="Cognome"
        placeholder="Inserisci il tuo cognome"
        name="surname"
        id="surname"
        type="text"
      />
      <TextInputForm
        v-model="form.email"
        label="Email"
        placeholder="Inserisci la tua email"
        name="email"
        id="email"
        type="email"
      />
      <TextInputForm
        v-model="form.age"
        label="Età"
        placeholder="Inserisci la tua età"
        name="age"
        id="age"
        type="number"
      />
    </div>
    <div class="sub-form">
      <TextInputForm
        v-model="form.password"
        label="Password"
        placeholder="Inserisci la tua password"
        name="password"
        id="password"
        type="password"
      />
      <TextInputForm
        v-model="form.confirmPassword"
        label="Conferma Password"
        placeholder="Conferma la tua password"
        name="confirmPassword"
        id="confirmPassword"
        type="password"
      />
    </div>

    <p v-if="error" class="form-message error">{{ error }}</p>
    <p v-if="success" class="form-message success">{{ success }}</p>

    <div class="button-container">
      <button class="btn" type="submit" :disabled="isBusy">
        {{ loading ? "Registrazione in corso..." : "Registrati" }}
      </button>
      <button class="btn" type="button" :disabled="isBusy" @click="registerWithGoogle">
        {{ oauthLoading ? "Connessione Google..." : "Registrati con Google" }}
      </button>
      <button class="btn" type="button" :disabled="isBusy" @click="registerWithSpid">
        Registrati con SPID
      </button>
    </div>
  </form>
</template>

<script>
import TextInputForm from "@/components/TextInputForm.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SPID_AUTH_URL = import.meta.env.VITE_SPID_AUTH_URL;

export default {
  name: "RegisterView",
  components: {
    TextInputForm,
  },
  data() {
    return {
      form: {
        name: "",
        surname: "",
        email: "",
        age: "",
        password: "",
        confirmPassword: "",
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
    async submitRegister() {
      this.error = "";
      this.success = "";

      if (this.form.password !== this.form.confirmPassword) {
        this.error = "Le password non coincidono.";
        return;
      }

      const ageNumber = Number.parseInt(this.form.age, 10);
      if (Number.isNaN(ageNumber) || ageNumber <= 0) {
        this.error = "Inserisci un'età valida.";
        return;
      }

      this.loading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: this.form.name.trim(),
            surname: this.form.surname.trim(),
            email: this.form.email.trim(),
            password: this.form.password,
            age: ageNumber,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          this.error = payload?.error || "Errore durante la registrazione.";
          return;
        }

        this.success =
          "Registrazione completata. Controlla la tua email per attivare l'account.";
        this.form = {
          name: "",
          surname: "",
          email: "",
          age: "",
          password: "",
          confirmPassword: "",
        };
      } catch (error) {
        console.error(error);
        this.error = "Impossibile contattare il server.";
      } finally {
        this.loading = false;
      }
    },
    async registerWithGoogle() {
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
        // Use a button click approach with renderButton
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

        // Trigger the button programmatically
        const button = buttonDiv.querySelector('div[role="button"]');
        if (button) {
          button.click();
        } else {
          throw new Error("Impossibile inizializzare Google Sign-In");
        }

        // Clean up
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
        this.success = "Registrazione Google completata.";

        setTimeout(() => {
          this.$router.push("/");
        }, 1500);
      } catch (error) {
        console.error(error);
        this.error = "Impossibile contattare il server.";
      } finally {
        this.oauthLoading = false;
      }
    },
    registerWithSpid() {
      this.error = "";
      this.success = "";

      if (SPID_AUTH_URL) {
        window.location.href = SPID_AUTH_URL;
        return;
      }

      this.error = "SPID non configurato.";
    },
  },
};
</script>

<style scoped>
.sub-form {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
}
.title-container {
  font-family: "Caladea", serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #A9CA5F;
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
  padding: 2rem;
}

@media (max-width: 600px) {
    .sub-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
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
}
</style>