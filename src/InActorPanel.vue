<script setup lang="ts">
import {InActorState} from "./InActorState.js";
import IconButton from "./IconButton.vue";
import {ref, type Ref, reactive, onMounted, defineProps} from "vue"

  const props = defineProps({
  	script: String,
  	updateScript: Function
	}); 

let info = reactive({countdown: "", playerIndex: ""});

let state = new InActorState(props.script, props.updateScript, info);

</script>

<template>
<div class="panelborder">
	<IconButton icon="fa-solid--trash-alt icon" :action="()=>state.doClear()"/>
	<IconButton icon="fa-solid--file-import icon" :action="()=>state.doFileImport()"/>
	<IconButton icon="fa-solid--file-export icon" :action="()=>state.doFileExport()"/>
	<IconButton icon="fa--upload icon" :action="()=>state.doLoad()"/>
	&nbsp;
	<IconButton icon="fa6-solid--backward-fast icon" :action="()=>state.doFastBackward()"/>
	<IconButton icon="fa--step-backward icon" :action="()=>state.doStepBackward()"/>
	<template v-if="!info.playing">
	<IconButton icon="fa--play icon" :action="()=>state.doPlay()"/>
	</template>
	<template v-if="info.playing">
	<IconButton icon="fa6-regular--circle-pause icon" :action="()=>state.doPlay()"/>
	</template>
	<IconButton icon="fa--step-forward icon" :action="()=>state.doStepForward()"/>
	<IconButton icon="fa6-solid--forward-fast icon" :action="()=>state.doFastForward()"/>
	<IconButton icon="fa-solid--thumbs-up icon" :action="()=>state.doMark()"/>
</div>&nbsp;{{info.playerIndex}}&nbsp;{{info.countdown}}
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
