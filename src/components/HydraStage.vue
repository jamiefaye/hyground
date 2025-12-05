<script setup lang="ts">
  import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
  import Hydra from './Hydra.vue';
  import InActorPanel from './InActorPanel.vue';
  import { Hydra as HydraEngine, getSharedDevice } from 'hydra-synth';
  import StagePanel from './StagePanel.vue';
  import Editors from './Editors.vue'
  import { HydraSketchMorpher } from '../HydraSketchMorpher.js';
  const props = defineProps({
    show: Boolean,
  });

  let hydraRenderer;
  let fxHydra;
  let fxCanvas;

  // Shared device Hydras for FX sources (replaces BGSynth workers)
  const sharedDeviceRef = ref(null);
  let sourceHydras: any[] = [null, null];
  let sourceCanvases: OffscreenCanvas[] = [];

  //  const fxSketch = ref("src(s2).out()");
  const fxSketch = ref('');

  let fxsketchInfo = {};

  const frameTime = 16;

  let fxLoaded = false;
  const fxActiveRef = ref(false);
  const widthRef = ref(window.innerWidth);
  const heightRef = ref(window.innerHeight);

  const hidePanel = ref(false);

  const panelParams = reactive({
    fx: false,
    wgsl: false,
    quad: false,
    morph: false,
  });

  // Morph state
  const morpher = new HydraSketchMorpher();
  let lastSketch = '';
  let currentSketch = '';
  let morphInterval = null;

  function reverseMorph() {
    if (!lastSketch || !currentSketch || lastSketch === currentSketch) return;
    // Swap and trigger morph back
    const target = lastSketch;
    lastSketch = currentSketch;
    updater(target, fxsketchInfo);
  }


  const mouseData = { x: 0, y:0 };

  // flipper = 0 means A goes to s2, B goes to s3
  // flipper = 1 means A goes to s3, B goes to s2

  let lastSketchIsDirect = false;
  let flipper = 0;

  // reverse the state of the flipper always as an integer
  function flipIt () {
    if (flipper) flipper = 0; else flipper = 1;
  }

  // returns inverse state of flipper.
  function unflipped () {
    return flipper ? 0 : 1;
  }

  let t0; let t1;

  onMounted(() => {
    window.addEventListener('resize', resizeCanvas);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeCanvas);
    cleanupFX();
  });

  document.addEventListener('mousemove', function (event) {
    mouseData.x = event.clientX;
    mouseData.y = event.clientY;
  });

  // BroadcastChannel for editor communication (replaces MsgBroker)
  const stageChannel = new BroadcastChannel('hydra-stage');

  stageChannel.onmessage = (event) => {
    const { type, sketch, sketchInfo } = event.data;
    if (type === 'update') {
      updater(sketch, sketchInfo || {});
    }
  };

  // Announce stage presence
  stageChannel.postMessage({ type: 'stage-ready' });

  function openEditor () {
    window.open('/index.html?edit=t', 'editor', 'width=500,height=1080,left=20');
    //  	window.open("/hyground/index.html?edit=t", "editor", "width=500,height=1080,left=20");
  }

  async function updater (newV, sketchInfo, e, what) {
    // Cancel any in-progress morph
    if (morphInterval) {
      clearInterval(morphInterval);
      morphInterval = null;
    }

    if (!fxActiveRef.value) {
      // Check if morph mode is enabled and we have a previous sketch
      if (panelParams.morph && lastSketch && lastSketch !== newV) {
        try {
          const steps = morpher.morphSketches(lastSketch, newV, 30);
          let stepIndex = 0;

          morphInterval = setInterval(() => {
            if (stepIndex < steps.length) {
              fxSketch.value = steps[stepIndex].code;
              fxsketchInfo = sketchInfo;
              stepIndex++;
            } else {
              clearInterval(morphInterval);
              morphInterval = null;
              // Set exact destination sketch, not reconstructed version
              fxSketch.value = newV;
              lastSketch = currentSketch;
              currentSketch = newV;
            }
          }, 50); // ~20fps morph animation
        } catch (err) {
          // Morph failed (incompatible sketches), just do direct switch
          console.warn('Morph failed, doing direct switch:', err.message);
          fxSketch.value = newV;
          fxsketchInfo = sketchInfo;
          lastSketch = currentSketch;
          currentSketch = newV;
        }
      } else {
        // No morph - direct switch
        fxSketch.value = newV;
        fxsketchInfo = sketchInfo;
        lastSketch = currentSketch;
        currentSketch = newV;
      }
      lastSketchIsDirect = true;
    } else {
      flipIt();
      if (!sourceHydras[flipper]) {
        console.log('Source Hydra not set up');
        return;
      }
      if (sketchInfo.key) await sourceHydras[flipper].eval('hush()');
      await sourceHydras[flipper].eval(newV);

      // If coming out of a "direct to fxSketch" activation, we don't want to do a blend-in since it would reference the wrong source.
      // So just do a cut now and we can pick up using the FX stuff on the next transition.

      if (lastSketchIsDirect) {
        if (flipper) {
          fxSketch.value = `src(s3).out()`;
        } else {
          fxSketch.value = `src(s2).out()`;
        }
        lastSketchIsDirect = false;
        return;
      }

      if (flipper)
        fxSketch.value = `let t0 = time;src(s2).blend(s3, ()=>{return Math.min((time-t0) * 2.0, 1.0) }).out()`;
      else
        fxSketch.value = `let t0 = time;src(s3).blend(s2, ()=>{return Math.min((time-t0) * 2.0, 1.0)}).out()`;
    }
  }

  // Hydras can be changed by the resize process, so we may need to fix stuff.
  async function reportHydra (newH, newCanvas) {
    hydraRenderer = newH;
    fxHydra = newH.synth;
    fxCanvas = newCanvas;
    console.log('New Hydra instance reported.');
    // Note: shared-device Hydras will be recreated if FX mode is active after resize
  }


  async function openFX () {
    if (fxLoaded) return;

    // Ensure we have the shared device (should already be set when WGSL was enabled)
    if (!sharedDeviceRef.value) {
      sharedDeviceRef.value = await getSharedDevice();
      keyctr.value++;  // Force Hydra recreation with shared device
      // Wait a tick for the Hydra to recreate
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create offscreen canvases for source Hydras
    const sourceWidth = fxCanvas.width;
    const sourceHeight = fxCanvas.height;
    sourceCanvases = [
      new OffscreenCanvas(sourceWidth, sourceHeight),
      new OffscreenCanvas(sourceWidth, sourceHeight)
    ];

    // Create source Hydras sharing the same GPU device
    sourceHydras[0] = new HydraEngine({
      useWGSL: true,
      gpuDevice: sharedDeviceRef.value,
      canvas: sourceCanvases[0],
      width: sourceWidth,
      height: sourceHeight,
      makeGlobal: false,
      autoLoop: false,
    });

    sourceHydras[1] = new HydraEngine({
      useWGSL: true,
      gpuDevice: sharedDeviceRef.value,
      canvas: sourceCanvases[1],
      width: sourceWidth,
      height: sourceHeight,
      makeGlobal: false,
      autoLoop: false,
    });

    // Wait for WebGPU initialization
    await Promise.all([
      sourceHydras[0].wgslPromise,
      sourceHydras[1].wgslPromise,
    ]);

    // Set up zero-copy texture sharing via initFromOutput
    // s2 gets output from sourceHydras[0], s3 gets output from sourceHydras[1]
    fxHydra.s2.initFromOutput(sourceHydras[0].o[0]);
    fxHydra.s3.initFromOutput(sourceHydras[1].o[0]);

    // Start render loop for source Hydras
    startSourceLoop();

    fxLoaded = true;
    fxActiveRef.value = true;
  }

  let sourceLoopId: number | null = null;

  function startSourceLoop() {
    let lastTime = performance.now();

    function frame() {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      // Tick all Hydras in one unified loop for efficiency
      if (sourceHydras[0]) sourceHydras[0].tick(dt);
      if (sourceHydras[1]) sourceHydras[1].tick(dt);
      if (hydraRenderer) hydraRenderer.tick(dt);  // fxHydra

      sourceLoopId = requestAnimationFrame(frame);
    }

    sourceLoopId = requestAnimationFrame(frame);
  }

  function cleanupFX() {
    if (sourceLoopId) {
      cancelAnimationFrame(sourceLoopId);
      sourceLoopId = null;
    }
    if (sourceHydras[0]) {
      sourceHydras[0].synth._destroy?.();
      sourceHydras[0] = null;
    }
    if (sourceHydras[1]) {
      sourceHydras[1].synth._destroy?.();
      sourceHydras[1] = null;
    }
    sourceCanvases = [];
    fxActiveRef.value = false;
    fxLoaded = false;
  }


  const keyctr = ref(0);
  function resizeCanvas () {

    const inW = window.innerWidth;
    const inH = window.innerHeight; // - 80;
    widthRef.value = inW;
    heightRef.value = inH;
    console.log('Resized: ' + inW + ' + ' +inH + ' keyctr: ' + keyctr.value);
    keyctr.value++;
  }

  async function toggleFX () {
    fxActiveRef.value = panelParams.fx;
    if (!fxActiveRef.value) {
      // FX turned off, so tear everything down.
      cleanupFX();
    } else {
      await openFX();
      // Initialize both source Hydras with hush
      if (sourceHydras[0])
        await sourceHydras[0].eval('hush()');
      if (sourceHydras[1])
        await sourceHydras[1].eval('hush()');
    }
  }

  let inActState;

  function reportInActorState (state) {
    inActState = state;
  }

  function evalDone (hydraRenderer, text, timeB4) {
    console.log(`Stage evalDone ${timeB4}`);
    if (inActState && inActState.evalDone) inActState.evalDone(hydraRenderer, text, timeB4);
    if (panelParams.quad) hydraRenderer.synth.render();
  }


  async function toggleWgsl () {
    if (panelParams.wgsl) {
      // Get shared device when WGSL is enabled
      sharedDeviceRef.value = await getSharedDevice();
    } else {
      sharedDeviceRef.value = null;
    }
    keyctr.value++;  // Force Hydra recreation
  }

  watch(()=>panelParams.fx, toggleFX);
  watch(()=>panelParams.wgsl, toggleWgsl);

</script>


<template>
  <template v-if="props.show">
    <StagePanel
      :params="panelParams"
      :report-in-actor-state="reportInActorState"
      :sketch="fxSketch"
      :update-script="updater"
      :reverse-morph="reverseMorph"
    />
  </template>
  <Hydra
    :key="keyctr"
    :eval-done="evalDone"
    :external-loop="fxActiveRef"
    :gpu-device="sharedDeviceRef"
    :height="heightRef"
    :report-hydra="reportHydra"
    :sketch="fxSketch"
    :sketch-info="fxsketchInfo"
    :wgsl="panelParams.wgsl"
    :width="widthRef"
  />
</template>
