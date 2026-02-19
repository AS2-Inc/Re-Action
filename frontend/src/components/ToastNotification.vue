<template>
  <transition name="toast-fade">
    <div v-if="visible" class="toast" :class="`toast-${type}`">
      <div class="toast-icon">
        <span v-if="type === 'success'">✓</span>
        <span v-else-if="type === 'error'">✕</span>
        <span v-else>ℹ</span>
      </div>
      <div class="toast-content">
        <div v-if="title" class="toast-title">{{ title }}</div>
        <div class="toast-message">{{ message }}</div>
      </div>
      <button class="toast-close" @click="hide">&times;</button>
    </div>
  </transition>
</template>

<script>
export default {
  name: "ToastNotification",
  data() {
    return {
      visible: false,
      message: "",
      title: "",
      type: "info", // success, error, info
      timer: null,
    };
  },
  methods: {
    show({ message, title = "", type = "info", duration = 3000 }) {
      this.message = message;
      this.title = title;
      this.type = type;
      this.visible = true;

      if (this.timer) clearTimeout(this.timer);

      if (duration > 0) {
        this.timer = setTimeout(() => {
          this.hide();
        }, duration);
      }
    },
    hide() {
      this.visible = false;
    },
  },
};
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  min-width: 300px;
  max-width: 90%;
  border-left: 5px solid #ccc;
  font-family: "Inter", sans-serif;
}

.toast-success {
  border-left-color: #4caf50;
}

.toast-error {
  border-left-color: #f44336;
}

.toast-info {
  border-left-color: #2196f3;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.toast-success .toast-icon {
  background-color: #e8f5e9;
  color: #4caf50;
}

.toast-error .toast-icon {
  background-color: #ffebee;
  color: #f44336;
}

.toast-info .toast-icon {
  background-color: #e3f2fd;
  color: #2196f3;
}

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.toast-message {
  font-size: 14px;
  color: #666;
  white-space: pre-line;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

/* Transitions */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
