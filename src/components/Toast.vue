<script setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const typeColors = {
  error: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
}

const typeIcons = {
  error: 'mdi-alert-circle',
  warning: 'mdi-alert',
  success: 'mdi-check-circle',
  info: 'mdi-information',
}
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast">
      <v-alert
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :type="typeColors[toast.type]"
        :icon="typeIcons[toast.type]"
        closable
        class="toast-alert"
        elevation="8"
        @click:close="toastStore.dismiss(toast.id)"
      >
        <div class="toast-message">{{ toast.message }}</div>
        <div v-if="toast.details" class="toast-details">
          {{ toast.details }}
        </div>
      </v-alert>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 500px;
  width: 90vw;
}

.toast-alert {
  pointer-events: auto;
}

.toast-message {
  word-break: break-word;
}

.toast-details {
  opacity: 0.85;
  font-family: monospace;
  font-size: 0.85em;
  margin-top: 4px;
  word-break: break-all;
}

/* Transition animations */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
