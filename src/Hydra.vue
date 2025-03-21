
<script setup lang="ts">
  import {onMounted, onBeforeUnmount, Ref, ref, watch} from "vue";
  import Hydra from "hydra-synth";
  import {Deglobalize} from './Deglobalize.js';
  
  const props = defineProps({
  	sketch: String,
  	hush:   Boolean,
  	width:	Number,
  	height: Number,
  	reportHydra: Function,
	});

const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();

onMounted(() => {
    context.value = canvasElement.value;
    render();
    watch(()=> props.sketch, ()=>render());

});

onBeforeUnmount(() => {
	h._destroy();
	h = undefined;
});

let h;
let timeOutKey;

const GeneratorFunction = function* () {}.constructor;

function render() {
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
    	h = new Hydra({ makeGlobal: false, canvas: context.value }).synth;
    	if (props.reportHydra) {
    		props.reportHydra(h);
    	}
    }
    if (props.hush) h.hush(); // Call this to get a clean slate?
    // convert all keys in h into strings
    let keys = Object.keys(h);
    let values = [];
    for (let i = 0; i < keys.length; ++i) values.push(h[keys[i]]);
    keys.push("h");
    values.push(h);
    keys.push("_h"); // _h used for fixing-up primitive-valued 'global' references, like "time".
    values.push(h);

    let fn = new GeneratorFunction(...keys, text);
    h.generator = fn(...values);
    stopEarlierTimer();
    let reply = h.generator.next();
    planNext(reply);
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
	let reply = f.next();
	planNext(reply);
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
    		delete h.generator;
    }
}
</script>


<template><br>
   <canvas ref="canvasElement" :width="width" :height="height"></canvas>
   <p/>
</template>



