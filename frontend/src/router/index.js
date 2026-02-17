import { createRouter, createWebHistory } from "vue-router";
import CreateTaskView from "../views/CreateTaskView.vue";
import LoginView from "../views/LoginView.vue";
import OperatorDashboardView from "../views/OperatorDashboardView.vue";
import PresentationView from "../views/PresentationView.vue";
import RegisterView from "../views/RegisterView.vue";
import StatsView from "../views/StatsView.vue";
import TasksView from "../views/TasksView.vue";
import TaskTemplatesView from "../views/TaskTemplatesView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "presentation",
      component: PresentationView,
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/register",
      name: "register",
      component: RegisterView,
    },
    {
      path: "/tasks",
      name: "tasks",
      component: TasksView,
    },
    {
      path: "/stats",
      name: "stats",
      component: StatsView,
    },
    {
      path: "/operatorDashboard",
      name: "operatorDashboard",
      component: OperatorDashboardView,
    },
    {
      path: "/taskTemplates",
      name: "taskTemplates",
      component: TaskTemplatesView,
    },
    {
      path: "/createTask",
      name: "createTask",
      component: CreateTaskView,
    },
  ],
});

export default router;
