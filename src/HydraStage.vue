<script setup lang="ts">
  import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
  import Hydra from './Hydra.vue';
  import * as Comlink from 'comlink';
  import InActorPanel from './InActorPanel.vue';
  import { BGSynth, openMsgBroker } from 'hydra-synth';
  import StagePanel from './StagePanel.vue';
  import Editors from './Editors.vue'
  const props = defineProps({
    show: Boolean,
  });

  let stageName;
  let brokerObj;

  let hydraRenderer;
  let fxHydra;
  let fxCanvas;

  //  const fxSketch = ref("src(s2).out()");
  const fxSketch = ref('');

  let fxsketchInfo = {};

  const frameTime = 16;

  let fxLoaded = false;
  let fxActive = false;
  const widthRef = ref(window.innerWidth);
  const heightRef = ref(window.innerHeight);

  const hidePanel = ref(false);

  const panelParams = reactive({
    fx: false,
    wgsl: false,
    quad: false,
  });


  const mouseData = { x: 0, y:0 };

  // flipper = 0 means A goes to s2, B goes to s3
  // flipper = 1 means A goes to s3, B goes to s2

  let lastSketchIsDirect = false;
  let flipper = 0;

  // reverse the state of the flipper always as an integer
  function flipIt () {
    if (flipper) flipper = 0; else flipper = 1;
  }

  // returns inverse state of flipper.
  function unflipped () {
    return flipper ? 0 : 1;
  }

  let hBGSynth = new Array(2);

  let t0; let t1;

  function cb (msg, arg1, arg2) {
    //console.log("Callback activated " + msg + " " + arg1 + " " + arg2);
    if (msg === 'update') { updater(arg1, arg2) }
    else if (msg === 'drop') {

    }
  }

  async function openBroker (evt) {

    brokerObj = await openMsgBroker('stage', 'editor', cb);
    stageName = brokerObj.name;
    console.log('Created: ' + stageName);
  }

  async function fairwell () {
    console.log('notify drop sent: ' + stageName);
    await brokerObj.dropAndNotify(true);
    console.log('notify drop done: ' + stageName);
  }


  onMounted(() => {
    openBroker();
    window.addEventListener('resize', resizeCanvas);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeCanvas);
    fairwell();
  });

  document.addEventListener('mousemove', function (event) {
    mouseData.x = event.clientX;
    mouseData.y = event.clientY;
  });
  // Custom code to execute before closing
  window.addEventListener('unload', function (event) {
    fairwell();
  });

  function openEditor () {
    window.open('/index.html?edit=t', 'editor', 'width=500,height=1080,left=20');
    //  	window.open("/hyground/index.html?edit=t", "editor", "width=500,height=1080,left=20");
  }

  async function updater (newV, sketchInfo, e, what) {
    if (!fxActive) {
      fxSketch.value = newV;
      fxsketchInfo = sketchInfo;
      lastSketchIsDirect = true;
    } else {
      flipIt();
      if (!hBGSynth[flipper]) {
        console.log('BGWorker not set up');
        return;
      }
      if (sketchInfo.key) await hBGSynth[flipper].hush();
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
  async function reportHydra (newH, newCanvas) {
    hydraRenderer = newH;
    fxHydra = newH.synth;
    fxCanvas = newCanvas;
    console.log('New Hydra instance reported.');
    if (fxLoaded) {
      hBGSynth[0].setResolution(newCanvas.width, newCanvas.height);
      hBGSynth[1].setResolution(newCanvas.width, newCanvas.height);
    }
  }


  async function openFX () {
    if (fxLoaded) return;

    hBGSynth[0] = await new BGSynth(fxCanvas, panelParams.wgsl, false, true);
    hBGSynth[1] = await new BGSynth(fxCanvas, panelParams.wgsl, false, true);

    await hBGSynth[0].openWorker();
    await hBGSynth[1].openWorker();

    hBGSynth[0].requestFrameCallbacks(
      frame=>{
        fxHydra.s2.injectImage(frame);
      });
    hBGSynth[1].requestFrameCallbacks(frame=>{
      fxHydra.s3.injectImage(frame);
    });

    fxLoaded = true;
    fxActive = true;
  }


  const keyctr = ref(0);
  function resizeCanvas () {

    const inW = window.innerWidth;
    const inH = window.innerHeight; // - 80;
    widthRef.value = inW;
    heightRef.value = inH;
    console.log('Resized: ' + inW + ' + ' +inH + ' keyctr: ' + keyctr.value);
    keyctr.value++;
  }

  async function toggleFX () {
    fxActive = panelParams.fx;
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
        await hBGSynth[0].setSketch('hush()');
      if (hBGSynth[1])
        await hBGSynth[1].setSketch('hush()');
    }
  }

  let inActState;

  function reportInActorState (state) {
    inActState = state;
  }

  function evalDone (hydraRenderer, text, timeB4) {
    console.log(`Stage evalDone ${timeB4}`);
    if (inActState && inActState.evalDone) inActState.evalDone(hydraRenderer, text, timeB4);
    if (panelParams.quad) hydraRenderer.synth.render();
  }


  async function toggleWgsl () {
    keyctr.value++;
  }

  watch(()=>panelParams.fx, toggleFX);
  watch(()=>panelParams.wgsl, toggleWgsl);

</script>


<template>
  <template v-if="props.show">
    <StagePanel
      :params="panelParams"
      :report-in-actor-state="reportInActorState"
      :sketch="fxSketch"
      :update-script="updater"
    />
  </template>
  <Hydra
    :key="keyctr"
    :eval-done="evalDone"
    :height="heightRef"
    :report-hydra="reportHydra"
    :sketch="fxSketch"
    :sketch-info="fxsketchInfo"
    :wgsl="panelParams.wgsl"
    :width="widthRef"
  />
</template>
