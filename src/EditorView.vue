<script setup lang="ts">

  import {onMounted, onBeforeUnmount, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Editor from "./Editor.vue";
	import examples from './examples.json';
  import {openMsgBroker} from "./MsgBroker.js";
	import * as Comlink from "comlink";
	import IconButton from "./IconButton.vue";
	import {Mutator} from "./Mutator.js";
	
  const props = defineProps({
  entry: Object,
  index: Number
	});

	let targetView;
	let broker;
	let n;
	const sketch = ref("");
	const nextSketch = ref("");
	const title = ref("");
	let mutator = new Mutator;
	

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
			//await broker.callback(targetView, "meow",1,2);
			//console.log("Back from calling back");
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

  async function sendHydra(evt) {
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
		//sendHydra();
  }

  // Custom code to execute before closing
  // For example, display a confirmation message
  window.addEventListener('unload', function (event) {
	fairwell();

});

	function mutate(evt) {
	 	let newSk = mutator.mutate({}, sketch.value);
	 	nextSketch.value = newSk;
	 	sendHydra();
	}

</script>

<template>
<div class="simpleborder">
	<IconButton icon="fa--random icon"  :action="randomHydra"/>
	<IconButton icon="fa--play icon" :action="sendHydra"/>
	<IconButton icon="fa-solid--dice" :action="mutate"/>
</div>&nbsp;{{title}}<br/>
<Editor :text="sketch" @textChanged="changed"/>
</template>

<style>
.simpleborder {
display:inline-block;
 border: 1px solid black;
 box-sizing: border-box;
 position: relative;

}
</style>