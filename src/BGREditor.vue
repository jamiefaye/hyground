<script setup lang="ts">

  import {onMounted, onBeforeUnmount, Ref, ref, watch} from "vue";

	import Hyground from "./Hyground.vue";
	import Hydra from "./Hydra.vue";
	import Editor from "./Editor.vue";
	import examples from './examples.json';
	import * as Comlink from "comlink";
	import IconButton from "./IconButton.vue";
	import {Mutator} from "./Mutator.js";
	import InActorPanel from "./InActorPanel.vue";
	
	
  const props = defineProps({
  entry: Object,
  index: Number,
  showVid: Boolean,
  limit: Boolean
	});

	let targetView;
	let n;
	const sketch = ref("");
	const nextSketch = ref("");
	const title = ref("");
	let mutator = new Mutator;
	let filmOpen = ref(false);

		function editCB(msg, arg1, arg2) {
			//console.log("Edit Callback activated " + msg + " " + arg1 + " " + arg2);
			if (msg === "drop") {
				targetView = undefined;
	 			lookForTarget();
	 		} else {
	 			console.log("Edit cb" + msg + " " + arg1 + " " + arg2);
	 		}
		}


let BGRWorker;
let bgrw;
let bgrw2;

let can1 = new OffscreenCanvas(1920, 1080); 
let can2 = new OffscreenCanvas(1920, 1080);
let bmr1 = can1.getContext("bitmaprenderer");
let bmr2 = can2.getContext("bitmaprenderer");
let hp;

let t0; let t1;

function reportHydra(h) {
	hp = h;
	console.log ("Hydra reported: " + h);
	
	hp.s2.init({src: can1, dynamic: true});
	hp.s3.init({src: can2, dynamic: true});
}

function cbHandler(msg, arg1, arg2) {
	console.log("CallbackHandler triggered");
}

	async function test() {
		await bgrw.openHydra();
		await bgrw.setSketch("noise(100, 100, 50).colorama().out()");
		await bgrw2.openHydra();
		await bgrw2.setSketch("osc(4, 0.1, 1.2).out()");

		await bgrw.tick(16);
			setTimeout((dt)=>{
    		bgrw.tick(16);
    		bgrw2.tick(16);
    	}, 16);
	
	}

  let instance1;

  async function init() {
    BGRWorker = Comlink.wrap(new Worker(new URL('./BGRworker.js', import.meta.url), { type: 'module'}));
    bgrw = await new BGRWorker();
    await bgrw.registerCallback("test", Comlink.proxy(cbHandler));
    await bgrw.registerCallback("frame", Comlink.proxy(frameCB));
    
    bgrw2 = await new BGRWorker();
    await bgrw2.registerCallback("frame", Comlink.proxy(frameCB2));
	}

 function frameCB(img) {
  bmr1.transferFromImageBitmap(img);
 		setTimeout((dt)=>{
    	bgrw.tick(8);
   }, 8);
 	}

 	function frameCB2(img) {
 	
 	  bmr2.transferFromImageBitmap(img);
		t1 = performance.now();
		let dT = t1 - t0;
		console.log("dT = " + dT);

 		setTimeout((dt)=>{
		  t0 = performance.now();
    	bgrw2.tick(8);
   }, 8);
 	}
 
  init();
const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();
let ctx;

onMounted(() => {
    context.value = canvasElement.value;
		ctx = context.value.getContext("2d");
});


	onBeforeUnmount(() => {
	});

	function changed(e, t) {
		nextSketch.value = e;
	}

  async function sendTargetHydra(evt) {
    sketch.value = nextSketch.value;
  }

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

  function randomHydra(evt) {
		let sketchX = getRandomInt(examples.length);
		let sketche = examples[sketchX];
		console.log(sketche.sketch_id);
		title.value = sketche.sketch_id;
		let s64 = sketche.code;
		let ska = decodeURIComponent(atob(s64));
		nextSketch.value = ska;
		sketch.value = ska;
		//sendTargetHydra();
  }

  // Custom code to execute before closing
  // For example, display a confirmation message
  window.addEventListener('unload', function (event) {
	fairwell();

});

	function mutate(evt) {
	 	let newSk = mutator.mutate({}, sketch.value);
	 	nextSketch.value = newSk;
	 	sketch.value = nextSketch.value;
	 	if (evt.shiftKey) sendTargetHydra();
	}

	function toggleFilm(evt) {
	 filmOpen.value = !filmOpen.value;
	}


	function updater(newV, e, what) {
	nextSketch.value = newV;
	title.value="";
	if (what === "step" || what === "fast") {
			if (e.shiftKey){sendTargetHydra(e)} 
					else {sketch.value = nextSketch.value};
	} else {
			sendTargetHydra(e)
	}

}


if (crossOriginIsolated) {
    console.log("***SharedArrayBuffer is available");
} else {
		console.log("***SharedArrayBuffer is not available");
}


</script>


<template>
<table><tbody><tr>
<td>
<Hydra :sketch="sketch" :hush="false" :width="192" :height="108" :reportHydra="reportHydra"/>
<canvas ref="canvasElement" width="192" height="109"></canvas>
</td>
<td>
<div class="simpleborder">
	<IconButton icon="fa--random icon"  :action="randomHydra"/>
	<IconButton icon="fa-solid--dice" :action="mutate"/>&nbsp;
	<IconButton icon="carbon--send-action-usage icon" :action="sendTargetHydra"/>&nbsp;&nbsp;
  <IconButton icon="fa--film icon" :action="toggleFilm"/>
  <IconButton icon="fa--play-circle-o icon" :action="test"/>
</div>
  &nbsp;
  <InActorPanel :script="sketch" :updateScript="updater" :hidden="!filmOpen"/>

&nbsp;{{title}}
</td></tr></tbody></table>
<Editor :text="nextSketch" @textChanged="changed" :limit="limit"/>
</template>

<style>
.simpleborder {
display:inline-block;
 border: 1px solid black;
 box-sizing: border-box;
 position: relative;
}
</style>