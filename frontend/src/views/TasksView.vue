<template>
    <div class="home">
        <div class="info-column">
            <h2 class="greeting">Ciao</h2>
            <h1 class="username">TODO</h1>
            <hr class="sep" />
        </div>
        <div class="info-name">
            <h1 class="username">TODO</h1>
            <hr class="sep" />
        </div>
        <div class="display">
            <Navbar :links="navLinks" />
            <div class="data-display">
                <p>TODO: mostrare dati interessanti</p>
            </div>
        </div>
    </div>
</template>

<script>
import Navbar from "@/components/Navbar.vue";

export default {
  name: "TasksView",
  components: {
    Navbar,
  },
  data() {
    return {
      navLinks: [
        { label: "Home", to: "/home" },
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
      ],
    };
  },
};
</script>

<style scoped>
.home {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
    width: 100vw;
    height: 100%;
} 
.info-name {
    display: none;
}
.info-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    gap:0;
    margin-left: 20px;
    height: 100%;
    border-radius: 10px;
    width: 15%;
    background-color: #A9CA5F;
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

.display {
    margin-left: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    width: 80%;
    height: 100%;
}
.data-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    width: 100%;
    height: 100%;
}
@media (max-width: 600px) {
    .home {
        flex-direction: column;
        align-items: center;
    }
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
    .display {
        margin: 0;
        width: 100%;
    }
}
</style>