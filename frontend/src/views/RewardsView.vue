<template>
  <div class="home">
    <div class="display">
        <div class="data-display">
          <Navbar :links="navLinks" />
          <h1 class="page-title">Premi</h1>

        <!-- User Points Summary -->
        <section class="points-summary">
          <div class="points-card">
            <span class="points-icon">⭐</span>
            <div class="points-info">
              <p class="points-label">I tuoi punti</p>
              <p class="points-value">{{ userPoints }}</p>
            </div>
          </div>
        </section>

        <hr class="section-sep" />

        <!-- My Redeemed Rewards -->
        <section class="my-rewards-section">
          <h2 class="section-title">Premi Riscattati</h2>
          <div v-if="loadingMyRewards" class="state state-loading">
            Caricamento premi riscattati...
          </div>
          <div v-else-if="errorMyRewards" class="state state-error">
            {{ errorMyRewards }}
          </div>
          <div v-else class="my-rewards-list">
            <div v-if="myRewards.length === 0" class="state state-empty">
              Non hai ancora riscattato nessun premio.
            </div>
            <div v-for="userReward in myRewards" :key="userReward._id" class="my-reward-item">
              <div v-if="userReward.reward_id" class="my-reward-header">
                <h3 class="my-reward-title">{{ userReward.reward_id.title }}</h3>
                <span class="my-reward-date">{{ formatDate(userReward.redeemed_at) }}</span>
              </div>
              <div v-else class="my-reward-header">
                <h3 class="my-reward-title">Premio non disponibile</h3>
                <span class="my-reward-date">{{ formatDate(userReward.redeemed_at) }}</span>
              </div>
              <p v-if="userReward.reward_id" class="my-reward-description">{{ userReward.reward_id.description }}</p>
              <p v-else class="my-reward-description">Il premio è stato rimosso dal sistema.</p>
              <div class="my-reward-footer">
                <span class="my-reward-code">Codice: <strong>{{ userReward.unique_code }}</strong></span>
                <span v-if="userReward.reward_id" class="my-reward-type" :class="`type-${userReward.reward_id.type.toLowerCase()}`">
                  {{ formatRewardType(userReward.reward_id.type) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <hr class="section-sep" />

        <!-- Available Rewards -->
        <section class="available-rewards-section">
          <h2 class="section-title">Premi Disponibili</h2>
          <div v-if="loadingRewards" class="state state-loading">
            Caricamento premi...
          </div>
          <div v-else-if="errorRewards" class="state state-error">
            {{ errorRewards }}
          </div>
          <div v-else class="rewards-grid">
            <div v-if="availableRewards.length === 0" class="state state-empty">
              Nessun premio disponibile al momento.
            </div>
            <RewardCard
              v-for="reward in availableRewards"
              :key="reward._id"
              :reward="reward"
              :user-points="userPoints"
              :is-redeeming="redeemingReward === reward._id"
              @redeem="redeemReward"
            />
          </div>
        </section>

        <!-- Redemption Success Modal -->
        <div v-if="showRedemptionModal" class="modal-overlay" @click="closeRedemptionModal">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2>Premio Riscattato! 🎉</h2>
              <button class="modal-close" @click="closeRedemptionModal">&times;</button>
            </div>
            <div class="modal-body">
              <p class="redemption-message">
                Hai riscattato con successo: <strong>{{ lastRedeemedReward.title }}</strong>
              </p>
              <div class="redemption-code-container">
                <label class="code-label">Il tuo codice:</label>
                <div class="code-display">
                  <span class="code-value">{{ lastRedeemedReward.code }}</span>
                  <button class="copy-btn" @click="copyCodeToClipboard">
                    {{ codeCopied ? "Copiato!" : "Copia" }}
                  </button>
                </div>
              </div>
              <p class="redemption-info">
                I tuoi punti rimanenti: <strong>{{ lastRedeemedReward.pointsRemaining }}</strong>
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" @click="closeRedemptionModal">Chiudi</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Navbar from "@/components/Navbar.vue";
import RewardCard from "@/components/RewardCard.vue";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default {
  name: "RewardsView",
  components: {
    Navbar,
    RewardCard,
  },
  data() {
    return {
      navLinks: [
        { label: "Tasks", to: "/tasks" },
        { label: "Stats", to: "/stats" },
        { label: "Leaderboard", to: "/leaderboard" },
        { label: "Premi", to: "/rewards" },
        { label: "Profilo", to: "/profile" },
      ],
      userPoints: 0,
      availableRewards: [],
      myRewards: [],
      loadingRewards: false,
      loadingMyRewards: false,
      errorRewards: "",
      errorMyRewards: "",
      redeemingReward: null,
      showRedemptionModal: false,
      lastRedeemedReward: {
        title: "",
        code: "",
        pointsRemaining: 0,
      },
      codeCopied: false,
    };
  },
  async mounted() {
    await Promise.all([
      this.fetchUserPoints(),
      this.fetchRewards(),
      this.fetchMyRewards(),
    ]);
  },
  methods: {
    async fetchUserPoints() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: { "x-access-token": token },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user points");
        }

        const userData = await response.json();
        this.userPoints = userData.points || 0;
      } catch (error) {
        console.error("Error fetching user points:", error);
      }
    },

    async fetchRewards() {
      this.loadingRewards = true;
      this.errorRewards = "";

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/v1/rewards`, {
          headers: { "x-access-token": token },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch rewards");
        }

        this.availableRewards = await response.json();
      } catch (error) {
        console.error("Error fetching rewards:", error);
        this.errorRewards = "Errore nel caricamento dei premi";
      } finally {
        this.loadingRewards = false;
      }
    },

    async fetchMyRewards() {
      this.loadingMyRewards = true;
      this.errorMyRewards = "";

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE_URL}/api/v1/rewards/my-rewards`,
          {
            headers: { "x-access-token": token },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch my rewards");
        }

        this.myRewards = await response.json();
      } catch (error) {
        console.error("Error fetching my rewards:", error);
        this.errorMyRewards = "Errore nel caricamento dei tuoi premi";
      } finally {
        this.loadingMyRewards = false;
      }
    },

    async redeemReward(reward) {
      if (!reward || !reward._id) {
        return;
      }

      this.redeemingReward = reward._id;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE_URL}/api/v1/rewards/${reward._id}/redeem`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-access-token": token,
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to redeem reward");
        }

        const result = await response.json();

        // Update UI with redemption success
        this.lastRedeemedReward = {
          title: result.reward_title,
          code: result.code,
          pointsRemaining: result.points_remaining,
        };
        this.userPoints = result.points_remaining;
        this.showRedemptionModal = true;
        this.codeCopied = false;

        // Refresh rewards lists
        await Promise.all([this.fetchRewards(), this.fetchMyRewards()]);
      } catch (error) {
        console.error("Error redeeming reward:", error);
        alert(`Errore: ${error.message}`);
      } finally {
        this.redeemingReward = null;
      }
    },

    closeRedemptionModal() {
      this.showRedemptionModal = false;
    },

    copyCodeToClipboard() {
      navigator.clipboard.writeText(this.lastRedeemedReward.code);
      this.codeCopied = true;
      setTimeout(() => {
        this.codeCopied = false;
      }, 2000);
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
.home {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  width: 100%;
  height: 100%;
}

.display {
  margin-left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
}

.data-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  width: 100%;
}

.page-title {
  padding: 1.2rem;
  font-family: "Caladea", serif;
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
  color: #1f1f1f;
}

.section-sep {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin: 2rem 0;
  width: 100%;
  max-width: 1200px;
}

/* Points Summary Section */
.points-summary {
  margin: 1rem 2rem 0;
  width: calc(100% - 4rem);
  max-width: 1200px;
}

.points-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background-color: #fbf8f0;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.points-icon {
  font-size: 3rem;
}

.points-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.points-label {
  font-family: "Caladea", serif;
  font-size: 0.95rem;
  color: #666;
  margin: 0;
  font-weight: 600;
}

.points-value {
  font-family: "Caladea", serif;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

/* My Rewards Section */
.my-rewards-section {
  margin: 2rem 2rem 0;
  width: calc(100% - 4rem);
  max-width: 1200px;
}

.section-title {
  font-family: "Caladea", serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f1f1f;
  margin: 0 0 1.5rem;
}

.my-rewards-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.my-reward-item {
  padding: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background-color: #fbf8f0;
  transition: all 0.3s ease;
}

.my-reward-item:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.my-reward-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.my-reward-title {
  font-family: "Caladea", serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f1f1f;
  margin: 0;
}

.my-reward-date {
  font-size: 0.85rem;
  color: #999;
  white-space: nowrap;
}

.my-reward-description {
  color: #555;
  margin: 0.5rem 0 1rem;
  font-size: 0.95rem;
}

.my-reward-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.my-reward-code {
  font-size: 0.9rem;
  color: #666;
}

.my-reward-code strong {
  font-family: "Courier New", monospace;
  color: #2d5f2e;
  font-weight: 600;
}

.my-reward-type {
  padding: 0.35rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
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

/* Available Rewards Section */
.available-rewards-section {
  margin: 2rem 2rem 0;
  width: calc(100% - 4rem);
  max-width: 1200px;
}

.rewards-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 0;
  margin: 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-family: "Caladea", serif;
  font-weight: 700;
  color: #1f1f1f;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 2rem;
}

.redemption-message {
  font-size: 1.1rem;
  color: #333;
  margin: 0 0 1.5rem;
  text-align: center;
  font-family: "Caladea", serif;
  font-weight: 600;
}

.redemption-code-container {
  background: #fbf8f0;
  padding: 1.5rem;
  border-radius: 12px;
  margin: 1.5rem 0;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.code-label {
  display: block;
  font-size: 0.85rem;
  color: #999;
  margin-bottom: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-display {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.code-value {
  flex: 1;
  font-family: "Courier New", monospace;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d5f2e;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  word-break: break-all;
}

.copy-btn {
  padding: 0.75rem 1rem;
  background: #2d5f2e;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-family: "Caladea", serif;
}

.copy-btn:hover {
  background: #1f3a1f;
  box-shadow: 0 4px 12px rgba(45, 95, 46, 0.2);
}

.redemption-info {
  text-align: center;
  color: #555;
  margin: 1rem 0 0;
  font-family: "Caladea", serif;
  font-weight: 600;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: "Caladea", serif;
}

.btn-primary {
  background: #2d5f2e;
  color: white;
}

.btn-primary:hover {
  background: #1f3a1f;
  box-shadow: 0 4px 12px rgba(45, 95, 46, 0.2);
}

/* State Messages */
.state {
  font-family: "Caladea", serif;
  font-weight: 600;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  background-color: #f1ecdf;
  color: #1f1f1f;
  text-align: center;
  font-size: 0.95rem;
}

.state-loading {
  background-color: #f1ecdf;
  color: #1f1f1f;
}

.state-error {
  background-color: #e7e0cf;
  color: #1f1f1f;
}

.state-empty {
  background-color: #f1ecdf;
  color: #1f1f1f;
}

/* Responsive */
@media (max-width: 768px) {
  .data-display {
    padding: 0;
  }

  .page-title {
    font-size: 1.5rem;
    padding-top: 0.75rem;
    margin: 0.5rem 1rem 0;
  }

  .points-summary,
  .my-rewards-section,
  .available-rewards-section {
    margin: 1rem 1rem 0;
    width: calc(100% - 2rem);
  }

  .section-sep {
    margin: 1.5rem 0;
  }

  .points-card {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }

  .points-icon {
    font-size: 2rem;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .reward-meta {
    grid-template-columns: 1fr;
  }

  .my-reward-header {
    flex-direction: column;
  }

  .my-reward-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-title {
    font-size: 1.3rem;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.3rem;
    padding-top: 0.5rem;
    margin: 0.5rem 1rem 0;
  }

  .points-summary,
  .my-rewards-section,
  .available-rewards-section {
    margin: 0.75rem 1rem 0;
    width: calc(100% - 2rem);
  }

  .reward-header {
    flex-direction: column;
  }

  .modal-content {
    width: 95%;
  }

  .code-display {
    flex-direction: column;
  }

  .copy-btn {
    width: 100%;
  }

  .section-title {
    font-size: 1.1rem;
  }
}
</style>
