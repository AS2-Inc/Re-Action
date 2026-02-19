<template>
  <div class="title-container">
    <h2 class="subtitle">Reaction</h2>
    <h1 class="title">Admin Login</h1>
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
      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Accesso in corso..." : "Login" }}
      </button>
    </div>
  </form>
</template>

<script>
import TextInputForm from "@/components/TextInputForm.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Helper function to decode JWT token
function decodeJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((_c) => `%${(`00${_c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}

export default {
  name: "AdminLoginView",
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
      error: "",
      success: "",
    };
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
        const operatorResponse = await fetch(
          `${API_BASE_URL}/api/v1/operators/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: this.form.email.trim(),
              password: this.form.password,
            }),
          },
        );

        if (operatorResponse.ok) {
          const operatorData = await operatorResponse.json();
          if (operatorData?.token) {
            localStorage.setItem("token", operatorData.token);
            const decoded = decodeJWT(operatorData.token);
            if (decoded?.role) {
              localStorage.setItem("role", decoded.role);
            }
          }
          this.success = "Login admin effettuato con successo.";
          setTimeout(() => {
            if (operatorData.role === "admin") {
              this.$router.push("/admin/operators");
            } else {
              this.$router.push("/operatorDashboard");
            }
          }, 1000);
          return;
        }

        const payload = await operatorResponse.json().catch(() => ({}));
        this.error = payload?.error || "Credenziali non valide.";
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
