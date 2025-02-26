
<script setup lang="ts">
  import {onMounted, Ref, ref, watch} from "vue";
  import Hydra from "hydra-synth";
  
  const props = defineProps({
  	sketch: String,
  	hush:   Boolean,
  	width:	Number,
  	height: Number
	});

const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();

onMounted(() => {
    context.value = canvasElement.value;
    render();
    watch(()=> props.sketch, ()=>render());
});


let h;

function render() {
    if (!context.value) return;
		if (h === undefined) {
    	h = new Hydra({ makeGlobal: false, canvas: context.value }).synth;
    }
    if (props.hush) h.hush(); // Call this to get a clean slate?
    // convert all keys in h into strings
    let keys = Object.keys(h);
    let values = [];
    for (let i = 0; i < keys.length; ++i) values.push(h[keys[i]]);
    keys.push("h");
    values.push(h);
    let fn = new Function(...keys, props.sketch);
    fn(...values);
}
</script>


<template><br>
   <canvas ref="canvasElement" :width="width" :height="height"></canvas>
   <p/>
</template>

