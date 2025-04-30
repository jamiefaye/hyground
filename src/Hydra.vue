
<script setup lang="ts">
  import {onMounted, onBeforeUnmount, Ref, ref, watch} from "vue";
  import {Hydra} from "hydra-synth";

  const props = defineProps({
  	sketch: String,
  	sketchInfo:  Object,
  	width:	Number,
  	height: Number,
  	reportHydra: Function,
  	evalDone:	Function,
  	wgsl:		Boolean,
	});

const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();

onMounted(() => {
    context.value = canvasElement.value;
    render();
    watch(()=> props.sketch, ()=>render());
    //watch(()=> props.wgsl, ()=>render());

});

onBeforeUnmount(() => {
	stopAnimationTimer();
	h._destroy();
	h = undefined;
});

let h; // hydra instance for this Hydra Vue object.

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


async function render() {
    if (!context.value) return;
    let text = props.sketch;

		if (h === undefined) {
    	h = new Hydra({ makeGlobal: false, canvas: context.value, autoLoop: false, genWGSL: props.wgsl, regen: true});
    	if (h.wgslPromise) await h.wgslPromise
    	if (props.reportHydra) {
    		props.reportHydra(h, context.value);
    	}
    	stopAnimationTimer();
    	frameTimerKey = setInterval(animationTick, frameTime);
    }
    if (props.sketchInfo.key) h.synth.hush(); // hush if a key frame is requested.
    //console.log("Eval: " + text);
    let timeB4 = performance.now();
 		await h.eval(text);
 		if (props.evalDone) {
 			props.evalDone(h, text, timeB4);
 		}
 }
</script>


<template><br>
   <canvas ref="canvasElement" :width="width" :height="height"></canvas>
   <p/>
</template>



