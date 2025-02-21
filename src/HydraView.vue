<script setup lang="ts">
  import {onMounted, onBeforeUnmount, ref} from 'vue';
	import Hydra from "./Hydra.vue";
	import * as Comlink from "comlink";
  import {openMsgBroker} from "./MsgBroker.js";

  const sketch = ref("noise().out()");
  let broker;
  let n;
 
function cb(msg, arg1, arg2) {
	console.log("Callback activated " + msg + " " + arg1 + " " + arg2);
	if (msg === "update") { sketch.value = arg1; }
	 else if (msg === "drop") {
	 		
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
});

onBeforeUnmount(() => {
	fairwell();
});

  // Custom code to execute before closing
  // For example, display a confirmation message
  window.addEventListener('unload', function (event) {
		fairwell();
	});

function editHydra() {
	window.open("/editor", "editor", "width=800,height=1000,left=80");
}

</script>
 
<template>
<button type="button" id="HydraNxt" @click="editHydra">Edit</button><br>
<Hydra :sketch="sketch"/>
</template>
