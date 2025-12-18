<script setup>
import { useToastStore } from '@/stores/toast'
import { computed } from 'vue'

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
    <v-snackbar
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      v-model="toast.visible"
      :color="typeColors[toast.type]"
      :timeout="-1"
      location="bottom right"
      class="toast-snackbar"
      multi-line
    >
      <div class="d-flex align-center">
        <v-icon :icon="typeIcons[toast.type]" class="mr-2" />
        <div class="toast-content">
          <div class="toast-message">{{ toast.message }}</div>
          <div v-if="toast.details" class="toast-details text-caption mt-1">
            {{ toast.details }}
          </div>
        </div>
      </div>
      <template #actions>
        <v-btn
          variant="text"
          size="small"
          @click="toastStore.dismiss(toast.id)"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
}

.toast-snackbar {
  pointer-events: auto;
  position: relative !important;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  word-break: break-word;
}

.toast-details {
  opacity: 0.8;
  font-family: monospace;
  word-break: break-all;
}
</style>
