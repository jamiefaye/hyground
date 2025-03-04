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

function cbHandler(msg, arg1, arg2) {
	console.log("CallbackHandler triggered");
}
	
	async function test() {
		bgrw.increment();;
		console.log(await bgrw.counter);
		bgrw.callback("test", "meow", 1, 2);
	

		await bgrw.openHydra();
		await bgrw.setSketch("noise().out()");
		await bgrw.tick(16);
		let img = await bgrw.getFrameData();
		drawImg(img);
			
	}

  let instance1

  async function init() {
  	let url = new URL('./BGRworker.js', import.meta.url);
    BGRWorker = Comlink.wrap(new Worker(url, { type: 'module'}));
    bgrw = await new BGRWorker();
    await bgrw.registerCallback("test", Comlink.proxy(cbHandler));

	}
  
  init();
const canvasElement: Ref<HTMLCanvasElement | undefined> = ref();
const context: Ref<CanvasRenderingContext2D | undefined> = ref();
let ctx;

onMounted(() => {
    context.value = canvasElement.value;
		ctx = context.value.getContext("2d");
});

function drawImg(img) {
	let can = context.value;
	ctx.drawImage(img, 0, 0, 192, 108);
	img.close();
}

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


   function getHeaders() {
let req = new XMLHttpRequest();
req.open('GET', document.location, false);
req.send(null);

// associate array to store all values
let data = new Object();

// get all headers in one call and parse each item
let headers = req.getAllResponseHeaders().toLowerCase();
let aHeaders = headers.split('\n');
let i =0;
for (let i = 0; i < aHeaders.length; i++) {
    let thisItem = aHeaders[i];
    let key = thisItem.substring(0, thisItem.indexOf(':'));
    let value = thisItem.substring(thisItem.indexOf(':')+1);
    data[key] = value;
}	    
/*
// get referer
let referer = document.referrer;
data["Referer"] = referer;

//get useragent
let useragent = navigator.userAgent;
data["UserAgent"] = useragent;
*/

	console.log(data);

}
</script>


<template>
<table><tbody><tr>
<td>
//<Hydra :sketch="sketch" :hush="false" :width="192" :height="108"/>
<canvas ref="canvasElement" width="192" height="108"></canvas>
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