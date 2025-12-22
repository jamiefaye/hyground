<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

const canvasA = ref<HTMLCanvasElement | null>(null);
const canvasB = ref<HTMLCanvasElement | null>(null);
const canvasMain = ref<HTMLCanvasElement | null>(null);

const status = ref('Initializing...');
const blendAmount = ref(0.5);

let hydraA: any = null;
let hydraB: any = null;
let hydraFX: any = null;
let animationId: number | null = null;

const sketchA = 'osc(4, 0.1, 1).rotate(0.1).out()';
const sketchB = 'noise(3, 0.2).colorama(0.5).out()';

async function init() {
  if (!canvasA.value || !canvasB.value || !canvasMain.value) {
    status.value = 'Canvas refs not ready';
    return;
  }

  try {
    // Import the createHydra factory from the webgpu extension
    const { createHydra, getSharedDevice } = await import("hydra-synth/extensions/vertex/webgpu");

    status.value = 'Getting shared GPU device...';
    const device = await getSharedDevice();
    status.value = `Got device: ${device.label || 'WebGPU Device'}`;

    // Create 3 Hydras sharing the same device (factory auto-installs vertex extension)
    status.value = 'Creating Hydra A...';
    hydraA = await createHydra({
      useWGSL: true,
      gpuDevice: device,
      canvas: canvasA.value,
      width: 640,
      height: 360,
      makeGlobal: true,  // Required for sandbox eval
      autoLoop: false,
    });

    status.value = 'Creating Hydra B...';
    hydraB = await createHydra({
      useWGSL: true,
      gpuDevice: device,
      canvas: canvasB.value,
      width: 640,
      height: 360,
      makeGlobal: true,  // Required for sandbox eval
      autoLoop: false,
    });

    status.value = 'Creating Hydra FX (main output)...';
    hydraFX = await createHydra({
      useWGSL: true,
      gpuDevice: device,
      canvas: canvasMain.value,
      width: 1280,
      height: 720,
      makeGlobal: true,  // Required for sandbox eval
      autoLoop: false,
    });

    // Set up cross-Hydra sources (ZERO-COPY via shared device!)
    status.value = 'Setting up cross-Hydra sources...';
    hydraFX.s[0].initFromOutput(hydraA.o[0]);
    hydraFX.s[1].initFromOutput(hydraB.o[0]);

    // Load sketches
    status.value = 'Loading sketches...';
    await hydraA.eval(sketchA);
    await hydraB.eval(sketchB);

    // Start render loop
    status.value = 'Starting render loop...';
    startLoop();

    status.value = 'Running! Adjust blend slider to dissolve between sketches.';
  } catch (err: any) {
    status.value = `Error: ${err.message}`;
    console.error(err);
  }
}

function startLoop() {
  let lastTime = performance.now();

  function frame() {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;

    // Tick all three Hydras
    if (hydraA) hydraA.tick(dt);
    if (hydraB) hydraB.tick(dt);

    // Update blend sketch and tick
    if (hydraFX) {
      // Dynamic blend based on slider
      hydraFX.eval(`src(s0).blend(src(s1), ${blendAmount.value}).out()`);
      hydraFX.tick(dt);
    }

    animationId = requestAnimationFrame(frame);
  }

  animationId = requestAnimationFrame(frame);
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (hydraA) {
    hydraA.looper?.stop();
    hydraA = null;
  }
  if (hydraB) {
    hydraB.looper?.stop();
    hydraB = null;
  }
  if (hydraFX) {
    hydraFX.looper?.stop();
    hydraFX = null;
  }
}

onMounted(() => {
  init();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<template>
  <div class="shared-device-test">
    <h2>Shared GPUDevice Dissolver Test</h2>
    <p class="status">{{ status }}</p>

    <div class="controls">
      <label>
        Blend: {{ blendAmount.toFixed(2) }}
        <input
          type="range"
          v-model.number="blendAmount"
          min="0"
          max="1"
          step="0.01"
        />
      </label>
    </div>

    <div class="canvas-row">
      <div class="canvas-container">
        <h3>Hydra A</h3>
        <canvas ref="canvasA" width="640" height="360"></canvas>
      </div>
      <div class="canvas-container">
        <h3>Hydra B</h3>
        <canvas ref="canvasB" width="640" height="360"></canvas>
      </div>
    </div>

    <div class="main-canvas">
      <h3>Hydra FX (Blended Output)</h3>
      <canvas ref="canvasMain" width="1280" height="720"></canvas>
    </div>
  </div>
</template>

<style scoped>
.shared-device-test {
  padding: 20px;
  background: #1a1a1a;
  color: #fff;
  min-height: 100vh;
}

h2 {
  margin-bottom: 10px;
}

.status {
  font-family: monospace;
  padding: 10px;
  background: #333;
  border-radius: 4px;
  margin-bottom: 20px;
}

.controls {
  margin-bottom: 20px;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.controls input[type="range"] {
  width: 300px;
}

.canvas-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.canvas-container {
  flex: 1;
}

.canvas-container h3,
.main-canvas h3 {
  margin-bottom: 10px;
  font-size: 14px;
  color: #888;
}

canvas {
  display: block;
  background: #000;
  border-radius: 4px;
  max-width: 100%;
}

.main-canvas canvas {
  width: 100%;
  max-width: 1280px;
}
</style>
