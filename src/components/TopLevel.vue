<template>
  <v-layout id="inspire" class="fill-height">
    <v-main>
      <HydraStage
        :is-fullscreen="isFullscreen"
        :open-documentation="openDocumentation"
        :show="!appStore.isFullscreen"
        :toggle-fullscreen="toggleFullscreen"
      />
    </v-main>
  </v-layout>
</template>

<script setup>
  // The page is the stage. The Editors panel opens from the stage's own row (Edit: a popup or a box)
  // or over the picture (Live); the drawer and app bar that used to hold them are gone.
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { useAppStore } from '@/stores/app'
  import HydraStage from './HydraStage.vue'

  const appStore = useAppStore()
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


<style>
/* Ensure #inspire fills its container - let Vuetify handle layout */
#inspire {
  width: 100%;
  height: 100%;
}


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
