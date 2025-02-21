<script setup lang="ts">

  import {onMounted, ref} from 'vue';
	import Hyground from "./Hyground.vue";
	import Hydra from "./Hydra.vue";
	import Editor from "./Editor.vue";
  import examples from './examples.json';

  import {openMsgBroker} from "./MsgNode.js";
  
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

  const sketch = ref("noise().out()");
  const nextSketch = ref("");
  const title = ref("");
  let flipper = false;
 
  function runHydra(evt) {
  	sketch.value = nextSketch.value;
  }

  function stepHydra(evt) {
		let sketchX = getRandomInt(examples.length);
		let sketche = examples[sketchX];
		console.log(sketche.sketch_id);
		title.value = sketche.sketch_id;
		let s64 = sketche.code;
		let ska = decodeURIComponent(atob(s64));
		sketch.value = ska;
  }

function cb(msg, arg1, arg2) {
	console.log("Callback activated " + msg + " " + arg1 + " " + arg2);
}

	function editHydra(evt) {
	//	window.open("/editor", "_blank", "width=1200,height=800,left=1800");
		openMsgBroker().then((x)=>{
			x.assignName("view").then((n)=> {
						console.log("Created: " + n);
						window.open("/editor", "editor", "width=800,height=600,left=800");
						x.registerCallback(n, Comlink.proxy(cb))).then(()=>{
							x.callback(n, "msg", 1 , {cats: [2, 3, 4]});
						});
				});

		});
	}


function changed(e,t) {
	nextSketch.value = e;
}


</script>
 
<template>
{{title}}
<Hydra :sketch="sketch"/>
<button type="button" id="Hydra" @click="runHydra">Run</button>&nbsp;
<button type="button" id="HydraNxt" @click="stepHydra">Next</button>&nbsp;
<button type="button" id="HydraNxt" @click="editHydra">Edit</button><br>
<Editor :text="sketch" @textChanged="changed"/>
</template>
