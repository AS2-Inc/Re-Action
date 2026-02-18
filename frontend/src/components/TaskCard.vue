<template>
  <div
    class="task-card"
    @click="handleClick"
    :class="{
      'task-card--clickable':
        task.verification_method === 'QUIZ' ||
        (task.verification_method === 'PHOTO_UPLOAD' &&
          task.submission_status !== 'PENDING'),
    }"
  >
    <div class="task-header">
      <h2 class="task-title">{{ task.title }}</h2>
      <div class="task-status-container">
        <span
          v-if="task.submission_status === 'PENDING'"
          class="task-status status-pending"
        >
          In Revisione
        </span>
        <span
          v-if="task.frequency === 'on_demand' || task.frequency === 'daily'"
          class="task-repeatable"
        >
          RIPETIBILE
        </span>
      </div>
    </div>
    <p class="task-description">{{ task.description || "Nessuna descrizione" }}</p>

    <div class="task-meta">
      <div class="meta-item">
        <span class="meta-label">Categoria</span>
        <span class="meta-value">{{ formatProperty(task.category) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Difficoltà</span>
        <span class="meta-value">{{ formatProperty(task.difficulty) || "-" }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Punti</span>
        <span class="meta-value">{{ task.base_points }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Frequenza</span>
        <span class="meta-value">{{ formatProperty(task.frequency) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Verifica</span>
        <span class="meta-value">{{ formatProperty(task.verification_method) }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Tempo rimanente</span>
        <span class="meta-value">
          {{ task.expires_at ? formatTimeUntil(task.expires_at) : "N/A" }}
        </span>
      </div>
    </div>

    <div v-if="hasImpactMetrics(task)" class="task-impact">
      <div
        v-if="(task.impact_metrics?.co2_saved ?? 0) > 0"
        class="impact-item"
      >
        <span class="impact-label">CO2</span>
        <span class="impact-value">
          {{ task.impact_metrics?.co2_saved }} kg
        </span>
      </div>
      <div
        v-if="(task.impact_metrics?.waste_recycled ?? 0) > 0"
        class="impact-item"
      >
        <span class="impact-label">Rifiuti</span>
        <span class="impact-value">
          {{ task.impact_metrics?.waste_recycled }} kg
        </span>
      </div>
      <div
        v-if="(task.impact_metrics?.distance ?? 0) > 0"
        class="impact-item"
      >
        <span class="impact-label">Distanza</span>
        <span class="impact-value">
          {{ task.impact_metrics?.distance }} km
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TaskCard",
  props: {
    task: {
      type: Object,
      required: true,
    },
  },
  methods: {
    handleClick() {
      if (this.task.submission_status === "PENDING") return;
      this.$emit("task-click", this.task);
    },
    statusClass(status) {
      if (status === "COMPLETED") return "status-completed";
      if (status === "EXPIRED") return "status-expired";
      return "status-assigned";
    },
    formatProperty(value) {
      if (!value) return "-";
      // Convert snake_case and UPPER_CASE to Title Case with spaces
      return value
        .replace(/_/g, " ")
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    },
    hasImpactMetrics(task) {
      const metrics = task.impact_metrics || {};
      return (
        (metrics.co2_saved ?? 0) > 0 ||
        (metrics.waste_recycled ?? 0) > 0 ||
        (metrics.distance ?? 0) > 0
      );
    },
    formatExpiresAt(value) {
      const date = new Date(value);
      return date.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatTimeUntil(value) {
      const now = new Date();
      const end = new Date(value);
      const diffMs = end - now;
      if (Number.isNaN(diffMs)) return "N/A";
      if (diffMs <= 0) return "Scaduto";

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) return `${days}g ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    },
  },
};
</script>

<style scoped>
.task-card {
  background-color: #fbf8f0;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.task-card--clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.task-card--clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.task-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.task-status-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.task-title {
  font-family: "Caladea", serif;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

.task-status {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.task-repeatable {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #add8e6;
  color: #1f1f1f;
}

.status-assigned {
  background-color: #e2ead1;
  color: #1f1f1f;
}

.status-pending {
  background-color: #ffd700;
  color: #1f1f1f;
}

.status-completed {
  background-color: #cfe1b4;
  color: #1f1f1f;
}

.status-expired {
  background-color: #e7e0cf;
  color: #1f1f1f;
}

.task-description {
  margin: 0;
  color: #2a2a2a;
  font-family: "Caladea", serif;
}

.task-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.meta-label {
  font-size: 0.75rem;
  color: #3d3d3d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-weight: 600;
  color: #1f1f1f;
}

.task-impact {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.impact-item {
  background-color: #efe9db;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.impact-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #3d3d3d;
}

.impact-value {
  font-weight: 600;
  color: #1f1f1f;
}
</style>
