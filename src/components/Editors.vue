<script setup lang="ts">

  import { onMounted, ref } from 'vue';
  import EditorView from './EditorView.vue';


  let elkey = 0;
  const edList = ref([elkey++]);
  const showVideo = ref(true);
  const limitHeight = ref(false);

  function addEd () {
    edList.value.push(elkey++);
  }

</script>

<template>
  <template v-for="(item, index) in edList" :key="item">
    <EditorView :index="index" :limit="limitHeight" :show-vid="showVideo" />
  </template>
  <div class="d-flex align-center ga-3">
    <v-btn id="EdAdd" variant="outlined" size="x-small" @click="addEd">New</v-btn>
    <div>
      <input id="videocheckbox" v-model="showVideo" type="checkbox">
      <label for="videocheckbox">Monitors</label>
    </div>
    <div>
      <input id="limitcheckbox" v-model="limitHeight" type="checkbox">
      <label for="limitcheckbox">Limit Height</label>
    </div>
  </div>

</template>
