<script setup lang="ts">

  import {onMounted, ref} from 'vue';
	import EditorView from "./EditorView.vue";


let elkey = 0;
let edList = ref([elkey++]);

function addEd() {
	edList.value.push(elkey++);
}

</script>

<template>

<template v-for="(item, index) in edList" :key="item">
<EditorView :entry="item" :index="index"/>
</template>
<button type="button" id="EdAdd" @click="addEd">New</button>
</template>

