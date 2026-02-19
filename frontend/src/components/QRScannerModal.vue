<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Scannerizza QR Code</h2>
      </div>
      <div class="modal-body">
        <div id="qr-reader"></div>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Annulla</button>
      </div>
    </div>
  </div>
</template>

<script>
import { Html5QrcodeScanner } from "html5-qrcode";

export default {
  name: "QRScannerModal",
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      scanner: null,
      error: null,
    };
  },
  watch: {
    isOpen(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.startScanner();
        });
      } else {
        this.stopScanner();
      }
    },
  },
  methods: {
    startScanner() {
      if (this.scanner) return;

      this.error = null;
      // Initialize after DOM is updated
      // We need to wait for the element to be present
      setTimeout(() => {
        try {
          this.scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false,
          );
          this.scanner.render(this.onScanSuccess, this.onScanFailure);
        } catch (e) {
          console.error("Error starting scanner", e);
          this.error =
            "Impossibile avviare la fotocamera. Verifica i permessi.";
        }
      }, 100);
    },
    stopScanner() {
      if (this.scanner) {
        try {
          this.scanner.clear().catch((error) => {
            console.error("Failed to clear html5-qrcode scanner. ", error);
          });
        } catch (e) {
          console.error("Error stopping scanner", e);
        }
        this.scanner = null;
      }
    },
    onScanSuccess(decodedText, decodedResult) {
      this.$emit("scanned", decodedText);
      // We don't close immediately here, the parent handles it or we call close()
      // but usually we want to stop scanning once successful
      this.stopScanner();
      this.close();
    },
    onScanFailure(error) {
      // console.warn(`Code scan error = ${error}`);
    },
    close() {
      this.stopScanner();
      this.$emit("close");
    },
  },
  beforeUnmount() {
    this.stopScanner();
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-header h2 {
  font-family: "Caladea", serif;
  margin: 0;
  color: #1f1f1f;
}

.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

#qr-reader {
  width: 100%;
}

.error-message {
  color: #dc3545;
  margin-top: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  font-family: "Inter", sans-serif;
}

.btn-secondary {
  background-color: #f1f1f1;
  color: #1f1f1f;
}
</style>
