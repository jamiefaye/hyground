<template>
  <v-app id="inspire">
    <v-navigation-drawer  :width='450' v-model="drawer">
      <Editors />
    </v-navigation-drawer>
    <v-app-bar :height='40'>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>Hydra</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <HydraStage :show='drawer'/>
    </v-main>
  </v-app>
</template>

<script setup>
  import { ref } from 'vue'
  import Editors from './Editors.vue'
  import HydraStage from './HydraStage.vue'
  const drawer = ref(null)
//  const panelFlag = ref(true)
</script>

<script>
  export default {
    data: () => ({ drawer: null }),
  }
</script>