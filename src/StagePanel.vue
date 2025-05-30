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
<v-btn @click="openEditor" size='x-small'>Edit</v-btn>
<v-checkbox density='compact' hide-details v-model="props.params.fx" label='Fx'/>
<v-checkbox density='compact' hide-details v-model="props.params.wgsl" label='wgsl'/>
<v-checkbox density='compact' hide-details v-model="props.params.quad" label='Quad'/>
</v-row></v-col><v-col>
<InActorPanel :script="props.sketch" :updateScript="props.updateScript" 
  :reportInActorState="props.reportInActorState"/>
 </v-col></v-row></v-container>
</template>