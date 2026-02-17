import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import OperatorDashboardView from "../views/OperatorDashboardView.vue";
import PresentationView from "../views/PresentationView.vue";
import RegisterView from "../views/RegisterView.vue";
import StatsView from "../views/StatsView.vue";
import TasksView from "../views/TasksView.vue";
import NotFoundView from "../views/NotFoundView.vue";

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
      meta: { requiresAuth: true },
    },
    {
      path: "/stats",
      name: "stats",
      component: StatsView,
      meta: { requiresAuth: true },
    },
    {
      path: "/operatorDashboard",
      name: "operatorDashboard",
      component: OperatorDashboardView,
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: NotFoundView,
    },
  ],
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !token) {
    next("/login");
  } else {
    next();
  }
});

export default router;
