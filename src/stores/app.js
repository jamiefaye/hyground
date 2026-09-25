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
      parmLabels: true,     // a parmed constant's cell shows the knob's label (osc1) beside the value
      generate: false,      // the shuffle makes a sketch with the generator instead of loading an example (Alt does either way)
    },
    // The random sketch generator's settings (RandomHydra reads them live), one set for every editor;
    // the generator box (settings > Generator) edits them
    gen: {
      minFunctions: 3,
      maxFunctions: 8,
      minValue: 0,
      maxValue: 5,
      arrowFunctionProb: 10,   // chance of an argument being an arrow function
      mouseFunctionProb: 0,    // ... one that reads the mouse (() => mouse.x)
      modulateItselfProb: 20,  // chance a modulator takes o0 (modulate(o0, 1))
      exclusiveSourceList: [],
      exclusiveFunctionList: [],
      ignoredList: ['solid', 'brightness', 'luma', 'invert', 'posterize', 'thresh', 'layer', 'modulateScrollX', 'modulateScrollY'],
    },
  }),
  actions: {
    setFullscreen (value) {
      this.isFullscreen = value;
    },
  },
})
