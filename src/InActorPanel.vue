<script setup lang="ts">
import {InActorState} from "./InActorState.js";
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
<v-container fluid><v-row class='ga-1'>
<template v-if="!hidden">
	<v-icon icon="fa:fas fa-solid--trash-alt" size="small" @click="(e)=>state.doClear(e)"/>
	<v-icon icon="fa:fas fa-solid--file-import" size="small" @click="(e)=>state.doFileImport(e)"/>
	<template v-if="info.hasrecord">
	<v-icon icon="fa:fas fa-solid--file-export" size="small" @click="(e)=>state.doFileExport(e)"/>
	<v-icon icon="fa:fas lets-icons--box-refresh-alt-right" size="small" @click="(e)=>state.doLoad(e)"/>
	</template>

	<template v-if="info.hasplay">
	<v-icon icon="fa:fas fa6-solid--backward-fast" @click="(e)=>state.doFastBackward(e)"/>
	<v-icon icon="fa:fas fa--step-backward" size="small" @click="(e)=>state.doStepBackward(e)"/>
	<template v-if="info.playing">
	<v-icon icon="fa:fas fa6-regular--circle-pause" size="small" @click="(e)=>{state.doPlay(e)}" />
	</template>
	<template v-if="!info.playing">
		<v-icon icon="fa:fas fa--play" size="small" @click="(e)=>{state.doPlay(e)}" />
	</template>
	<v-icon icon="fa:fas fa--step-forward" size="small" @click="(e)=>state.doStepForward(e)"/>
	<v-icon icon="fa:fas fa6-solid--forward-fast" size="small" @click="(e)=>state.doFastForward(e)"/>
	<v-icon icon="fa:fas fa--cog" size="small" @click="(e)=>openStateMenu(state, e)"/>
  </template>

  <template v-if="settingsOpen">
   <br/>    Default: <input type="number" min="0" max="60"  v-model="info.defaultDur">&nbsp&nbsp
   Max: <input type="number"  min="0" max="300" v-model="info.maxDur"><br/>

  </template>
&nbsp;{{info.playerIndex}}&nbsp;{{info.countdown}} {{info.filename}}
</template>
</v-row>
</v-container>
</template>

