<script setup lang="ts">
  import {onMounted, onBeforeUnmount, ref} from 'vue';
	import Hydra from "./Hydra.vue";
	import * as Comlink from "comlink";
  import {openMsgBroker} from "./MsgBroker.js";
  import InActorPanel from "./InActorPanel.vue";
  const sketch = ref("noise().out()");
  let broker;
  let n;
  
  let widthRef = ref(960);
  let heightRef = ref(540);
 
function cb(msg, arg1, arg2) {
	//console.log("Callback activated " + msg + " " + arg1 + " " + arg2);
	if (msg === "update") { sketch.value = arg1; }
	 else if (msg === "drop") {
		 
	 } 
	 else if (msg === "meow") {

		 console.log("Callback activated " + msg + " " + arg1.byteLength + " " + arg2);
		 return "Got It!";
	 } 	 else if (msg === "purr") {

		 console.log("Callback activated " + msg + " " + arg1.length + " " + arg2);
		 return "Got It!";
	 }
}

	async function openBroker(evt) {
		broker = await openMsgBroker();
		n = await broker.assignName("view");
		console.log("Created: " + n);
		await broker.registerCallback(n, Comlink.proxy(cb));
	}

  async function fairwell() {
    	console.log("notify drop sent: " + n);
  	await broker.dropAndNotify(n, "view", "editor");
  	console.log("notify drop done: " + n);
  }

onMounted(() => {
	openBroker();
	window.addEventListener("resize", resizeCanvas);
});

onBeforeUnmount(() => {
	window.removeEventListener("resize", resizeCanvas);
	fairwell();
});

  // Custom code to execute before closing
  // For example, display a confirmation message
  window.addEventListener('unload', function (event) {
		fairwell();
	});

function editHydra() {
	window.open("/editor", "editor", "width=640,height=1000,left=20");
}

function updater(newV) {
	sketch.value = newV;
}

let keyctr = ref(0);
function resizeCanvas() {

	let inW = window.innerWidth;
	let inH = window.innerHeight - 80;
	widthRef.value = inW;
	heightRef.value = inH;
	console.log("Resized: " + inW + " + " +inH + " keyctr: " + keyctr.value);
	keyctr.value++;
}

</script>

<template>

<button type="button" id="HydraNxt" @click="editHydra">Edit</button>&nbsp;<InActorPanel :script="sketch" :updateScript="updater"/>
<Hydra :sketch="sketch" :hush="false" :width="widthRef" :height="heightRef" :key="keyctr"/>
</template>

<style>

</style>