<template>
  <div class="info-column">
    <h2 class="greeting">Ciao</h2>
    <h1 class="username">{{ displayName }}</h1>
    <hr class="sep" />
  </div>
  <div class="info-name">
    <h1 class="username">{{ displayName }}</h1>
    <hr class="sep" />
  </div>
</template>

<script>
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "UserInfoColumn",
  data() {
    return {
      user: {
        name: "",
        surname: "",
      },
      userLoadError: "",
    };
  },
  computed: {
    displayName() {
      const name = `${this.user.name} ${this.user.surname}`.trim();
      return name || "Utente";
    },
  },
  async mounted() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        this.userLoadError = "Impossibile recuperare il profilo.";
        return;
      }

      const data = await response.json();
      this.user.name = data?.name || "";
      this.user.surname = data?.surname || "";
    } catch (error) {
      console.error(error);
      this.userLoadError = "Impossibile recuperare il profilo.";
    }
  },
};
</script>

<style scoped>
.info-name {
  display: none;
}
.info-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  gap: 0;
  margin-left: 20px;
  height: 100%;
  border-radius: 10px;
  width: 15%;
  background-color: #a9ca5f;
  padding: 1rem;
}
.greeting {
  font-family: "Caladea", serif;
  font-weight: 100;
  font-size: 1.2rem;
  line-height: 1;
}
.username {
  font-family: "Caladea", serif;
  line-height: 1;
  font-weight: 700;
  font-size: 2rem;
}
.sep {
  width: 100%;
  border: 1px solid #333;
  margin: 1rem;
}

@media (max-width: 600px) {
  .info-column {
    display: none;
  }
  .info-name {
    display: flex;
    margin: 1rem 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .info-name .sep {
    width: 90vw;
  }
}
</style>
