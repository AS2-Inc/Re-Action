import { createRouter, createWebHistory } from "vue-router";
import AdminLoginView from "../views/AdminLoginView.vue";
import AdminOperatorsView from "../views/AdminOperatorsView.vue";
import CreateTaskView from "../views/CreateTaskView.vue";
import LoginView from "../views/LoginView.vue";
import NotFoundView from "../views/NotFoundView.vue";
import OperatorActivationView from "../views/OperatorActivationView.vue";
import OperatorDashboardView from "../views/OperatorDashboardView.vue";
import PresentationView from "../views/PresentationView.vue";
import RegisterView from "../views/RegisterView.vue";
import ReportsListView from "../views/ReportsListView.vue";
import ResetPasswordView from "../views/ResetPasswordView.vue";
import StatsView from "../views/StatsView.vue";
import TasksView from "../views/TasksView.vue";
import TaskTemplatesView from "../views/TaskTemplatesView.vue";
import UserProfileView from "../views/UserProfileView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/operator/activate",
      name: "operatorActivate",
      component: OperatorActivationView,
    },
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
      path: "/admin",
      name: "adminLogin",
      component: AdminLoginView,
    },
    {
      path: "/admin/operators",
      name: "adminOperators",
      component: AdminOperatorsView,
      meta: { requiresAuth: true, role: "admin", hideUserColumn: true },
    },
    {
      path: "/register",
      name: "register",
      component: RegisterView,
    },
    {
      path: "/reset-password",
      name: "resetPassword",
      component: ResetPasswordView,
    },
    {
      path: "/profile",
      name: "profile",
      component: UserProfileView,
      meta: { requiresAuth: true },
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
      path: "/taskTemplates",
      name: "taskTemplates",
      component: TaskTemplatesView,
    },
    {
      path: "/createTask",
      name: "createTask",
      component: CreateTaskView,
    },
    {
      path: "/reportsList",
      name: "reportsList",
      component: ReportsListView,
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: NotFoundView,
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  const token = localStorage.getItem("token"); // For operator login
  const role = localStorage.getItem("role");
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiredRole = to.meta.role;

  if (requiresAuth && !isAuthenticated && !token) {
    next("/login");
  } else if (requiredRole && role !== requiredRole) {
    // Redirect to appropriate dashboard or login if role doesn't match
    if (token) next("/operatorDashboard");
    else next("/login");
  } else {
    next();
  }
});

export default router;
