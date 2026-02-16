<template>
    <div class="home">
        <UserInfoColumn />
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
import UserInfoColumn from "@/components/UserInfoColumn.vue";

export default {
  name: "HomeView",
  components: {
    Navbar,
    UserInfoColumn,
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
    .display {
        margin: 0;
        width: 100%;
    }
}
</style>