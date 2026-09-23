<script setup lang="ts">

  import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
  import Hyground from './Hyground.vue';
  import Hydra from './Hydra.vue';
  import Editor from './Editor.vue';
  import LiveEditor from './LiveEditor.vue';
  import examples from '../examples.json';
  import { Mutator } from '../Mutator.js';
  import { Parser } from 'acorn';
  import { describeControls, parmSketch, renderValues } from '../Parm.js';
  import InActorPanel from './InActorPanel.vue';
  import { RandomHydra } from '../RandomHydra.js';
  import GenPanel from './GenPanel.vue';

  const props = defineProps({
    index: Number,
    showVid: Boolean,
    limit: Boolean,
    autoStage: Boolean,    // every sketch shown in the monitor goes to the stage too
    parmsToStage: Boolean, // parm sends the parmed sketch to the stage, as Shift does
    autoParm: Boolean,     // every sketch pulled into the monitor is parmed on arrival
    // On the stage: the stage is this view's monitor. `stage(text, info)` runs a sketch there, `renderer`
    // is the stage's Hydra (for parm re-evals), `live` lays the view over the picture with the live
    // editor as its text area, `text` is the sketch playing there (followed while not being typed in).
    live: Boolean,
    stage: Function,
    renderer: Object,
    text: String,
  });
  const emit = defineEmits(['hide', 'focusChanged']);
  // (the stage's text is the parmed code while a parm runs: the editor keeps the sketch as written)
  watch(() => props.text, t => { if (typeof t === 'string' && t !== nextSketch.value && !(parmed.value && t === parmed.value.code)) nextSketch.value = t; });
  const renderer = () => props.renderer || hydraRenderer;


  // BroadcastChannel for stage communication (replaces MsgBroker)
  const stageChannel = new BroadcastChannel('hydra-stage');
  let stageReady = false;

  stageChannel.onmessage = (event) => {
    if (event.data.type === 'stage-ready') {
      stageReady = true;
      console.log('Stage is ready');
    }
  };

  const sketch = ref('');
  const nextSketch = ref('');
  const title = ref('');
  const mutator = new Mutator;
  const filmOpen = ref(false);
  const sketchInfoRef = ref({});
  const genPopupOpen = ref(false);
  const previousSketch = ref(''); // Track the previous sketch sent to stage

  const stateObject = reactive({
    minFunctions: 3,
    maxFunctions: 8,
    minValue: 0, // Set your minValue
    maxValue: 5, // Set your maxValue

    arrowFunctionProb: 10, // Set your arrowFunctionProb
    mouseFunctionProb: 0, // Set your mouseFunctionProb
    mouseFunctionProb: 0, // Probabilities of generating an arrow function that uses mouse position (ex.: ():> mouse.x)
    modulateItselfProb: 20, // Probabilities of generating a modulation function with "o0" as argument (ex.: modulate(o0,1))
    exclusiveSourceList: [],
    exclusiveFunctionList: [],
    ignoredList: ['solid', 'brightness', 'luma', 'invert', 'posterize', 'thresh', 'layer', 'modulateScrollX', 'modulateScrollY'] });


  let hydraRenderer;
  let hydraCanvas;

  async function reportHydra (newH, newCanvas) {
    hydraRenderer = newH;
    hydraCanvas = newCanvas;
  }

  function sendToStage(sketchCode: string, info: object = {}) {
    stageChannel.postMessage({
      type: 'update',
      sketch: sketchCode,
      sketchInfo: info
    });
  }

  onMounted(() => {
    // Request stage presence announcement
    stageChannel.postMessage({ type: 'editor-ready' });
  });

  onBeforeUnmount(() => {
    stageChannel.close();
  });

  function changed (e, t) {
    nextSketch.value = e;
  }

  async function sendTargetHydra (evt) {
    // Check if shift key is pressed and we have a previous sketch to morph from
    if (evt && evt.shiftKey && previousSketch.value && previousSketch.value !== nextSketch.value) {
      setLocalSketch(nextSketch.value, false);
      await morphToStage(previousSketch.value, nextSketch.value);
    } else if (props.autoParm) {
      parmNow(nextSketch.value, { toStage: true });
    } else {
      setLocalSketch(nextSketch.value, true);
    }
  }

  // A sketch pulled into the monitor (random, mutate, InAct): parmed on arrival with Auto Parm on
  function showSketch (text) {
    if (props.autoParm) parmNow(text); else setLocalSketch(text);
  }

  // Send a sketch to the stage and remember it as the next morph's starting point (A=B)
  function stageSketch (text) {
    sendToStage(text, { ...sketchInfoRef.value });
    previousSketch.value = text;
  }

  // Show a sketch in the monitor; with Auto Stage on (or toStage) it goes to the stage too.
  // On the stage the monitor is the stage: the sketch runs there and nothing goes over the channel.
  function setLocalSketch (text, toStage = props.autoStage) {
    //console.log("Set Local Sketch to: " + text);
    sketch.value = text;
    if (props.stage) {
      props.stage(text, { ...sketchInfoRef.value });
      previousSketch.value = text;
      // no monitor Hydra to call evalDone here: this view's recorder hears what this view runs
      if (inActState && inActState.evalDone && renderer()) inActState.evalDone(renderer(), text, performance.now());
      return;
    }
    if (toStage) stageSketch(text);
  }

  async function morphToStage (fromSketch, toSketch) {
    // Create parameter interpolation steps
    const steps = await createParameterInterpolationSteps(fromSketch, toSketch);

    // Send each interpolated step
    for (let i = 0; i < steps.length; i++) {
      // Update the editor to show the current interpolation step
      nextSketch.value = steps[i];
      setLocalSketch(steps[i], true);

      // Wait between steps
      if (i < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    // Snap to the exact final target sketch to ensure consistency
    // This ensures the stage matches exactly what's in the local preview
    nextSketch.value = toSketch;
    setLocalSketch(toSketch, true);
  }

  async function createParameterInterpolationSteps (fromSketch, toSketch) {
    const steps = [];
    const numSteps = 8;

    try {
      // Parse both sketches to extract numeric parameters
      const fromParams = extractNumericParameters(fromSketch);
      const toParams = extractNumericParameters(toSketch);

      // Create interpolated versions
      for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps; // 0 to 1
        const interpolatedSketch = interpolateParameters(fromSketch, toSketch, fromParams, toParams, t);
        steps.push(interpolatedSketch);
      }
    } catch (error) {
      console.log('Parameter interpolation failed, falling back to simple transition:', error);
      // Fallback to simple transition
      steps.push(fromSketch);
      steps.push(toSketch);
    }

    return steps;
  }

  // The numeric literals of a sketch, in source order, with their spans: what Shift-morph interpolates.
  // Parsed, not scanned: a regex here used to pick up numbers in comments (a date in a credit line)
  // and morph them along with the parameters. Subscripts (o[1]) are left out; a parse error throws,
  // and the caller falls back to a plain cut.
  function extractNumericParameters (code) {
    const ast = Parser.parse(code, { ecmaVersion: 'latest', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true });
    const params = [];
    const skip = new Set(['type', 'start', 'end', 'loc', 'range']);
    const visit = (node) => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'Literal' && typeof node.value === 'number') {
        params.push({ value: node.value, start: node.start, end: node.end, original: node.raw });
        return;
      }
      if (node.type === 'MemberExpression') { visit(node.object); if (node.computed && node.property.type !== 'Literal') visit(node.property); return; }
      for (const key of Object.keys(node)) {
        if (skip.has(key)) continue;
        const child = node[key];
        if (Array.isArray(child)) child.forEach(visit);
        else if (child && typeof child.type === 'string') visit(child);
      }
    };
    visit(ast);
    return params;
  }

  function interpolateParameters (fromCode, toCode, fromParams, toParams, t) {
    // Use Hydra's array extensions for smooth interpolation
    // Create arrays for from/to values and use Hydra's built-in easing
    let result = fromCode;

    // Sort parameters by position (descending) to replace from end to start
    const sortedFromParams = [...fromParams].sort((a, b) => b.start - a.start);
    const sortedToParams = [...toParams].sort((a, b) => b.start - a.start);

    // Only interpolate if we have matching parameter counts
    const minCount = Math.min(sortedFromParams.length, sortedToParams.length);

    for (let i = 0; i < minCount; i++) {
      const fromParam = sortedFromParams[i];
      const toParam = sortedToParams[i];

      // Create interpolated value using Hydra-style array interpolation
      // Arrays can be used with .ease() and .smooth() in Hydra
      const fromVal = fromParam.value;
      const toVal = toParam.value;

      // Use smooth interpolation - this could be enhanced to use actual Hydra arrays
      const interpolatedVal = fromVal + (toVal - fromVal) * smoothStep(t);

      // Replace the parameter with interpolated value
      const beforeParam = result.substring(0, fromParam.start);
      const afterParam = result.substring(fromParam.end);
      const formattedVal = interpolatedVal.toFixed(2);

      result = beforeParam + formattedVal + afterParam;
    }

    return result;
  }

  function smoothStep (t) {
    // Smooth step function similar to Hydra's easing
    return t * t * (3 - 2 * t);
  }


  const hydraGen = new RandomHydra(stateObject);

  function getRandomInt (max) {
    return Math.floor(Math.random() * max);
  }
  // Connected to the crossing arrows icon.
  // shiftKey means call the generator.
  function randomHydra (evt) {
    let ska;
    if (genPopupOpen.value || evt.altKey) {
      ska = hydraGen.generateCode();
    } else {
      const sketchX = getRandomInt(examples.length);
      const sketche = examples[sketchX];
      console.log(sketche.sketch_id);
      title.value = sketche.sketch_id;
      const s64 = sketche.code;
      ska = decodeURIComponent(atob(s64));
    }
    nextSketch.value = ska;
    if (evt.shiftKey) sendTargetHydra(); else showSketch(ska);
  }


  function openGen (evt) {
    genPopupOpen.value = !genPopupOpen.value;
  }



  // Parmed: the dice turns a knob instead (no recompile; Shift: the same knob again). Meta still
  // changes a transform, which is a text change, so the sketch is re-parmed.
  function mutate (evt) {
    if (parmed.value && !evt.metaKey) { diceKnob(evt.shiftKey); return; }
    // Mutate the sketch as written, not the parmed one running in the monitor
    const base = parmed.value ? parmed.value.source : sketch.value;
    const newSk = mutator.mutate({ changeTransform: evt.metaKey }, base);
    nextSketch.value = newSk;
    if (parmed.value) parmNow(newSk, { toStage: parmed.value.toStage });
    else if (evt.shiftKey) sendTargetHydra(); else showSketch(newSk);
  }

  // The dice on a parmed sketch: pick a control (or the last one again) and set its knob to the
  // dice's roll, zero to twice the literal as written. Argument knobs are live uniforms, so the
  // picture changes without a compile; a variable's knob needs the re-eval any turn of it needs.
  let lastDiced = null;
  function diceKnob (again) {
    const controls = parmed.value.controls;
    if (!controls.length) return;
    const c = (again && controls.includes(lastDiced)) ? lastDiced : controls[Math.floor(Math.random() * controls.length)];
    lastDiced = c;
    let v = mutator.glitchRelToInit(c.value, c.value);
    if (c.curve === 'int') v = Math.max(1, Math.round(v));
    else if (c.curve === 'log') v = Math.max(v, c.min);   // a log knob has no zero
    console.log(`dice: ${c.label} ${c.value} -> ${v}`);
    setKnob(c, v);
  }

  // Set a parmed knob's value here and, if the parmed sketch is on the stage, there too (the
  // stage has its own window.parm; the EC4 reaches both, a set from here does not)
  function setKnob (c, v) {
    const s = window.parm && window.parm.slots.get(c.slot);
    if (!s) return;
    s.fn.set(v);
    if (parmed.value.toStage && !props.stage) stageChannel.postMessage({ type: 'parm-set', slot: c.slot, value: v });
    if (c.kind === 'assign') reevalParmed();
  }

  // A variable's knob is read once at eval: run the parmed sketch again, here and on the stage if it is there
  function reevalParmed () {
    if (!parmed.value) return;
    const { code, toStage } = parmed.value;
    const h = renderer();
    if (h) Promise.resolve(h.eval(code)).catch(err => console.error('Hydra eval error:', err));
    if (toStage && !props.stage) sendToStage(code, { ...sketchInfoRef.value });
  }

  // Connected to the knob icon: hand the sketch's constants to the EC4 (setup 14 PARM).
  // Not parmed: plain click parms (the editor keeps the sketch as written, the preview runs
  // the parmed one, an overlay shows the live values). Shift: send the parmed sketch to the
  // stage too (so do the Auto Stage and Parms to Stage boxes). Alt: labels by the literal's
  // first digit (osc5) instead of argument position (osc1). Meta: show the parmed sketch in
  // the editor.
  // Parmed: plain click closes (knobs let go, preview back to the sketch as written);
  // Alt (Option) bakes the live values into the editor.
  function parm (evt) {
    if (parmed.value) {
      if (evt.altKey) bakeParm(); else closeParm();
      return;
    }
    parmNow(nextSketch.value || sketch.value, {
      label: evt.altKey ? 'digit' : 'index',
      showCode: evt.metaKey,
      toStage: evt.shiftKey || props.autoStage || props.parmsToStage,
    });
  }

  // Parm a sketch and run the parmed one in the monitor (and on the stage when toStage).
  // A parm already running is dropped first; the new code's parm.begin() relabels the knobs.
  function parmNow (source, { label = 'index', showCode = false, toStage = props.autoStage || props.parmsToStage } = {}) {
    if (parmed.value) dropParm();
    const r = parmSketch(source, { label });
    console.log(`parm: ${r.controls.length} controls\n${describeControls(r.controls)}\n${r.code}`);
    parmed.value = { source, code: r.code, controls: r.controls, toStage };
    if (showCode) nextSketch.value = r.code;
    setLocalSketch(r.code, toStage);
    watchAssigns(r);
  }

  // A variable's knob (let x = 0.5 -> parm(...)()) is read once at eval, so a turn on one of
  // those re-evaluates the parmed sketch, at most every 150 ms. Argument knobs are live anyway.
  let parmUnlisten = null;
  function watchAssigns (r) {
    if (parmUnlisten) { parmUnlisten(); parmUnlisten = null; }
    const assignSlots = new Set(r.controls.filter(c => c.kind === 'assign').map(c => c.slot));
    if (!assignSlots.size || !window.midi) return;
    let timer = null;
    parmUnlisten = window.midi.onEvent((ev) => {
      if (ev.type !== 'cc' || !ev.registered || ev.number === undefined) return;
      const slot = ev.number + 1;   // PARM profile: CC (slot - 1)
      if (!assignSlots.has(slot) || timer) return;
      timer = setTimeout(() => { timer = null; reevalParmed(); }, 150);
    });
  }

  // Live view of the parmed sketch with the knobs' values written in place of its constants
  const parmed = ref(null);
  const parmView = ref('');
  const editorWrap = ref(null);
  const overlayStyle = ref({});
  // Copy CodeMirror's font and offsets so the overlay's characters land on the editor's
  function measureOverlay () {
    const wrap = editorWrap.value;
    const content = wrap && wrap.querySelector('.cm-content');
    const line = wrap && wrap.querySelector('.cm-line');
    if (!content) return;
    const cs = getComputedStyle(content);
    const wrapBox = wrap.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    overlayStyle.value = {
      font: cs.font,
      lineHeight: cs.lineHeight,
      paddingTop: (contentBox.top - wrapBox.top) + 'px',
      paddingLeft: (contentBox.left - wrapBox.left + (line ? parseFloat(getComputedStyle(line).paddingLeft) || 0 : 0)) + 'px',
    };
  }
  const parmTimer = setInterval(() => {
    if (!parmed.value) return;
    measureOverlay();
    const p = window.parm;
    const valueOf = (c) => { const s = p && p.slots.get(c.slot); return s ? s.fn() : undefined; };
    const v = renderValues(parmed.value.source, parmed.value.controls, valueOf);
    if (v !== parmView.value) parmView.value = v;
  }, 100);
  onBeforeUnmount(() => clearInterval(parmTimer));

  // The knobs let go: their slots lose their labels once nothing re-registers them
  // If the parmed sketch went to the stage, its release (baked or as written) follows it there
  function releaseParm (text) {
    const toStage = props.autoStage || parmed.value.toStage;
    dropParm();
    if (window.parm) window.parm.begin();
    setLocalSketch(text, toStage);
  }
  function dropParm () {
    parmed.value = null;
    if (parmUnlisten) { parmUnlisten(); parmUnlisten = null; }
  }
  // Bake: the live values become the sketch text
  function bakeParm () {
    if (!parmed.value) return;
    const baked = parmView.value;
    nextSketch.value = baked;
    releaseParm(baked);
  }
  // Close: back to the sketch as written
  function closeParm () {
    if (!parmed.value) return;
    releaseParm(parmed.value.source);
  }

  function toggleFilm (evt) {
    filmOpen.value = !filmOpen.value;
  }


  function updater (newV, sketchInfo, e, what) {
    nextSketch.value = newV;
    sketchInfoRef.value = sketchInfo;
    title.value='';
    if (what === 'step' || what === 'fast') {
      if (e.shiftKey){sendTargetHydra(e)}
      else {showSketch(nextSketch.value)}
    } else {
      sendTargetHydra(e)
    }

  }


  if (crossOriginIsolated) {
    console.log('***SharedArrayBuffer is available');
  } else {
    console.log('***SharedArrayBuffer is not available');
  }

  function getHydraRenderer () {
    return hydraRenderer;
  }

  let inActState;

  function reportInActorState (state) {
    inActState = state;
  }

  function evalDone (hydraRenderer, text, timeB4) {
    console.log(`evalDone ${timeB4}`);
    inActState.evalDone(hydraRenderer, text, timeB4);
  }

  // The live editor's Mod-Enter: the text runs where this view's monitor is (on the stage, the stage)
  const liveEditorRef = ref(null);
  function runLive (text) {
    nextSketch.value = text;
    sendTargetHydra();
  }
  defineExpose({ focus: () => liveEditorRef.value && liveEditorRef.value.focus() });

