<script>
import UserInfoColumn from "@/components/UserInfoColumn.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "App",
  components: {
    UserInfoColumn,
  },
  data() {
    return {
      quickTasks: [],
      tasks: [],
    };
  },
  watch: {
    "$route.name"(newRouteName) {
      // Reload tasks when switching between tasks and stats views
      if (newRouteName === "tasks" || newRouteName === "stats") {
        this.loadTasks();
      }
    },
  },
  async mounted() {
    // Only load tasks if on an authenticated route
    if (this.$route.meta.requiresAuth) {
      this.loadTasks();
    }
  },
  methods: {
    async loadTasks() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Failed to fetch tasks");
          return;
        }

        this.tasks = await response.json();
        const assignedTasks = this.tasks.filter(
          (task) => task.assignment_status !== "AVAILABLE",
        );
        this.quickTasks = assignedTasks.slice(0, 3);
      } catch (error) {
        console.error(error);
      }
    },
  },
};
</script>

<template>
  <div id="app" :class="{ 'has-user-column': $route.meta.requiresAuth && !$route.meta.hideUserColumn }">
    <UserInfoColumn
      v-if="$route.meta.requiresAuth && !$route.meta.hideUserColumn"
      :quick-tasks="quickTasks"
      class="user-column"
    />
    <RouterView />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Caladea:ital,wght@0,400;0,700;1,400;1,700&display=swap');

* {
  margin: 0;
  padding: 0;
}

html, body {
  background: #e4e6ce;
  color: #333;
  line-height: 1.6;
  min-height: 100vh;
  width: 100vw;
}

#app {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  min-height: 100vh;
  width: 100%;
  padding: 1vh;
  gap: 0;
}

#app:not(.has-user-column) {
  flex-direction: column;
  align-items: center;
  justify-content: top;
}

.user-column {
  flex-shrink: 0;
}
</style>
