<template>
   {{sketch}}<br>
   <canvas ref="canvasElement" width="480" height="360"></canvas>
   <p/>
</template>

<script setup lang="ts">
  import {onMounted, Ref, ref, watch} from "vue";
  import Hydra from "hydra-synth";
  
  const props = defineProps({
  	sketch: String,
	});

const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();

onMounted(() => {
    context.value = canvasElement.value;
    render();
    watch(()=> props.sketch, ()=>render());
});


function render() {
    if (!context.value) return;

    const h = new Hydra({ makeGlobal: false, detectAudio: false, canvas: context.value }).synth;
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