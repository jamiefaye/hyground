<script setup lang="ts">

  import {onMounted, onBeforeUnmount, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Hydra from "./Hydra.vue";
	import Editor from "./Editor.vue";
	import examples from './examples.json';
//	import {MsgBrokerClass} from "./MsgBroker.js";
	import {openMsgBroker} from "hydra-synth";

	import * as Comlink from "comlink";
	import IconButton from "./IconButton.vue";
	import {Mutator} from "./Mutator.js";
	import InActorPanel from "./InActorPanel.vue";

  const props = defineProps({
  index: Number,
  showVid: Boolean,
  limit: Boolean
	});


	let brokerObj;
  let broker;
	let n;
	const sketch = ref("");
	const nextSketch = ref("");
	const title = ref("");
	let mutator = new Mutator;
	let filmOpen = ref(false);
	let sketchInfoRef = ref({});

		function editCB(msg, arg1, arg2) {
			//console.log("Edit Callback activated " + msg + " " + arg1 + " " + arg2);
			if (msg === "drop") {
				brokerObj.targetView = undefined;
	 			brokerObj.lookForTarget();
	 		} else {
	 			console.log("Edit cb" + msg + " " + arg1 + " " + arg2);
	 		}
		}

	async function openOurBroker(evt) {
		brokerObj = await openMsgBroker("editor", "stage", editCB);
		broker = brokerObj.broker;
		n = brokerObj.name;
		console.log("Created: " + n);
		await brokerObj.lookForTarget();
		}

  async function fairwell() {
    await brokerObj.dropAndNotify(false);
  	//await broker.dropAndNotify(n, "editor", "editor");
  }

let hydraRenderer;
let hydraCanvas;

async function reportHydra(newH, newCanvas) {
	hydraRenderer = newH;
	hydraCanvas = newCanvas;
}


	onMounted(() => {
		openOurBroker();
	});

	onBeforeUnmount(() => {
		fairwell(); // This never seems to be called.
	});

	function changed(e, t) {
		nextSketch.value = e;
	}

  async function sendTargetHydra(evt) {
  	setLocalSketch(nextSketch.value);
  	await broker.callback(brokerObj.targetView, "update", nextSketch.value, {...sketchInfoRef.value});
  }

function setLocalSketch(text) {
//console.log("Set Local Sketch to: " + text);
	sketch.value = text;
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
		setLocalSketch(ska);
		//sendTargetHydra();
  }


  window.addEventListener('unload', function (event) {
	fairwell();

});

	function mutate(evt) {
	 	let newSk = mutator.mutate({changeTransform: evt.metaKey}, sketch.value);
	 	nextSketch.value = newSk;
	 	setLocalSketch(nextSketch.value);
	 	if (evt.shiftKey) sendTargetHydra();
	}

	function toggleFilm(evt) {
	 filmOpen.value = !filmOpen.value;
	}


	function updater(newV, sketchInfo, e, what) {
	nextSketch.value = newV;
	sketchInfoRef.value = sketchInfo;
	title.value="";
	if (what === "step" || what === "fast") {
			if (e.shiftKey){sendTargetHydra(e)} 
					else {setLocalSketch(nextSketch.value)};
	} else {
			sendTargetHydra(e)
	}

}


if (crossOriginIsolated) {
    console.log("***SharedArrayBuffer is available");
} else {
		console.log("***SharedArrayBuffer is not available");
}

function getHydraRenderer() {
	return hydraRenderer;
}

let inActState;

function reportInActorState(state) {
	inActState = state;
}

function evalDone(hydraRenderer, text, timeB4) {
		console.log(`evalDone ${timeB4}`);
	 inActState.evalDone(hydraRenderer, text, timeB4);
}

</script>


<template>
<table><tbody><tr>
<template v-if="showVid">
<td>
<Hydra :sketch="sketch" :key="sketch" :sketchInfo="sketchInfoRef" :reportHydra="reportHydra" :evalDone="evalDone" :width="192" :height="108"/>
</td>
</template>
<td>
<div class="simpleborder">
	<IconButton icon="fa--random icon"  :action="randomHydra"/>
	<IconButton icon="fa-solid--dice" :action="mutate"/>&nbsp;
	<IconButton icon="carbon--send-action-usage icon" :action="sendTargetHydra"/>&nbsp;&nbsp;
  <IconButton icon="fa--film icon" :action="toggleFilm"/>

</div>
  &nbsp;
  <InActorPanel :script="sketch" :updateScript="updater" :hidden="!filmOpen"
  :reportInActorState="reportInActorState"/>

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