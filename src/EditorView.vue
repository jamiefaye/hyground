<script setup lang="ts">

  import {onMounted, onBeforeUnmount, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Hydra from "./Hydra.vue";
	import Editor from "./Editor.vue";
	import examples from './examples.json';
  import {openMsgBroker} from "./MsgBroker.js";
	import * as Comlink from "comlink";
	import IconButton from "./IconButton.vue";
	import {Mutator} from "./Mutator.js";
	import InActorPanel from "./InActorPanel.vue";
	
	
  const props = defineProps({
  entry: Object,
  index: Number,
  showVid: Boolean
	});

	let targetView;
	let broker;
	let n;
	const sketch = ref("");
	const nextSketch = ref("");
	const title = ref("");
	let mutator = new Mutator;
	let filmOpen = ref(false);

		function editCB(msg, arg1, arg2) {
			console.log("Edit Callback activated " + msg + " " + arg1 + " " + arg2);
			if (msg === "drop") {
				targetView = undefined;
	 			lookForTarget();
	 		}
		}

	async function locateTarget() {
		let list = await broker.listForKind("view");
		if (list.length > 0) {
			targetView = list[list.length - 1];
		}
	}

	async function checkTarget() {
		let list = await broker.listForKind("view");
		if (list.length > 0) {
			targetView = list[list.length - 1];
		}
		return targetView;
	}

	async function lookForTarget() {
	console.log("lookForTarget");
		if (targetView === undefined) {
			await checkTarget();
			if (targetView === undefined) {
			  console.log("Target checking in 1 second.");
				setTimeout(()=>lookForTarget(), 1000);
			}
		}
		if (targetView === undefined) {
			console.log("Target undefined");
		}
	}

	async function openBroker(evt) {
		broker = await openMsgBroker();
		n = await broker.assignName("editor");
		console.log("Created: " + n);
		await broker.registerCallback(n, Comlink.proxy(editCB));
		await lookForTarget();
		}

  async function fairwell() {
  	await broker.dropAndNotify(n, "editor", "editor");
  }

	onMounted(() => {
		openBroker();
	});

	onBeforeUnmount(() => {
		fairwell(); // This never seems to be called.
	});

	function changed(e, t) {
		nextSketch.value = e;
	}

  async function sendTargetHydra(evt) {
    sketch.value = nextSketch.value;
  	await broker.callback(targetView, "update", nextSketch.value, 0);
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
	if (what === "step" || what === "fast") {
			if (e.shiftKey){sendTargetHydra(e)} 
					else {sketch.value = nextSketch.value};
	} else {
			sendTargetHydra(e)
	}

}

</script>

<template>
<table><tbody><tr>
<template v-if="showVid">
<td>
<Hydra :sketch="sketch" :hush="false" :width="192" :height="108"/>
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
  <InActorPanel :script="sketch" :updateScript="updater" :hidden="!filmOpen"/>

&nbsp;{{title}}
</td></tr></tbody></table>
<Editor :text="nextSketch" @textChanged="changed" />
</template>

<style>
.simpleborder {
display:inline-block;
 border: 1px solid black;
 box-sizing: border-box;
 position: relative;

}
</style>