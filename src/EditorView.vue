<script setup lang="ts">

  import {onMounted, onBeforeUnmount, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Editor from "./Editor.vue";
	import examples from './examples.json';
  import {openMsgBroker} from "./MsgBroker.js";
	import * as Comlink from "comlink";

	let targetView;
	let broker;
	let n;
	const sketch = ref("");
	const nextSketch = ref("");
	const title = ref("");
	  

		function editCB(msg, arg1, arg2) {
			console.log("Edit Callback activated " + msg + " " + arg1 + " " + arg2);
			if (msg === "drop") {
	 			locateTarget();
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

	async function openBroker(evt) {
		broker = await openMsgBroker();
		n = await broker.assignName("editor");
		console.log("Created: " + n);
		await broker.registerCallback(n, Comlink.proxy(editCB));
		let list = await broker.listForKind("view");
		if (list.length > 0) {
			targetView = list[list.length - 1];
			//await broker.callback(targetView, "meow",1,2);
			//console.log("Back from calling back");
		}
		// Maybe poll looking for a view if none available now?
		}

  async function fairwell() {
    console.log("notify drop sent: " + n);
  	await broker.dropAndNotify(n, "editor", "editor");
  	console.log("notify drop done: " + n);
  }

	onMounted(() => {
		openBroker();
	});

	onBeforeUnmount(() => {
		fairwell();
		alert("Bye!");
	});

	function changed(e, t) {
		nextSketch.value = e;
	}

  async function sendHydra(evt) {
    sketch.value = nextSketch.value;
  	await broker.callback(targetView, "update", nextSketch.value, 0);
		console.log("Back from update callback");
  }

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

  function stepHydra(evt) {
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

</script>

<template>

  <button type="button" id="HydraNxt" @click="stepHydra">Next</button>&nbsp;
	<button type="button" id="sender" @click="sendHydra">Send</button>&nbsp;{{title}}
  <Editor :text="sketch" @textChanged="changed"/>

</template>

