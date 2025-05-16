<script setup lang="ts">
import {InActorState} from "./InActorState.js";
import IconButton from "./IconButton.vue";
import IconToggleButton from "./IconToggleButton.vue";
import {ref, type Ref, reactive, onMounted, watch} from "vue"

  const props = defineProps({
  	script: String,
  	updateScript: Function,
  	reportInActorState: Function,
  	hidden: Boolean
	}); 

let info = reactive({countdown: " 0.0", playerIndex: "", defaultDur: 2.0, maxDur: 0.0});

let state = new InActorState(props.updateScript, info);
if (props.reportInActorState) props.reportInActorState(state);
/*
watch(()=>props.script,
()=>{
state.pushSketch(props.script)
});
*/
	let settingsOpen = ref(false);

function openStateMenu(state, e) {
	settingsOpen.value = !settingsOpen.value;
}


</script>

<template>
<template v-if="!hidden">
<div class="panelborder">
	<IconButton icon="fa-solid--trash-alt icon" :action="(e)=>state.doClear(e)"/>
	<IconButton icon="fa-solid--file-import icon" :action="(e)=>state.doFileImport(e)"/>
	
	<template v-if="info.hasrecord">
	<IconButton icon="fa-solid--file-export icon" :action="(e)=>state.doFileExport(e)"/>
	<IconButton icon="lets-icons--box-refresh-alt-right icon" :action="(e)=>state.doLoad(e)"/>
	&nbsp;
	</template>

	<template v-if="info.hasplay">
	<IconButton icon="fa6-solid--backward-fast icon" :action="(e)=>state.doFastBackward(e)"/>
	<IconButton icon="fa--step-backward icon" :action="(e)=>state.doStepBackward(e)"/>
	<IconToggleButton onicon="fa6-regular--circle-pause icon" officon="fa--play icon" :onstate = "info.playing" :action="(e)=>{state.doPlay(e)}"/>
	<IconButton icon="fa--step-forward icon" :action="(e)=>state.doStepForward(e)"/>
	<IconButton icon="fa6-solid--forward-fast icon" :action="(e)=>state.doFastForward(e)"/>
	<IconButton icon="fa--cog icon" :action="(e)=>openStateMenu(state, e)"/>
  </template>


</div>
  <template v-if="settingsOpen">
   <br/>    Default: <input type="number" min="0" max="60"  v-model="info.defaultDur">&nbsp&nbsp
   Max: <input type="number"  min="0" max="300" v-model="info.maxDur"><br/>



  </template>
&nbsp;{{info.playerIndex}}&nbsp;{{info.countdown}}&nbsp{{info.filename}}
</template>


<p>Value: {{ info.maxDur }}</p>
</template>
<style>
.panelborder {
display:inline-block;
 border: 1px solid black;
 box-sizing: border-box;
 position: relative;
 margin-bottom: 4px;
}
</style>
