<script setup lang="ts">

  import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import Hyground from './Hyground.vue';
  import Hydra from './Hydra.vue';
  import Editor from './Editor.vue';
  import examples from '../examples.json';
  import { Mutator } from '../Mutator.js';
  import InActorPanel from './InActorPanel.vue';
  import { RandomHydra } from '../RandomHydra.js';
  import GenPanel from './GenPanel.vue';

  const props = defineProps({
    index: Number,
    showVid: Boolean,
    limit: Boolean,
  });


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
    setLocalSketch(nextSketch.value);

    // Check if shift key is pressed and we have a previous sketch to morph from
    if (evt && evt.shiftKey && previousSketch.value && previousSketch.value !== nextSketch.value) {
      await morphToStage(previousSketch.value, nextSketch.value);
    } else {
      sendToStage(nextSketch.value, { ...sketchInfoRef.value });
    }

    // Always update the previous sketch to current for next morph (A=B)
    previousSketch.value = nextSketch.value;
  }

  function setLocalSketch (text) {
    //console.log("Set Local Sketch to: " + text);
    sketch.value = text;
  }

  async function morphToStage (fromSketch, toSketch) {
    // Create parameter interpolation steps
    const steps = await createParameterInterpolationSteps(fromSketch, toSketch);

    // Send each interpolated step
    for (let i = 0; i < steps.length; i++) {
      // Update the editor to show the current interpolation step
      nextSketch.value = steps[i];
      setLocalSketch(steps[i]);

      sendToStage(steps[i], { ...sketchInfoRef.value });

      // Wait between steps
      if (i < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    // Snap to the exact final target sketch to ensure consistency
    // This ensures the stage matches exactly what's in the local preview
    nextSketch.value = toSketch;
    setLocalSketch(toSketch);
    sendToStage(toSketch, { ...sketchInfoRef.value });
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

  function extractNumericParameters (code) {
    // More precise regex - matches numbers in function parameters
    // Looks for numbers that are function arguments (after parentheses or commas)
    const params = [];
    const numberRegex = /[(\s,](\d+\.?\d*)/g;
    let match;

    while ((match = numberRegex.exec(code)) !== null) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        params.push({
          value,
          start: match.index + 1, // Skip the preceding character
          end: match.index + match[0].length,
          original: match[1],
        });
      }
    }

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
    setLocalSketch(ska);
    if (evt.shiftKey) sendTargetHydra();
  }


  function openGen (evt) {
    genPopupOpen.value = !genPopupOpen.value;
  }



  function mutate (evt) {
    const newSk = mutator.mutate({ changeTransform: evt.metaKey }, sketch.value);
    nextSketch.value = newSk;
    setLocalSketch(nextSketch.value);
    if (evt.shiftKey) sendTargetHydra();
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
      else {setLocalSketch(nextSketch.value)}
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

</script>


<template>
  <table><tbody><tr>
    <template v-if="showVid">
      <td>
        <Hydra
          :key="sketch"
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
        <v-tooltip text="Mutate Current Code">
          <template #activator="{ props: tooltipProps }">
            <IFa6SolidDiceD6 v-bind="tooltipProps" @click="mutate" />
          </template>
        </v-tooltip>
        <v-tooltip text="Send to Stage">
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
  <Editor :limit="limit" :text="nextSketch" @text-changed="changed" />
</template>
