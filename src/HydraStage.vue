<script setup lang="ts">
  import {onMounted, onBeforeUnmount, ref, watch} from 'vue';
	import Hydra from "./Hydra.vue";
	import * as Comlink from "comlink";
  import {openMsgBroker} from "./MsgBroker.js";
  import IconButton from "./IconButton.vue";
  import InActorPanel from "./InActorPanel.vue";
  import {lookForAudioObjectUse} from './Deglobalize.js';
  import {BGSynth} from './BGSynth.js';

  let stageName;
  let broker;

  let fxHydra;
  const fxSketch = ref("src(s2).out()");
  
  let frameTime = 16;
  
  let fx = ref(false);
  
  let fxLoaded = false;
  let fxActive = false;
  let widthRef = ref(1920);
  let heightRef = ref(1080);

  let BGRWorker;
	let mouseData = {x: 0, y:0};

	// flipper = 0 means A goes to s2, B goes to s3
	// flipper = 1 means A goes to s3, B goes to s2

	let lastSketchIsDirect = false;
  let flipper = 0;

// reverse the state of the flipper always as an integer
	function flipIt() {
		if (flipper) flipper = 0; else flipper = 1;
	}

// returns inverse state of flipper.
	function unflipped() {
		return flipper ? 0 : 1;
	}

	let hBGSynth = new Array(2);
	
	let t0; let t1;

function cb(msg, arg1, arg2) {
	//console.log("Callback activated " + msg + " " + arg1 + " " + arg2);
	if (msg === "update") { updater(arg1) }
	 else if (msg === "drop") {
		 
	 }
}

	async function openBroker(evt) {
		broker = await openMsgBroker();
		stageName = await broker.assignName("stage");
		console.log("Created: " + stageName);
		await broker.registerCallback(stageName, Comlink.proxy(cb));
	}

  async function fairwell() {
    console.log("notify drop sent: " + stageName);
  	await broker.dropAndNotify(stageName, "stage", "editor");
  	console.log("notify drop done: " + stageName);
  }

onMounted(() => {
	openBroker();
	window.addEventListener("resize", resizeCanvas);
});

onBeforeUnmount(() => {
	window.removeEventListener("resize", resizeCanvas);
	fairwell();
});

document.addEventListener('mousemove', function(event) {  
  mouseData.x = event.clientX;
  mouseData.y = event.clientY;
});
  // Custom code to execute before closing
  window.addEventListener('unload', function (event) {
		fairwell();
	});

function openEditor() {
   	window.open("/index.html?edit=t", "editor", "width=500,height=1080,left=20");
//  	window.open("/hyground/index.html?edit=t", "editor", "width=500,height=1080,left=20");
}

async function updater(newV) {
let hasA = false;
try {
	hasA = lookForAudioObjectUse(newV);
	} catch (err) {}

	if (!fxActive || hasA) {
		fxSketch.value = newV;
		lastSketchIsDirect = true;
	} else {
		flipIt();
		if (!hBGSynth[flipper]) {
			console.log("BGWorker not set up");

			return;
		}

		await hBGSynth[flipper].hush();
		await hBGSynth[flipper].setSketch(newV); // Maybe hush()?

	// If coming out of a "direct to fxSketch" activation, we don't want to do a blend-in since it would reference the wrong BGRworker source.
	// So just do a cut now and we can pick up using the FX stuff on the next transition.
	
	  if (lastSketchIsDirect) {
	  	if (flipper) {
	  		fxSketch.value = `src(s3).out()`;
	  	} else {
	  		fxSketch.value = `src(s2).out()`;
	  	}
	  	lastSketchIsDirect = false;
	  	return;
	  }

		if (flipper) 
			fxSketch.value = `let t0 = time;src(s2).blend(s3, ()=>{return Math.min((time-t0) * 2.0, 1.0) }).out()`;
			 else
			fxSketch.value = `let t0 = time;src(s3).blend(s2, ()=>{return Math.min((time-t0) * 2.0, 1.0)}).out()`;
	}
}

// Hydras can be changed by the resize process, so we may need to fix stuff.
async function reportHydra(newH) {
	fxHydra = newH;
	console.log("New Hydra instance reported.");

	if (fxActive) {
			hBGSynth[0].changeDestination(fxHydra, 's2');
			hBGSynth[1].changeDestination(fxHydra, 's3');
	}
}

async function openFX() {
		if (fxLoaded) return;

    hBGSynth[0] = await new BGSynth(fxHydra, "s2", true);
    hBGSynth[1] = await new BGSynth(fxHydra, "s3", true);
    
    await hBGSynth[0].openWorker();
    await hBGSynth[1].openWorker();

		fxLoaded = true;
		fxActive = true;
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

async function toggleFX() {
	fxActive = fx.value;
	if (!fxActive) {
	// FX turned off, so tear everything down.
		if (hBGSynth[0])
	 		hBGSynth[0].destroy();
	 	if (hBGSynth[1])
	 		hBGSynth[1].destroy();
	 	hBGSynth = new Array(2);
	 	fxActive = false;
	 	fxLoaded = false;
	} else {
		await openFX();
		if (hBGSynth[0])
			await hBGSynth[0].setSketch("hush()");
		if (hBGSynth[1])
			await hBGSynth[1].setSketch("hush()");
  }
}

watch(fx, toggleFX);

</script>

<template>
<button type="button" id="HydraNxt" @click="openEditor">Edit</button>&nbsp;
<input type="checkbox" id="fx" v-model="fx" />
<label for="fx">Fx</label>
&nbsp;
<InActorPanel :script="fxSketch" :updateScript="updater"/>
<Hydra :sketch="fxSketch" :hush="false" :width="widthRef" :height="heightRef" :key="keyctr" :reportHydra="reportHydra"/>
</template>
