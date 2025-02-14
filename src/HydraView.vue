<script setup lang="ts">

  import {onMounted, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Hydra from "./Hydra.vue";
	import Editor from "./Editor.vue";
  import examples from './examples.json';

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

let sketchTab = [
`osc(20, 0.1, 0.8).rotate(0.8).pixelate(20, 30).colorama().out()`,
`noise().colorama().out()`,
`noise(9,0.3,3).thresh(0.3,0.03).diff(o3,0.3).out(o1)
gradient([0.3,0.3,3]).diff(o0).blend(o1).out(o3)
voronoi(33,3,30).rotate(3,0.3,0).modulateScale(o2,0.3).color(-3,3,0).brightness(3).out(o0)
shape(30,0.3,1).invert(({time})=>Math.sin(time)*1).out(o2)

render(o3)`
];

  const sketch = ref("noise().out()");
  const nextSketch = ref("");
  let flipper = false;
 
  function runHydra(evt) {
  	sketch.value = nextSketch.value;
  }

  function stepHydra(evt) {
		let sketchX = getRandomInt(examples.length);
		let sketche = examples[sketchX];
		console.log(sketche.sketch_id);
		let s64 = sketche.code;
		let ska = decodeURIComponent(atob(s64));
		sketch.value = ska;
  }

function changed(e,t) {
	nextSketch.value = e;
}

</script>
 
<template>
<Hydra :sketch="sketch"/>
<button type="button" id="Hydra" @click="runHydra">Run</button>&nbsp;
<button type="button" id="HydraNxt" @click="stepHydra">Next</button><br>
<Editor :text="sketch" @textChanged="changed"/>
</template>

<style>


canvas {
  border:1px solid #000000;
}


</style>