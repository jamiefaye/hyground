<script setup lang="ts">

  import {onMounted, ref} from 'vue';
	import EditorView from "./EditorView.vue";


let elkey = 0;
let edList = ref([elkey++]);
let showVideo = ref(true);
let limitHeight = ref(false);

function addEd() {
	edList.value.push(elkey++);
}


</script>

<template>
<template v-for="(item, index) in edList" :key="item">
<EditorView :entry="item" :index="index" :showVid="showVideo" :limit="limitHeight"/>
</template>
<button type="button" id="EdAdd" @click="addEd">New</button>&nbsp;&nbsp;
<input type="checkbox" id="videocheckbox" v-model="showVideo" /> 
<label for="videocheckbox">Monitors</label>&nbsp;
<input type="checkbox" id="limitcheckbox" v-model="limitHeight" /> 
<label for="limitcheckbox">Limit Height</label>
</template>

