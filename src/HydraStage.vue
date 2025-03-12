<script setup lang="ts">
  import {onMounted, onBeforeUnmount, ref, watch} from 'vue';
	import Hydra from "./Hydra.vue";
	import * as Comlink from "comlink";
  import {openMsgBroker} from "./MsgBroker.js";
  import IconButton from "./IconButton.vue";
  import InActorPanel from "./InActorPanel.vue";
  import {Deglobalize} from './Deglobalize.js';
  
  let stageName;
  let broker;

  let fxHydra;
  const fxSketch = ref("src(s2).repeat().out()");
  
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

  let flipper = 0;

// reverse the state of the flipper always as an integer
	function flipIt() {
		if (flipper) flipper = 0; else flipper = 1;
	}

// returns inverse state of flipper.
	function unflipped() {
		return flipper ? 0 : 1;
	}

	let hBgworker = new Array(2);
	let canv = new Array(2);
	let bmr = new Array(2);
	
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
	window.open("/editor", "editor", "width=500,height=1080,left=20");
}

async function updater(newV) {
	if (!fxActive) {
		fxSketch.value = newV;
		console.log(newV);
	} else {
		flipIt();
		await hBgworker[flipper].hush(); // Sometimes deserializes wrong.
		await hBgworker[flipper].setSketch(newV);

		if (flipper) 
			fxSketch.value = `let t0 = Date.now();src(s2).blend(s3, ()=>{return Math.min((Date.now()-t0) / 500.0, 1.0) }).out()`;
			 else
			fxSketch.value = `let t0 = Date.now();src(s3).blend(s2, ()=>{return Math.min((Date.now()-t0)/ 500.0, 1.0)}).out()`;
	}
}

// Hydras can be changed by the resize process, so we may need to fix stuff.
async function reportHydra(newH) {
	fxHydra = newH;
	console.log("New Hydra instance reported.");
	if (fxActive) {
		fxHydra.s2.init({src: canv[0], dynamic: true});
		fxHydra.s3.init({src: canv[1], dynamic: true});
	}
}

async function openFX() {
		if (fxLoaded) return;

    BGRWorker = Comlink.wrap(new Worker(new URL('./BGRworker.js', import.meta.url), { type: 'module'}));
    hBgworker[0] = await new BGRWorker();
    hBgworker[1] = await new BGRWorker();
    
    await hBgworker[0].openHydra();
    await hBgworker[1].openHydra();
    

    await hBgworker[0].registerCallback("frame", Comlink.proxy(frameCB0));
    await hBgworker[1].registerCallback("frame", Comlink.proxy(frameCB1));

		canv[0] = new OffscreenCanvas(1920, 1080); 
		canv[1] = new OffscreenCanvas(1920, 1080);
		bmr[0] = canv[0].getContext("bitmaprenderer");
		bmr[1] = canv[1].getContext("bitmaprenderer");
		fxHydra.s2.init({src: canv[0], dynamic: true});
		fxHydra.s3.init({src: canv[1], dynamic: true});

		fxLoaded = true;
		fxActive = true;

		setTimeout((dt)=>{
    		hBgworker[0].tick(frameTime, mouseData);
    		hBgworker[1].tick(frameTime, mouseData);
    }, frameTime * 2);
}

 function frameCB0(img) {
  	bmr[0].transferFromImageBitmap(img);
 		setTimeout((dt)=>{
    	hBgworker[0].tick(frameTime, mouseData);
   }, frameTime);
 	}

 	function frameCB1(img) {
 	  bmr[1].transferFromImageBitmap(img);
		t1 = performance.now();
		let dT = t1 - t0;
		//console.log("dT = " + dT);

 		setTimeout((dt)=>{
		  t0 = performance.now();
    	hBgworker[1].tick(frameTime, mouseData);
   },frameTime);
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

async function turnFXOn() {
	fxActive = fx.value;
	if (fxActive) {
		if (!fxLoaded) await openFX();
	}
	await hBgworker[0].setSketch("hush()");
	await hBgworker[1].setSketch("hush()");
}

watch(fx, turnFXOn);

</script>

<template>

<button type="button" id="HydraNxt" @click="openEditor">Edit</button>&nbsp;
<input type="checkbox" id="fx" v-model="fx" />
<label for="fx">Fx</label>
&nbsp;
<InActorPanel :script="fxSketch" :updateScript="updater"/>
<Hydra :sketch="fxSketch" :hush="false" :width="widthRef" :height="heightRef" :key="keyctr" :reportHydra="reportHydra"/>
</template>
