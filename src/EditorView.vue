<script setup lang="ts">

  import {onMounted, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import HydraView from "./HydraView.vue";
	import Editor from "./Editor.vue";
	import {openMsgBroker, registerCallback} from "./MsgNode.js";
	import * as Comlink from "comlink";

	let targetView;

		function editCB(msg, arg1, arg2) {
			console.log("Edit Callback activated " + msg + " " + arg1 + " " + arg2);
		}
	
	async function openBroker(evt) {
		let x = await openMsgBroker();
		let n = await x.assignName("editor");
		console.log("Created: " + n);
		await x.registerCallback(n, Comlink.proxy(editCB));
		let list = await x.listForKind("view");
		if (list.length > 0) {
			targetView = list[list.length - 1];
			await x.callback(targetView, "meow",1,2);
			console.log("Back from calling back");
		}
		// Maybe poll looking for a view if none available now?
		}

	openBroker();

</script>
 
<template>
  <Editor/>

</template>