</script>


<template>
  <div class="editorview" :class="{ live }">
  <table><tbody><tr>
    <template v-if="showVid && !stage">
      <td>
        <Hydra
          :eval-done="evalDone"
          :height="108"
          :report-hydra="reportHydra"
          :sketch="sketch"
          :sketch-info="sketchInfoRef"
          :width="192"
        />
      </td>
    </template>
    <td>
      <v-container fluid><v-row class="ga-1">
        <v-tooltip text="Load Random Example (Alt: Generate Code)">
          <template #activator="{ props: tooltipProps }">
            <IFa6SolidShuffle v-bind="tooltipProps" @click="randomHydra" />
          </template>
        </v-tooltip>
        <v-tooltip text="Mutate Current Code (Shift: stage too, Meta: change a transform). Parmed: turns a knob, no recompile (Shift: the same knob again)">
          <template #activator="{ props: tooltipProps }">
            <IFa6SolidDiceD6 v-bind="tooltipProps" @click="mutate" />
          </template>
        </v-tooltip>
        <v-tooltip text="Parm: constants to knobs (Shift: stage too, Alt: digit labels, Meta: show code); again: close, Alt: bake">
          <template #activator="{ props: tooltipProps }">
            <IMdiKnob v-bind="tooltipProps" @click="parm" />
          </template>
        </v-tooltip>
        <!-- On the stage (live) the monitor is the stage, so Send has no meaning. The recorder stays: the stage
             panel's InActor hears everything the stage runs, this one only what this view runs (a dub) -->
        <v-tooltip v-if="!stage" text="Send to Stage">
          <template #activator="{ props: tooltipProps }">
            <ICarbonSendActionUsage v-bind="tooltipProps" @click="sendTargetHydra" />
          </template>
        </v-tooltip>
        <v-tooltip text="Generator Settings">
          <template #activator="{ props: tooltipProps }">
            <IFa6SolidSliders v-bind="tooltipProps" @click="(e)=>openGen(e)" />
          </template>
        </v-tooltip>
        <v-tooltip text="Record/Play Controls">
          <template #activator="{ props: tooltipProps }">
            <IFa6SolidFilm v-bind="tooltipProps" @click="toggleFilm" />
          </template>
        </v-tooltip>
      </v-row>
      </v-container>
      <template v-if="genPopupOpen">
        <GenPanel :obj="hydraGen" :state="stateObject" />
      </template>

      <InActorPanel
        :hidden="!filmOpen"
        :report-in-actor-state="reportInActorState"
        :script="sketch"
        :update-script="updater"
      />

      {{ title }}
    </td></tr></tbody></table>
  <div ref="editorWrap" class="editor-wrap" :class="{ parmed: !!parmed }">
    <LiveEditor
      v-if="live"
      ref="liveEditorRef"
      :text="nextSketch"
      @focus-changed="v => emit('focusChanged', v)"
      @hide="emit('hide')"
      @run="runLive"
      @text-changed="changed"
    />
    <Editor v-else :limit="limit" :text="nextSketch" @text-changed="changed" />
    <div v-if="parmed" class="parm-overlay" :style="overlayStyle">
      <pre>{{ parmView }}</pre>
      <span class="parm-actions"><button @click="bakeParm">bake</button> <button @click="closeParm">close</button></span>
    </div>
  </div>
  </div>
</template>

<style scoped>
.editor-wrap { position: relative; }
.editor-wrap.parmed :deep(.cm-editor) { opacity: 0.3; }
/* Over the text area of the editor, same font and offsets (set at runtime from CodeMirror's own), so the
   values sit where the constants are and the layout does not move */
.parm-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; color: #063; z-index: 6; }   /* above the live editor (5), or CodeMirror takes the bake/close clicks */
.parm-overlay pre { margin: 0; white-space: pre; font: inherit; }
.parm-actions { position: absolute; top: 2px; right: 6px; pointer-events: auto; font: 12px monospace; }
.parm-actions button { font: inherit; background: #333; color: #ddd; border: 1px solid #666; padding: 0 6px; margin-left: 4px; }
/* On the stage: the icon row on a dark strip at the top left, the live editor filling the rest of the picture */
.editorview.live { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; }
.editorview.live > table { background: rgba(0, 0, 0, 0.55); color: #fff; width: fit-content; border-radius: 0 0 6px 0; }
.editorview.live .editor-wrap { flex: 1; min-height: 0; }
.editorview.live .parm-overlay { color: #8f8; }
</style>
