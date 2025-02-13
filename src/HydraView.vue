<script setup lang="ts">

  import {onMounted, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Hydra from "./Hydra.vue";
	import Editor from "./Editor.vue";


  const sketch = ref("noise().colorama().out();");
  let flipper = false;
  function runHydra(evt) {
  	flipper = !flipper;
  	if (flipper) {
  		sketch.value = "osc(20, 0.1, 0.8).rotate(0.8).pixelate(20, 30).colorama().out()";
  	} else {
  		sketch.value = "noise().colorama().out();";
  	}
  }

</script>
 
<template>
<Hydra :sketch="sketch"/>
<button type="button" id="Hydra" @click="runHydra">Run</button><br>
<Editor/>
</template>

<style>


canvas {
  border:1px solid #000000;
}


</style>