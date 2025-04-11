
<script setup lang="ts">
  import {onMounted, onBeforeUnmount, Ref, ref, watch} from "vue";
  import Hydra from "hydra-synth";
  import {Deglobalize} from './Deglobalize.js';
  
  const props = defineProps({
  	sketch: String,
  	sketchInfo:  Object,
  	width:	Number,
  	height: Number,
  	reportHydra: Function,
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

let h; // hydra-synth instance for this Hydra Vue object.

let timeOutKey; // used for pacing the sketch generator function.
const GeneratorFunction = function* () {}.constructor;

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
    let text; let errFound;
    try {
    	 text = Deglobalize(props.sketch, "_h");
    } catch (err) {
  		errFound = err;
  		console.log("Deglobalize error " + err);
  		text = props.sketch;
  	}
		if (h === undefined) {
    	h = new Hydra({ makeGlobal: false, canvas: context.value, autoLoop: false, genWGSL: props.wgsl }).synth;
    	if (h.wgslPromise) await h.wgslPromise
    	if (props.reportHydra) {
    		props.reportHydra(h);
    	}
    	stopAnimationTimer();
    	frameTimerKey = setInterval(animationTick, frameTime);
    }

    if (props.sketchInfo.key) h.hush(); // hush if a key frame is requested.
    // convert all keys in h into strings
    let keys = Object.keys(h);
    let values = [];
    for (let i = 0; i < keys.length; ++i) values.push(h[keys[i]]);
    keys.push("h");
    values.push(h);
    keys.push("_h"); // _h used for fixing-up primitive-valued 'global' references, like "time".
    values.push(h);
    try {
    	let fn = new GeneratorFunction(...keys, text);
    	h.done = false;
    	h.generator = fn(...values);
    } catch (err) {
    	console.log("Error compiling generator function");
    	console.log(err);
    	stopEarlierTimer();
    	return;
    }
    stopEarlierTimer();
    try {
    	let reply = h.generator.next();
    	planNext(reply);
    } catch (err) {
    	console.log("Error calling initial generator function.next()");
    	console.log(err);
    	delete h.generator;
    	return;
    }
}

function stopEarlierTimer() {
	if(timeOutKey !== undefined) {
		clearTimeout(timeOutKey);
		timeOutKey = undefined;
	}
}

function generatorTick() {
	if (!h || !h.generator) return;
	let f = h.generator;
	try {
		let reply = f.next();
		planNext(reply);
	} catch (err) {
    	console.log("Error calling generator function.next()");
    	console.log(err);
    	delete h.generator;
	}
}

function planNext(reply) {
	 if (!reply) return;

   if (!reply.done) {
    		let wT = reply.value;
    		if (wT === undefined) {
    			wT = 10;
    		} else {
    			wT = wT * 1000; // Convert to ms.
    		}
    		timeOutKey = setTimeout(()=>generatorTick(), wT)
    } else {
        h.done = true;
    		delete h.generator;
    }
}
</script>


<template><br>
   <canvas ref="canvasElement" :width="width" :height="height"></canvas>
   <p/>
</template>



