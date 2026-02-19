<template>
  <div
    class="reward-card"
    :class="{ 'reward-card--disabled': !canRedeemReward() }"
  >
    <div class="reward-header">
      <h3 class="reward-title">{{ reward.title }}</h3>
      <span class="reward-type" :class="`type-${reward.type.toLowerCase()}`">
        {{ formatRewardType(reward.type) }}
      </span>
    </div>

    <p class="reward-description">{{ reward.description }}</p>

    <div v-if="reward.provider" class="reward-provider">
      <span class="provider-label">Provider:</span>
      <span class="provider-value">{{ reward.provider }}</span>
    </div>

    <div class="reward-meta">
      <div class="meta-item">
        <span class="meta-label">Costo</span>
        <span class="meta-value points-cost">{{ reward.points_cost }} pt</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Disponibili</span>
        <span class="meta-value">{{ reward.quantity_available }}</span>
      </div>
      <div v-if="reward.expiry_date" class="meta-item">
        <span class="meta-label">Scade il</span>
        <span class="meta-value">{{ formatDate(reward.expiry_date) }}</span>
      </div>
    </div>

    <div class="reward-footer">
      <button
        class="btn redeem-btn"
        :disabled="!canRedeemReward() || isRedeeming"
        @click="handleRedeem"
      >
        <span v-if="!isRedeeming">
          {{ canRedeemReward() ? "Riscatta" : getRedeemErrorMessage() }}
        </span>
        <span v-else>Riscattando...</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "RewardCard",
  props: {
    reward: {
      type: Object,
      required: true,
    },
    userPoints: {
      type: Number,
      required: true,
    },
    isRedeeming: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["redeem"],
  methods: {
    canRedeemReward() {
      if (!this.reward.active) return false;
      if (this.reward.quantity_available <= 0) return false;
      if (
        this.reward.expiry_date &&
        new Date(this.reward.expiry_date) < new Date()
      ) {
        return false;
      }
      if (this.userPoints < this.reward.points_cost) return false;
      return true;
    },

    getRedeemErrorMessage() {
      if (!this.reward.active) return "Non disponibile";
      if (this.reward.quantity_available <= 0) return "Esaurito";
      if (
        this.reward.expiry_date &&
        new Date(this.reward.expiry_date) < new Date()
      ) {
        return "Scaduto";
      }
      if (this.userPoints < this.reward.points_cost) {
        return `Servono ${this.reward.points_cost - this.userPoints} pt`;
      }
      return "Riscatta";
    },

    handleRedeem() {
      if (this.canRedeemReward()) {
        this.$emit("redeem", this.reward);
      }
    },

    formatDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleDateString("it-IT", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },

    formatRewardType(type) {
      const typeMap = {
        COUPON: "Coupon",
        DIGITAL_BADGE: "Badge Digitale",
        PHYSICAL_ITEM: "Articolo Fisico",
      };
      return typeMap[type] || type;
    },
  },
};
</script>

<style scoped>
.reward-card {
  padding: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  background-color: #fbf8f0;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.reward-card:hover:not(.reward-card--disabled) {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.reward-card--disabled {
  opacity: 0.65;
  background: #e8e3d8;
  cursor: not-allowed;
}

.reward-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.reward-title {
  font-family: "Caladea", serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1f1f1f;
  margin: 0;
  flex: 1;
}

.reward-type {
  padding: 0.35rem 0.75rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.type-coupon {
  background: #e8f3d8;
  color: #2d5f2e;
}

.type-digital_badge {
  background: #d8e5f3;
  color: #1f3a5f;
}

.type-physical_item {
  background: #f3e8d8;
  color: #5f3a2d;
}

.reward-description {
  color: #555;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.4;
}

.reward-provider {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
}

.provider-label {
  color: #999;
  font-weight: 500;
}

.provider-value {
  color: #2d5f2e;
  font-weight: 600;
}

.reward-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  margin: 0.5rem 0;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  color: #999;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 0.95rem;
  color: #1f1f1f;
  font-weight: 600;
  font-family: "Caladea", serif;
}

.points-cost {
  color: #2d5f2e;
}

.reward-footer {
  margin-top: auto;
  padding-top: 0.75rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: #7f9e3e;
  color: white;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Caladea", serif;
}

.btn:hover:not(:disabled) {
  background: #1f3a1f;
  box-shadow: 0 4px 12px rgba(45, 95, 46, 0.2);
  transform: translateY(-1px);
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .reward-meta {
    grid-template-columns: 1fr;
  }
}
</style>
