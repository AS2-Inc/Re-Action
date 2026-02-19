<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Scannerizza QR Code</h2>
      </div>
      <div class="modal-body">
        <div class="qr-reader-frame">
          <div id="qr-reader"></div>
        </div>
        <p v-if="_error" class="error-message">{{ _error }}</p>
      </div>
      <div class="modal-footer">
        <button
          class="btn btn-outline"
          @click="close"
          :disabled="loading"
        >
          Annulla
        </button>
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
      _error: null,
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

      this._error = null;
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
          console._error("Error starting scanner", e);
          this._error =
            "Impossibile avviare la fotocamera. Verifica i permessi.";
        }
      }, 100);
    },
    stopScanner() {
      if (this.scanner) {
        try {
          this.scanner.clear().catch((_error) => {
            console._error("Failed to clear html5-qrcode scanner. ", _error);
          });
        } catch (e) {
          console._error("Error stopping scanner", e);
        }
        this.scanner = null;
      }
    },
    onScanSuccess(decodedText, _decodedResult) {
      this.$emit("scanned", decodedText);
      // We don't close immediately here, the parent handles it or we call close()
      // but usually we want to stop scanning once successful
      this.stopScanner();
      this.close();
    },
    onScanFailure(_error) {
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
  background-color: #f7f2e7;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: "Caladea", serif;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.modal-title {
  font-family: "Caladea", serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f1f1f;
}

.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 1rem;
}

.qr-reader-frame {
  width: 100%;
  background-color: #fff7ea;
  border-radius: 8px;
  padding: 0.75rem;
  border: 1px solid #e2d7c7;
}


#qr-reader {
  width: 100%;
}


.error-message {
  color: #b91c1c;
  background-color: #ffebee;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  width: 100%;
  text-align: center;
}


.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}


.btn {
  font-family: "Caladea", serif;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #a9ca5f;
  color: #1f1f1f;
}

.btn-primary:hover:not(:disabled) {
  background-color: #98bc50;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  background-color: transparent;
  color: #1f1f1f;
  border: 1px solid #1f1f1f;
}

.btn-outline:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
