// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isFullscreen: false,
    drawerWasOpen: false,
  }),
  actions: {
    setFullscreen (value) {
      this.isFullscreen = value;
    },
    setDrawerWasOpen (value) {
      this.drawerWasOpen = value;
    },
  },
})
