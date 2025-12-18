// Toast notification store for displaying errors and messages
import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [],
    nextId: 0,
    // Track recent messages to avoid flooding
    recentMessages: new Map(),
  }),

  actions: {
    // Add a toast notification
    // type: 'error' | 'warning' | 'success' | 'info'
    show({ message, type = 'info', timeout = 5000, details = null }) {
      // Deduplicate: don't show same message within 2 seconds
      const now = Date.now()
      const key = `${type}:${message}`
      const lastShown = this.recentMessages.get(key)
      if (lastShown && now - lastShown < 2000) {
        return // Skip duplicate
      }
      this.recentMessages.set(key, now)

      // Clean up old entries from recentMessages
      if (this.recentMessages.size > 50) {
        for (const [k, v] of this.recentMessages) {
          if (now - v > 10000) this.recentMessages.delete(k)
        }
      }

      const id = this.nextId++
      this.toasts.push({
        id,
        message,
        type,
        timeout,
        details,
        visible: true,
      })

      // Auto-remove after timeout
      if (timeout > 0) {
        setTimeout(() => this.dismiss(id), timeout)
      }
    },

    // Convenience methods
    error(message, details = null) {
      this.show({ message, type: 'error', timeout: 8000, details })
    },

    warning(message, details = null) {
      this.show({ message, type: 'warning', timeout: 6000, details })
    },

    success(message) {
      this.show({ message, type: 'success', timeout: 3000 })
    },

    info(message) {
      this.show({ message, type: 'info', timeout: 4000 })
    },

    // Dismiss a specific toast
    dismiss(id) {
      const index = this.toasts.findIndex(t => t.id === id)
      if (index !== -1) {
        this.toasts[index].visible = false
        // Remove from array after animation
        setTimeout(() => {
          const idx = this.toasts.findIndex(t => t.id === id)
          if (idx !== -1) this.toasts.splice(idx, 1)
        }, 300)
      }
    },

    // Clear all toasts
    clear() {
      this.toasts = []
    },
  },
})
