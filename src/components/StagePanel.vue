<script setup lang="ts">
  import InActorPanel from './InActorPanel.vue';

  const props = defineProps({
    params: Object,
    reportInActorState: Function,
    updateScript: Function,
    sketch: String,
    reverseMorph: Function,
    syphonAvailable: Boolean,
    openEditors: Function,
    openSettings: Function,
    openKnobs: Function,
    isFullscreen: Boolean,
    toggleFullscreen: Function,
    openDocumentation: Function,
  });

  // Edit: the Editors panel in a popup (or a box over the picture); Shift: the old separate /editor window
  function openEditor (evt) {
    if (props.openEditors) props.openEditors(evt);
    else window.open('/editor', 'editor', 'width=500,height=1080,left=20');
  }

</script>

<template>
  <v-container fluid class="stage-row"><v-row align="center"><v-col><v-row align="center">
    <v-tooltip text="Editors in a popup window, or a box if popups are blocked (Shift: separate window)">
      <template #activator="{ props: tooltipProps }">
        <v-btn v-bind="tooltipProps" size="x-small" @click="openEditor">Edit</v-btn>
      </template>
    </v-tooltip>
    <v-tooltip text="Live editor over the picture (Cmd/Ctrl-Shift-H; Cmd/Ctrl-Enter runs)">
      <template #activator="{ props: tooltipProps }">
        <v-checkbox
          v-bind="tooltipProps"
          v-model="props.params.live"
          density="compact"
          hide-details
          label="Live"
        />
      </template>
    </v-tooltip>
    <v-tooltip text="Morph back to previous sketch">
      <template #activator="{ props: tooltipProps }">
        <v-btn
          v-bind="tooltipProps"
          size="x-small"
          :disabled="!props.params.morph"
          @click="props.reverseMorph"
        >Rev</v-btn>
      </template>
    </v-tooltip>
  </v-row></v-col><v-col>
    <InActorPanel
      :report-in-actor-state="props.reportInActorState"
      :script="props.sketch"
      :update-script="props.updateScript"
    />
  </v-col><v-col cols="auto" class="d-flex align-center ga-2">
    <!-- faders, not the knob: the knob in an editor's row parms a sketch; this shows and hides the controllers on screen -->
    <v-tooltip text="Controllers on screen: each device in its own shape, with what parm put on it; again hides it (Cmd/Ctrl-Shift-K)">
      <template #activator="{ props: tooltipProps }">
        <IMdiTuneVertical v-bind="tooltipProps" @click="props.openKnobs && props.openKnobs()" />
      </template>
    </v-tooltip>
    <v-tooltip text="Settings: stage modes and editor options">
      <template #activator="{ props: tooltipProps }">
        <IMdiCogOutline v-bind="tooltipProps" @click="props.openSettings && props.openSettings()" />
      </template>
    </v-tooltip>
    <v-tooltip text="Hyground Documentation">
      <template #activator="{ props: tooltipProps }">
        <IMdiHelpCircleOutline v-bind="tooltipProps" @click="props.openDocumentation && props.openDocumentation()" />
      </template>
    </v-tooltip>
    <v-tooltip :text="props.isFullscreen ? 'Exit Fullscreen (Esc/F11)' : 'Enter Fullscreen (F11)'">
      <template #activator="{ props: tooltipProps }">
        <IMdiFullscreenExit v-if="props.isFullscreen" v-bind="tooltipProps" @click="props.toggleFullscreen && props.toggleFullscreen()" />
        <IMdiFullscreen v-else v-bind="tooltipProps" @click="props.toggleFullscreen && props.toggleFullscreen()" />
      </template>
    </v-tooltip>
  </v-col></v-row></v-container>
</template>

<style scoped>
/* the one row of chrome on the page: tall enough for its icons, no more */
.stage-row { padding: 0 8px; min-height: 0; }
.stage-row .v-row { margin: 0; }
.stage-row .v-col { padding: 2px 4px; }
</style>
