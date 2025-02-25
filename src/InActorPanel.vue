<script setup lang="ts">
import {InActorState} from "./InActorState.js";
import IconButton from "./IconButton.vue";
import IconToggleButton from "./IconToggleButton.vue";
import {ref, type Ref, reactive, onMounted, watch} from "vue"

  const props = defineProps({
  	script: String,
  	updateScript: Function
	}); 

let info = reactive({countdown: "", playerIndex: ""});

let state = new InActorState(props.updateScript, info);

watch(()=>props.script,
()=>{
state.pushSketch(props.script)
});
</script>

<template>
<div class="panelborder">
	<IconButton icon="fa-solid--trash-alt icon" :action="()=>state.doClear()"/>
	<IconButton icon="fa-solid--file-import icon" :action="()=>state.doFileImport()"/>
	
	<template v-if="info.hasrecord">
	<IconButton icon="fa-solid--file-export icon" :action="()=>state.doFileExport()"/>
	<IconButton icon="lets-icons--box-refresh-alt-right icon" :action="()=>state.doLoad()"/>
	&nbsp;
	</template>
	
	<template v-if="info.hasplay">
		<IconButton icon="fa6-solid--backward-fast icon" :action="()=>state.doFastBackward()"/>
		<IconButton icon="fa--step-backward icon" :action="()=>state.doStepBackward()"/>
		<IconToggleButton onicon="fa6-regular--circle-pause icon" officon="fa--play icon" :onstate = "info.playing" :action="()=>{state.doPlay()}"/>
	<IconButton icon="fa--step-forward icon" :action="()=>state.doStepForward()"/>
	<IconButton icon="fa6-solid--forward-fast icon" :action="()=>state.doFastForward()"/>
  </template>
</div>

&nbsp;{{info.playerIndex}}&nbsp;{{info.countdown}}
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
