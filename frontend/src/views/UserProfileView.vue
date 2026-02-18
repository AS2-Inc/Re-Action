<template>
  <div class="profile-container">
    <div class="header">
      <h1 class="title">Il tuo Profilo</h1>
      <button class="btn logout-btn" @click="logout">Logout</button>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">Caricamento...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>

      <div v-else class="profile-forms">
        <!-- Personal Info Form -->
        <section class="form-section">
          <h2>Informazioni Personali</h2>
          <form @submit.prevent="updateProfile">
            <TextInputForm
              v-model="user.name"
              label="Nome"
              id="name"
              required
            />
            <TextInputForm
              v-model="user.surname"
              label="Cognome"
              id="surname"
              required
            />
            <TextInputForm
              v-model="user.email"
              label="Email"
              id="email"
              type="email"
              disabled
              hint="L'email non può essere modificata."
            />
            <div class="form-actions">
              <button type="submit" class="btn save-btn" :disabled="updatingProfile">
                {{ updatingProfile ? "Salvataggio..." : "Aggiorna Profilo" }}
              </button>
            </div>
            <p v-if="profileMessage" :class="['form-message', profileError ? 'error' : 'success']">
              {{ profileMessage }}
            </p>
          </form>
        </section>

        <!-- Change Password Form -->
        <section class="form-section">
          <h2>Cambia Password</h2>
          <form @submit.prevent="changePassword">
            <TextInputForm
              v-model="pwdForm.current_password"
              label="Password Attuale"
              id="current_password"
              type="password"
              required
            />
            <TextInputForm
              v-model="pwdForm.new_password"
              label="Nuova Password"
              id="new_password"
              type="password"
              required
            />
            <TextInputForm
              v-model="pwdForm.confirm_password"
              label="Conferma Password"
              id="confirm_password"
              type="password"
              required
            />
            <div class="form-actions">
              <button type="submit" class="btn warning-btn" :disabled="changingPwd">
                {{ changingPwd ? "Aggiornamento..." : "Cambia Password" }}
              </button>
            </div>
            <p v-if="pwdMessage" :class="['form-message', pwdError ? 'error' : 'success']">
              {{ pwdMessage }}
            </p>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import TextInputForm from "@/components/TextInputForm.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "UserProfileView",
  components: { TextInputForm },
  data() {
    return {
      user: {
        name: "",
        surname: "",
        email: "",
      },
      pwdForm: {
        current_password: "",
        new_password: "",
        confirm_password: "",
      },
      loading: false,
      error: "",

      updatingProfile: false,
      profileMessage: "",
      profileError: false,

      changingPwd: false,
      pwdMessage: "",
      pwdError: false,
    };
  },
  async mounted() {
    await this.fetchProfile();
  },
  methods: {
    async fetchProfile() {
      this.loading = true;
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch profile");
        this.user = await response.json();
      } catch (err) {
        console.error(err);
        this.error = "Impossibile caricare il profilo.";
      } finally {
        this.loading = false;
      }
    },
    async updateProfile() {
      this.updatingProfile = true;
      this.profileMessage = "";
      this.profileError = false;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: this.user.name,
            surname: this.user.surname,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update profile");
        }

        this.profileMessage = "Profilo aggiornato con successo.";
      } catch (err) {
        console.error(err);
        this.profileError = true;
        this.profileMessage = err.message;
      } finally {
        this.updatingProfile = false;
      }
    },
    async changePassword() {
      this.changingPwd = true;
      this.pwdMessage = "";
      this.pwdError = false;

      if (this.pwdForm.new_password !== this.pwdForm.confirm_password) {
        this.pwdError = true;
        this.pwdMessage = "Le password non coincidono.";
        this.changingPwd = false;
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/users/change-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              current_password: this.pwdForm.current_password,
              new_password: this.pwdForm.new_password,
            }),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to change password");
        }

        this.pwdMessage = "Password cambiata con successo.";
        this.pwdForm = {
          current_password: "",
          new_password: "",
          confirm_password: "",
        };
      } catch (err) {
        console.error(err);
        this.pwdError = true;
        this.pwdMessage = err.message;
      } finally {
        this.changingPwd = false;
      }
    },
    logout() {
      localStorage.removeItem("authenticated");
      // Optionally call backend logout to clear cookie
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
.profile-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  font-family: "Caladea", serif;
  width: 100%;
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

.logout-btn {
  background-color: #b00020;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.profile-forms {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.form-section {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-section h2 {
  margin-bottom: 1.5rem;
  color: #555;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: white;
}

.btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.save-btn {
  background-color: #2e7d32;
}

.warning-btn {
  background-color: #f57c00;
}

.form-message {
  margin-top: 1rem;
  font-weight: 600;
  text-align: center;
}

.form-message.error {
  color: #d32f2f;
}

.form-message.success {
  color: #2e7d32;
}

.error-message {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 1rem;
  border-radius: 4px;
}
</style>
