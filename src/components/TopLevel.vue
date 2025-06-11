<template>
  <v-app id="inspire">
    <v-navigation-drawer v-model="drawerVisible" :width="450">
      <Editors />
    </v-navigation-drawer>
    <v-app-bar v-if="!appStore.isFullscreen" :height="40">
      <v-app-bar-nav-icon @click="drawerVisible = !drawerVisible" />
      <v-app-bar-title>Hydra</v-app-bar-title>
      <v-spacer />
      <v-tooltip text="Hyground Documentation">
        <template #activator="{ props: tooltipProps }">
          <IMdiHelpCircleOutline v-bind="tooltipProps" @click="openDocumentation" />
        </template>
      </v-tooltip>
      <v-tooltip :text="isFullscreen ? 'Exit Fullscreen (Esc/F11)' : 'Enter Fullscreen (F11)'">
        <template #activator="{ props: tooltipProps }">
          <IMdiFullscreenExit v-if="isFullscreen" v-bind="tooltipProps" @click="toggleFullscreen" />
          <IMdiFullscreen v-else v-bind="tooltipProps" @click="toggleFullscreen" />
        </template>
      </v-tooltip>
    </v-app-bar>
    <v-main>
      <HydraStage :show="drawerVisible" />
    </v-main>
  </v-app>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useAppStore } from '@/stores/app'
  import Editors from './Editors.vue'
  import HydraStage from './HydraStage.vue'

  const appStore = useAppStore()
  const drawer = ref(null)
  const isFullscreen = ref(false)

  async function toggleFullscreen () {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const appElement = document.querySelector('#inspire');

        if (appElement.requestFullscreen) {
          await appElement.requestFullscreen({ navigationUI: 'hide' });
        } else if (appElement.webkitRequestFullscreen) {
          await appElement.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (error) {
      console.warn('Fullscreen operation failed:', error);
    }
  }

  function openDocumentation () {
    window.open('./icon-documentation.html', '_blank');
  }

  // Computed property that hides drawer when in fullscreen
  const drawerVisible = computed({
    get () {
      return drawer.value && !appStore.isFullscreen
    },
    set (value) {
      drawer.value = value
    },
  })

  // Watch for fullscreen changes to save/restore drawer state
  watch(() => appStore.isFullscreen, isFullscreen => {
    if (isFullscreen) {
      // Save current drawer state before hiding
      appStore.setDrawerWasOpen(drawer.value)
    } else {
      // Restore drawer state when exiting fullscreen
      drawer.value = appStore.drawerWasOpen
    }
  })

  onMounted(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      isFullscreen.value = !!fullscreenElement;
      appStore.setFullscreen(!!fullscreenElement);
    };

    const handleKeydown = event => {
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeydown);

    onBeforeUnmount(() => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeydown);
    });
  });
</script>

<script>
  export default {
    data: () => ({ drawer: null }),
  }
</script>

<style>
/* Clean fullscreen CSS - now that layout issues are fixed */
#inspire:fullscreen,
#inspire:-webkit-full-screen,
#inspire:-moz-full-screen {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  background: black;
}

#inspire:fullscreen .v-application,
#inspire:-webkit-full-screen .v-application,
#inspire:-moz-full-screen .v-application {
  width: 100%;
  height: 100%;
}
</style>
