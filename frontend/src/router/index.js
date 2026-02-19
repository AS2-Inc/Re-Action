import { createRouter, createWebHistory } from "vue-router";
import AdminLoginView from "../views/AdminLoginView.vue";
import AdminOperatorsView from "../views/AdminOperatorsView.vue";
import CreateTaskView from "../views/CreateTaskView.vue";
import LeaderboardView from "../views/LeaderboardView.vue";
import LoginView from "../views/LoginView.vue";
import NotFoundView from "../views/NotFoundView.vue";
import OperatorActivationView from "../views/OperatorActivationView.vue";
import OperatorDashboardView from "../views/OperatorDashboardView.vue";
import PresentationView from "../views/PresentationView.vue";
import RegisterView from "../views/RegisterView.vue";
import ReportsListView from "../views/ReportsListView.vue";
import ResetPasswordView from "../views/ResetPasswordView.vue";
import RewardsView from "../views/RewardsView.vue";
import StatsView from "../views/StatsView.vue";
import TasksView from "../views/TasksView.vue";
import TaskTemplatesView from "../views/TaskTemplatesView.vue";
import UserProfileView from "../views/UserProfileView.vue";
import apiService from "../services/api.js";

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
      path: "/leaderboard",
      name: "leaderboard",
      component: LeaderboardView,
      meta: { requiresAuth: true, authType: "user" },
    },
    {
      path: "/home",
      redirect: "/tasks",
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
      meta: {
        requiresAuth: true,
        authType: "operator",
        roles: ["admin"],
        hideUserColumn: true,
      },
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
      meta: { requiresAuth: true, authType: "user" },
    },
    {
      path: "/tasks",
      name: "tasks",
      component: TasksView,
      meta: { requiresAuth: true, authType: "user" },
    },
    {
      path: "/stats",
      name: "stats",
      component: StatsView,
      meta: { requiresAuth: true, authType: "user" },
    },
    {
      path: "/rewards",
      name: "rewards",
      component: RewardsView,
      meta: { requiresAuth: true },
    },
    {
      path: "/operatorDashboard",
      name: "operatorDashboard",
      component: OperatorDashboardView,
      meta: {
        hideUserColumn: true,
        requiresAuth: true,
        authType: "operator",
        roles: ["operator", "admin"],
      },
    },
    {
      path: "/taskTemplates",
      name: "taskTemplates",
      component: TaskTemplatesView,
      meta: {
        hideUserColumn: true,
        requiresAuth: true,
        authType: "operator",
        roles: ["operator", "admin"],
      },
    },
    {
      path: "/createTask",
      name: "createTask",
      component: CreateTaskView,
      meta: {
        hideUserColumn: true,
        requiresAuth: true,
        authType: "operator",
        roles: ["operator", "admin"],
      },
    },
    {
      path: "/reportsList",
      name: "reportsList",
      component: ReportsListView,
      meta: {
        hideUserColumn: true,
        requiresAuth: true,
        authType: "operator",
        roles: ["operator", "admin"],
      },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: NotFoundView,
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const authType = to.meta.authType || null;
  const allowedRoles = to.meta.roles || null;

  // Allow public routes
  if (!requiresAuth) {
    next();
    return;
  }

  // Check authentication with token expiration validation
  const isAuthenticated = apiService.isAuthenticated();
  const role = apiService.getRole();

  if (authType === "user") {
    // Check if user is authenticated with valid token
    if (!isAuthenticated) {
      console.warn("No valid token found, redirecting to login");
      next("/login");
      return;
    }
    // Verify the role is citizen (not operator/admin)
    if (role && role !== "citizen") {
      console.warn("User role mismatch, expected citizen");
      next("/login");
      return;
    }
    next();
    return;
  }

  if (authType === "operator") {
    if (!isAuthenticated) {
      console.warn("No valid token found, redirecting to admin login");
      next("/admin");
      return;
    }

    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
      console.warn("Insufficient permissions for operator route");
      next("/admin");
      return;
    }

    next();
    return;
  }

  // Generic auth check (backward compatibility)
  if (!isAuthenticated) {
    console.warn("Authentication required, redirecting to login");
    next("/login");
    return;
  }

  next();
});

export default router;
