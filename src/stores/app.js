// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isFullscreen: false,
    // Editor preferences (the settings panel edits them; Editors and the live view read them)
    prefs: {
      monitors: true,       // a monitor Hydra beside each editor
      limitHeight: false,   // short editors
      autoStage: false,     // whatever lands in a monitor goes to the stage too
      parmsToStage: false,  // parm sends the parmed sketch to the stage (as Shift does)
      autoParm: false,      // whatever lands in a monitor (or on the stage, live) is parmed on arrival
    },
  }),
  actions: {
    setFullscreen (value) {
      this.isFullscreen = value;
    },
  },
})
