<template>
  <div class="badge-card">
    <div class="badge-icon">{{ badge.icon }}</div>
    <div class="badge-body">
      <div class="badge-header">
        <h3 class="badge-title">{{ badge.name }}</h3>
        <span class="badge-category">{{ badge.category }}</span>
      </div>
      <p class="badge-description">{{ badge.description }}</p>
      <p class="badge-threshold">Soglia: {{ thresholdText }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: "BadgeMockCard",
  props: {
    badge: {
      type: Object,
      required: true,
    },
  },
  computed: {
    thresholdText() {
      const req = this.badge?.requirements || {};

      if (req.min_points) return `${req.min_points} punti`;
      if (req.min_tasks_completed) return `${req.min_tasks_completed} task`;
      if (req.min_streak) return `${req.min_streak} giorni di streak`;
      if (req.min_co2_saved) return `${req.min_co2_saved} kg CO2`;
      if (req.min_waste_recycled) return `${req.min_waste_recycled} kg rifiuti`;
      if (req.min_km_green) return `${req.min_km_green} km verdi`;

      if (req.tasks_by_category) {
        const [category, value] =
          Object.entries(req.tasks_by_category)[0] || [];
        if (category && value) {
          return `${value} task ${category.toLowerCase()}`;
        }
      }

      return "";
    },
  },
};
</script>

<style scoped>
.badge-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: #dcd8bb;
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.badge-icon {
  font-size: 1.8rem;
}

.badge-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.badge-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.badge-title {
  margin: 0;
  font-family: "Caladea", serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
}

.badge-category {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
  text-transform: uppercase;
}

.badge-description {
  margin: 0;
  font-size: 0.95rem;
  color: #444;
}

.badge-threshold {
  margin: 0;
  font-size: 0.9rem;
  color: #555;
}
</style>
