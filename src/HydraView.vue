<script setup lang="ts">
  import {onMounted, ref} from 'vue';
	import Hydra from "./Hydra.vue";
	import * as Comlink from "comlink";
  import {openMsgBroker} from "./MsgBroker.js";

  const sketch = ref("noise().out()");
  let broker;
 
function cb(msg, arg1, arg2) {
	console.log("Callback activated " + msg + " " + arg1 + " " + arg2);
	sketch.value = arg1;
}

	async function openBroker(evt) {
		broker = await openMsgBroker();
		let n = await broker.assignName("view");
		console.log("Created: " + n);
		await broker.registerCallback(n, Comlink.proxy(cb));
	}


onMounted(() => {
	openBroker();
});

function editHydra() {
	window.open("/editor", "editor", "width=800,height=1000,left=80");
}

</script>
 
<template>
<button type="button" id="HydraNxt" @click="editHydra">Edit</button><br>
<Hydra :sketch="sketch"/>
</template>
