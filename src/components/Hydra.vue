
<script setup lang="ts">
  import {onMounted, onBeforeUnmount, Ref, ref, watch, computed} from "vue";
  import { useToastStore } from '@/stores/toast'

  const toastStore = useToastStore()

  const props = defineProps({
  	sketch: String,
  	sketchInfo:  Object,
  	width:	Number,
  	height: Number,
  	reportHydra: Function,
  	evalDone:	Function,
  	wgsl:		Boolean,
  	gpuDevice: Object,  // Optional shared GPUDevice for zero-copy texture sharing
  	externalLoop: Boolean,  // If true, parent manages the animation loop
  	preserveDrawingBuffer: Boolean,  // Enable for Syphon/pixel readback
  	fillContainer: Boolean,  // If true, canvas fills container via CSS (for stage)
  	useCoreRenderer: Boolean,  // If true, use core hydra-synth + install() instead of standalone createHydra
  	makeGlobal: { type: Boolean, default: true },  // Whether to expose Hydra functions globally (required for sandbox eval)
	});

const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();

// Computed style to ensure canvas displays at intended size
// fillContainer: no explicit size, let layout determine it
// otherwise: explicit pixel dimensions
const canvasStyle = computed(() => {
  if (props.fillContainer) {
    return {}  // No style - let CSS handle sizing
  }
  return {
    width: `${props.width}px`,
    height: `${props.height}px`
  }
});

onMounted(() => {
    context.value = canvasElement.value;
    render();
    watch(()=> props.sketch, ()=>render());
    //watch(()=> props.wgsl, ()=>render());

});

onBeforeUnmount(() => {
	stopAnimationTimer();
	if (h && h._destroy) h._destroy();
	h = undefined;
});

let h; // hydra instance for this Hydra Vue object.
let creatingHydra = false; // Guard against concurrent creation

// For the hydra-synth tick timer. Used instead of RAF.
let frameTime = 16.6;
let frameTimerKey;


function stopAnimationTimer() {
	if(frameTimerKey !== undefined) {
		clearInterval(frameTimerKey);
		frameTimerKey = undefined;
	}
}


function animationTick() {
	if (h) {
		h.tick(frameTime);
	}
}

// Handle errors from Hydra (syntax, runtime, load errors)
function handleHydraError(error) {
	let message = error.message || String(error)
	let details = null

	// Format details based on error type
	if (error.line != null) {
		details = `Line ${error.line}${error.column != null ? `:${error.column}` : ''}`
		if (error.source) {
			details += ` - ${error.source}`
		}
	}
	if (error.suggestion) {
		message += ` (${error.suggestion})`
	}

	// Show toast based on error type
	const errorType = error.type || 'runtime'
	if (errorType === 'syntax') {
		toastStore.error(`Syntax error: ${message}`, details)
	} else if (errorType === 'load') {
		toastStore.warning(`Load error: ${message}`, details)
	} else {
		toastStore.error(message, details)
	}
}

async function render() {
    if (!context.value) return;
    // Wait for valid canvas dimensions
    if (!props.width || !props.height || props.width <= 0 || props.height <= 0) {
      console.warn('Hydra: Invalid canvas dimensions, skipping render');
      return;
    }
    let text = props.sketch;

		if (h === undefined) {
		  // Prevent concurrent Hydra creation
		  if (creatingHydra) {
		    console.log('Hydra: Already creating, will render when ready');
		    return;
		  }
		  creatingHydra = true;

    	// Ensure canvas has dimensions set before Hydra reads them
    	const canvas = context.value as HTMLCanvasElement;
    	canvas.width = props.width;
    	canvas.height = props.height;

    	try {
    	  if (props.useCoreRenderer) {
    	    // Mode: Core hydra-synth with renderer interface + vertex install()
    	    console.log("Creating Hydra via core + vertex install()");
    	    const HydraRenderer = (await import("hydra-synth")).default;
    	    const { install } = await import("hydra-synth/extensions/vertex/webgpu");

    	    h = new HydraRenderer({
    	      makeGlobal: props.makeGlobal,
    	      canvas: canvas,
    	      width: props.width,
    	      height: props.height,
    	      autoLoop: false,
    	      useWGSL: props.wgsl,
    	      gpuDevice: props.gpuDevice,
    	    });
    	    await h.ready();
    	    install(h);
    	    console.log("Core + vertex install() complete, renderer:", h.renderer?.capabilities?.name);
    	  } else {
    	    // Mode: Standalone createHydra from vertex extension (original behavior)
    	    console.log("Creating Hydra via standalone createHydra factory");
    	    const { createHydra } = await import("hydra-synth/extensions/vertex/webgpu");
    	    h = await createHydra({
    	      makeGlobal: props.makeGlobal,
    	      canvas: canvas,
    	      width: props.width,
    	      height: props.height,
    	      autoLoop: false,
    	      useWGSL: props.wgsl,
    	      gpuDevice: props.gpuDevice,
    	      preserveDrawingBuffer: props.preserveDrawingBuffer,
    	    });
    	    console.log("Standalone createHydra complete");
    	  }
    	} catch (err) {
    	  console.error('Failed to create Hydra instance:', err);
    	  creatingHydra = false;
    	  return;
    	}
    	creatingHydra = false;
    	if (props.reportHydra) {
    		props.reportHydra(h, context.value);
    	}
    	// Only start our own timer if parent isn't managing the loop
    	if (!props.externalLoop) {
    		stopAnimationTimer();
    		frameTimerKey = setInterval(animationTick, frameTime);
    	}
    	// Re-read sketch in case it changed while we were creating Hydra
    	text = props.sketch;
    }
    if (props.sketchInfo?.key) h.synth.hush(); // hush if a key frame is requested.
    //console.log("Eval: " + text);
    // Skip eval if sketch is empty
    if (!text || text.trim() === '') return;
    let timeB4 = performance.now();
    try {
 		  await h.eval(text);
 		} catch (err) {
 		  console.error('Hydra eval error:', err);
 		  return;
 		}
 		if (props.evalDone) {
 			props.evalDone(h, text, timeB4);
 		}
 }
</script>


<template>
   <canvas ref="canvasElement" :width="width" :height="height" :style="canvasStyle"></canvas>
</template>

<style scoped>
canvas {
  margin: 0;
  padding: 0;
  border: 0;
  display: block;
}
</style>

