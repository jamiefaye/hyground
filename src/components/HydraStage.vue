<script setup lang="ts">
  import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
  import Hydra from './Hydra.vue';
  import InActorPanel from './InActorPanel.vue';
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
  const widthRef = ref(100);
  const heightRef = ref(100);
  const containerRef = ref(null);
  let resizeObserver = null;

  const hidePanel = ref(false);

  const panelParams = reactive({
    fx: false,
    wgsl: false,
    useCoreRenderer: false,  // Toggle between standalone createHydra and core + install()
    quad: false,
    morph: false,
    syphon: false,
  });

  // Syphon output state
  const syphonAvailable = ref(false);
  const syphonActive = ref(false);
  let syphonFrameCount = 0;
  let syphonLoopId: number | null = null;
  let syphonReadbackCanvas: OffscreenCanvas | null = null;
  let syphonReadbackCtx: OffscreenCanvasRenderingContext2D | null = null;

  // Check for Syphon API (available when running in Electron with hydra-syphon)
  async function initSyphon() {
    if (window.syphonAPI) {
      syphonAvailable.value = await window.syphonAPI.isAvailable();
      if (syphonAvailable.value) {
        console.log('Syphon API available - recreating Hydra with preserveDrawingBuffer');
        keyctr.value++;  // Force Hydra recreation with preserveDrawingBuffer enabled
      }
    }
  }

  async function toggleSyphon() {
    if (!syphonAvailable.value) return;

    if (panelParams.syphon) {
      const result = await window.syphonAPI.startServer('Hydra Stage');
      syphonActive.value = result.success;
      if (result.success) {
        console.log('Syphon server started');
        // Start dedicated Syphon loop if FX mode is not active
        if (!fxActiveRef.value) {
          startSyphonLoop();
        }
      } else {
        console.error('Failed to start Syphon:', result.error);
      }
    } else {
      await window.syphonAPI.stopServer();
      syphonActive.value = false;
      stopSyphonLoop();
      console.log('Syphon server stopped');
    }
  }

  function startSyphonLoop() {
    if (syphonLoopId) return; // Already running

    function frame() {
      publishToSyphon();
      syphonLoopId = requestAnimationFrame(frame);
    }
    syphonLoopId = requestAnimationFrame(frame);
  }

  function stopSyphonLoop() {
    if (syphonLoopId) {
      cancelAnimationFrame(syphonLoopId);
      syphonLoopId = null;
    }
  }

  async function publishToSyphon() {
    if (!syphonActive.value || !hydraRenderer || !fxCanvas) return;

    // Throttle to ~30fps for Syphon to reduce CPU overhead
    syphonFrameCount++;
    if (syphonFrameCount % 2 !== 0) return;

    const width = hydraRenderer.width;
    const height = hydraRenderer.height;

    try {
      // WebGL mode - use regl.read() for fast pixel readback
      if (hydraRenderer.regl) {
        const pixels = hydraRenderer.regl.read();
        window.syphonAPI.publishFrame(pixels.buffer, width, height);
      }
      // WebGPU mode - use createImageBitmap + offscreen canvas
      else if (panelParams.wgsl && fxCanvas) {
        // Create/resize readback canvas if needed
        if (!syphonReadbackCanvas || syphonReadbackCanvas.width !== width || syphonReadbackCanvas.height !== height) {
          syphonReadbackCanvas = new OffscreenCanvas(width, height);
          syphonReadbackCtx = syphonReadbackCanvas.getContext('2d', { willReadFrequently: true });
        }
        if (!syphonReadbackCtx) return;

        // Copy from WebGPU canvas to 2D canvas
        const bitmap = await createImageBitmap(fxCanvas);
        syphonReadbackCtx.drawImage(bitmap, 0, 0);
        bitmap.close();

        // Read pixels from 2D canvas
        const imageData = syphonReadbackCtx.getImageData(0, 0, width, height);
        window.syphonAPI.publishFrame(imageData.data.buffer, width, height);
      }
    } catch (e) {
      console.error('Syphon publish error:', e);
    }
  }

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

  function setupResizeObserver() {
    if (resizeObserver || !containerRef.value) return;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        if (width > 0 && height > 0) {
          widthRef.value = width;
          heightRef.value = height;
          console.log('Stage container resized:', width, 'x', height);
        }
      }
    });
    resizeObserver.observe(containerRef.value);
  }

  onMounted(() => {
    initSyphon();
    // Try to set up ResizeObserver immediately
    nextTick(() => {
      setupResizeObserver();
    });
  });

  // Watch for containerRef to become available
  watch(containerRef, (newVal) => {
    if (newVal) {
      setupResizeObserver();
    }
  });

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    cleanupFX();
    stopSyphonLoop();
    syphonReadbackCanvas = null;
    syphonReadbackCtx = null;
    if (syphonActive.value) {
      window.syphonAPI?.stopServer();
    }
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

    const useWGSL = panelParams.wgsl;

    // Import the createHydra factory from the webgpu extension
    const { createHydra, getSharedDevice } = await import("hydra-synth/extensions/vertex/webgpu");

    // For WGSL mode, ensure we have the shared device
    if (useWGSL && !sharedDeviceRef.value) {
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

    // Create source Hydras using the factory (which auto-installs vertex extension)
    const hydraOpts = {
      useWGSL: useWGSL,
      width: sourceWidth,
      height: sourceHeight,
      makeGlobal: true,  // Required for sandbox eval to work
      autoLoop: false,
      gpuDevice: useWGSL ? sharedDeviceRef.value : undefined,
    };

    sourceHydras[0] = await createHydra({
      ...hydraOpts,
      canvas: sourceCanvases[0],
    });

    sourceHydras[1] = await createHydra({
      ...hydraOpts,
      canvas: sourceCanvases[1],
    });

    // Set up texture sharing for FX compositing
    if (useWGSL) {
      // Set up zero-copy texture sharing via initFromOutput
      fxHydra.s2.initFromOutput(sourceHydras[0].o[0]);
      fxHydra.s3.initFromOutput(sourceHydras[1].o[0]);
    } else {
      // WebGL: use canvas-based texture sharing
      fxHydra.s2.init({ src: sourceCanvases[0], dynamic: true });
      fxHydra.s3.init({ src: sourceCanvases[1], dynamic: true });
    }

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

      // Publish to Syphon if active
      publishToSyphon();

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
      sourceHydras[0]._destroy?.();
      sourceHydras[0] = null;
    }
    if (sourceHydras[1]) {
      sourceHydras[1]._destroy?.();
      sourceHydras[1] = null;
    }
    sourceCanvases = [];
    fxActiveRef.value = false;
    fxLoaded = false;
  }


  const keyctr = ref(0);

  async function toggleFX () {
    fxActiveRef.value = panelParams.fx;
    if (!fxActiveRef.value) {
      // FX turned off, so tear everything down.
      cleanupFX();
      // If Syphon is active, start dedicated loop since FX loop stopped
      if (syphonActive.value) {
        startSyphonLoop();
      }
    } else {
      // FX turned on - stop dedicated Syphon loop (startSourceLoop will handle it)
      stopSyphonLoop();
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
      const { getSharedDevice } = await import("hydra-synth/extensions/vertex/webgpu");
      sharedDeviceRef.value = await getSharedDevice();
    } else {
      sharedDeviceRef.value = null;
    }
    keyctr.value++;  // Force Hydra recreation
  }

  watch(()=>panelParams.fx, toggleFX);
  watch(()=>panelParams.wgsl, toggleWgsl);
  watch(()=>panelParams.syphon, toggleSyphon);

</script>


<template>
  <div class="stage-wrapper">
    <div v-if="props.show" class="stage-panel-wrapper">
      <StagePanel
        :params="panelParams"
        :report-in-actor-state="reportInActorState"
        :sketch="fxSketch"
        :update-script="updater"
        :reverse-morph="reverseMorph"
        :syphon-available="syphonAvailable"
      />
    </div>
    <div ref="containerRef" class="hydra-container">
      <Hydra
        :key="keyctr"
        :eval-done="evalDone"
        :external-loop="fxActiveRef"
        :gpu-device="sharedDeviceRef"
        :height="heightRef"
        :preserve-drawing-buffer="syphonAvailable"
        :report-hydra="reportHydra"
        :sketch="fxSketch"
        :sketch-info="fxsketchInfo"
        :use-core-renderer="panelParams.useCoreRenderer"
        :wgsl="panelParams.wgsl"
        :width="widthRef"
      />
    </div>
  </div>
</template>

<style scoped>
.stage-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}
.hydra-container {
  flex: 1;
  overflow: hidden;
}
</style>
