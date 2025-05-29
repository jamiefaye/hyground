<script setup lang="ts">
  import {onMounted, onBeforeUnmount, ref, watch} from 'vue';
	import Hydra from "./Hydra.vue";
  import IconButton from "./IconButton.vue";
  import InActorPanel from "./InActorPanel.vue";

  const props = defineProps({
  params: Object,
  reportInActorState: Function,
  updateScript: Function,
  sketch: String
 });

function openEditor() {
   	window.open("/index.html?edit=t", "editor", "width=500,height=1080,left=20");
//  	window.open("/hyground/index.html?edit=t", "editor", "width=500,height=1080,left=20");
}

</script>

<template>
<button type="button" id="HydraNxt" @click="openEditor">Edit</button>&nbsp;
<input type="checkbox" id="fx" v-model="props.params.fx" />
<label for="fx">Fx</label>
&nbsp;
<input type="checkbox" id="wgsl" v-model="props.params.wgsl" />
<label for="wgsl">wgsl</label>
&nbsp;
<input type="checkbox" id="show4" v-model="props.params.quad" />
<label for="quad">Quad</label>
&nbsp;
<InActorPanel :script="props.sketch" :updateScript="props.updateScript" 
  :reportInActorState="props.reportInActorState"/>
</template>