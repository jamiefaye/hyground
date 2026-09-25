<script setup lang="ts">

  import { ref } from 'vue';
  import EditorView from './EditorView.vue';
  import { useAppStore } from '@/stores/app';

  // The editors' options (monitors, limit height, auto stage, parms to stage, auto parm) are in
  // the settings panel (gear on the stage's row), so the live view on the stage shares them.
  const appStore = useAppStore();
  const prefs = appStore.prefs;

  let elkey = 0;
  const edList = ref([elkey++]);

  function addEd () {
    edList.value.push(elkey++);
  }

</script>

<template>
  <template v-for="(item, index) in edList" :key="item">
    <EditorView
      :index="index"
      :limit="prefs.limitHeight"
      :show-vid="prefs.monitors"
      :auto-stage="prefs.autoStage"
      :parms-to-stage="prefs.parmsToStage"
      :auto-parm="prefs.autoParm"
      :parm-labels="prefs.parmLabels"
      :generate="prefs.generate"
    />
  </template>
  <div class="d-flex align-center ga-3">
    <v-btn id="EdAdd" variant="outlined" size="x-small" @click="addEd">New</v-btn>
  </div>

</template>
