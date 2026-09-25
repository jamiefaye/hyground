<script setup lang="ts">
  // Settings: the stage's modes and the editors' options, in one box (gear on the stage's row).
  // Stage options are HydraStage's panelParams; editor options are the app store's prefs, read by
  // the Editors panel, the popup and the live view alike.
  import { useAppStore } from '@/stores/app';

  const props = defineProps({
    params: Object,
    syphonAvailable: Boolean,
    openGenerator: Function,   // shows and hides the generator's own box (HydraStage)
  });
  const prefs = useAppStore().prefs;
</script>

<template>
  <div class="settings">
    <h4>Stage</h4>
    <label title="Transition effects between sketches (two source Hydras crossfaded)"><input v-model="props.params.fx" type="checkbox"> Fx</label>
    <label title="WebGPU shading language"><input v-model="props.params.wgsl" type="checkbox"> wgsl</label>
    <label title="Core renderer interface (plugin architecture)"><input v-model="props.params.useCoreRenderer" type="checkbox"> Core</label>
    <label title="Quad rendering"><input v-model="props.params.quad" type="checkbox"> Quad</label>
    <label title="Morph between sketches as they arrive"><input v-model="props.params.morph" type="checkbox"> Morph</label>
    <label v-if="props.syphonAvailable" title="Output to Syphon"><input v-model="props.params.syphon" type="checkbox"> Syphon</label>
    <h4>Editors</h4>
    <label title="A monitor beside each editor"><input v-model="prefs.monitors" type="checkbox"> Monitors</label>
    <label title="Short editors"><input v-model="prefs.limitHeight" type="checkbox"> Limit height</label>
    <label title="Whatever is pulled into a monitor goes to the stage too"><input v-model="prefs.autoStage" type="checkbox"> Auto stage</label>
    <label title="Parm sends the parmed sketch to the stage (as Shift does)"><input v-model="prefs.parmsToStage" type="checkbox"> Parms to stage</label>
    <label title="Whatever is pulled in (a monitor, or the stage when live) is parmed on arrival: constants to knobs"><input v-model="prefs.autoParm" type="checkbox"> Auto parm</label>
    <label title="A parmed constant shows the knob's label (osc1) beside its value; off, the value alone"><input v-model="prefs.parmLabels" type="checkbox"> Parm labels</label>
    <h4>Generator</h4>
    <label title="The shuffle makes a sketch with the generator instead of loading a random example (Alt-click does either way)"><input v-model="prefs.generate" type="checkbox"> Generate</label>
    <button class="settings-button" title="The generator's settings: how many functions, argument ranges, which sources and functions" @click="props.openGenerator && props.openGenerator()">Generator settings…</button>
  </div>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; gap: 4px; font: 13px sans-serif; color: #111; padding: 4px 8px 8px; }
.settings h4 { margin: 6px 0 2px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
.settings label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.settings-button { align-self: flex-start; font: inherit; padding: 2px 8px; margin-top: 2px; background: #f4f4f4; border: 1px solid #aaa; border-radius: 3px; cursor: pointer; }
.settings-button:hover { background: #e8e8e8; }
</style>
