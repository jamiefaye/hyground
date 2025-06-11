<script setup lang="ts">
import {InActorState} from "../InActorState.js";
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
	<v-tooltip text="Clear Recording Buffer">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidTrashCan v-bind="tooltipProps" @click="(e)=>state.doClear(e)" />
		</template>
	</v-tooltip>
	<v-tooltip text="Import Recording File">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidFileImport v-bind="tooltipProps" @click="(e)=>state.doFileImport(e)" />
		</template>
	</v-tooltip>
	<template v-if="info.hasrecord">
	<v-tooltip text="Export Recording File">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidFileExport v-bind="tooltipProps" @click="(e)=>state.doFileExport(e)" />
		</template>
	</v-tooltip>
	<v-tooltip text="Load Recording into Playback">
		<template v-slot:activator="{ props: tooltipProps }">
			<ILetsIconsBoxRefreshAltRight v-bind="tooltipProps" @click="(e)=>state.doLoad(e)" />
		</template>
	</v-tooltip>
	</template>

	<template v-if="info.hasplay">
	<v-tooltip text="Fast Backward">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidBackwardFast v-bind="tooltipProps" @click="(e)=>state.doFastBackward(e)" />
		</template>
	</v-tooltip>
	<v-tooltip text="Step Backward">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidBackwardStep v-bind="tooltipProps" @click="(e)=>state.doStepBackward(e)" />
		</template>
	</v-tooltip>
	<template v-if="info.playing">
	<v-tooltip text="Pause">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6RegularCirclePause v-bind="tooltipProps" @click="(e)=>{state.doPlay(e)}" />
		</template>
	</v-tooltip>
	</template>
	<template v-if="!info.playing">
		<v-tooltip text="Play">
			<template v-slot:activator="{ props: tooltipProps }">
				<IFa6SolidPlay v-bind="tooltipProps" @click="(e)=>{state.doPlay(e)}" />
			</template>
		</v-tooltip>
	</template>
	<v-tooltip text="Step Forward">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidForwardStep v-bind="tooltipProps" @click="(e)=>state.doStepForward(e)" />
		</template>
	</v-tooltip>
	<v-tooltip text="Fast Forward">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidForwardFast v-bind="tooltipProps" @click="(e)=>state.doFastForward(e)" />
		</template>
	</v-tooltip>
	<v-tooltip text="Playback Settings">
		<template v-slot:activator="{ props: tooltipProps }">
			<IFa6SolidGear v-bind="tooltipProps" @click="(e)=>openStateMenu(state, e)" />
		</template>
	</v-tooltip>
  </template>

  <template v-if="settingsOpen">
   <v-row class="ga-2 pa-1">
     <v-col>
       <v-text-field
         v-model.number="info.defaultDur"
         label="Default Duration"
         type="number"
         min="0"
         max="60"
         step="0.1"
         suffix="sec"
         density="compact"
         hide-details
       />
     </v-col>
     <v-col>
       <v-text-field
         v-model.number="info.maxDur"
         label="Max Duration"
         type="number"
         min="0"
         max="300"
         step="0.1"
         suffix="sec"
         density="compact"
         hide-details
       />
     </v-col>
   </v-row>
  </template>
&nbsp;{{info.playerIndex}}&nbsp;{{info.countdown}} {{info.filename}}
</template>
</v-row>
</v-container>
</template>

