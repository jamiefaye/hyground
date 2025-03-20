
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
    let fn = new Function(...keys, text);
    fn(...values);
}

</script>


<template><br>
   <canvas ref="canvasElement" :width="width" :height="height"></canvas>
   <p/>
</template>



