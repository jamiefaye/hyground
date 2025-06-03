<script setup lang="ts">
  import {onMounted, onBeforeUnmount, ref, watch} from 'vue';
	import Hydra from "./Hydra.vue";
  import InActorPanel from "./InActorPanel.vue";

  const props = defineProps({
  params: Object,
  reportInActorState: Function,
  updateScript: Function,
  sketch: String
 });

function openEditor() {
   	window.open("/editor", "editor", "width=500,height=1080,left=20");
//  	window.open("/hyground/index.html?edit=t", "editor", "width=500,height=1080,left=20");
}

</script>

<template>
<v-container fluid height='20px'><v-row><v-col><v-row>
<v-tooltip text="Open Code Editor">
	<template v-slot:activator="{ props: tooltipProps }">
		<v-btn v-bind="tooltipProps" @click="openEditor" size='x-small'>Edit</v-btn>
	</template>
</v-tooltip>
<v-tooltip text="Enable Transition Effects">
	<template v-slot:activator="{ props: tooltipProps }">
		<v-checkbox v-bind="tooltipProps" density='compact' hide-details v-model="props.params.fx" label='Fx'/>
	</template>
</v-tooltip>
<v-tooltip text="Use WebGPU Shading Language">
	<template v-slot:activator="{ props: tooltipProps }">
		<v-checkbox v-bind="tooltipProps" density='compact' hide-details v-model="props.params.wgsl" label='wgsl'/>
	</template>
</v-tooltip>
<v-tooltip text="Enable Quad Rendering">
	<template v-slot:activator="{ props: tooltipProps }">
		<v-checkbox v-bind="tooltipProps" density='compact' hide-details v-model="props.params.quad" label='Quad'/>
	</template>
</v-tooltip>
</v-row></v-col><v-col>
<InActorPanel :script="props.sketch" :updateScript="props.updateScript" 
  :reportInActorState="props.reportInActorState"/>
 </v-col></v-row></v-container>
</template>