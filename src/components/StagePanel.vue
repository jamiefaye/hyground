<script setup lang="ts">
  import InActorPanel from './InActorPanel.vue';

  const props = defineProps({
    params: Object,
    reportInActorState: Function,
    updateScript: Function,
    sketch: String,
    reverseMorph: Function,
    syphonAvailable: Boolean,
  });

  function openEditor () {
    window.open('/editor', 'editor', 'width=500,height=1080,left=20');
    //  	window.open("/hyground/index.html?edit=t", "editor", "width=500,height=1080,left=20");
  }

</script>

<template>
  <v-container fluid height="20px"><v-row><v-col><v-row>
    <v-tooltip text="Open Code Editor">
      <template #activator="{ props: tooltipProps }">
        <v-btn v-bind="tooltipProps" size="x-small" @click="openEditor">Edit</v-btn>
      </template>
    </v-tooltip>
    <v-tooltip text="Enable Transition Effects">
      <template #activator="{ props: tooltipProps }">
        <v-checkbox
          v-bind="tooltipProps"
          v-model="props.params.fx"
          density="compact"
          hide-details
          label="Fx"
        />
      </template>
    </v-tooltip>
    <v-tooltip text="Use WebGPU Shading Language">
      <template #activator="{ props: tooltipProps }">
        <v-checkbox
          v-bind="tooltipProps"
          v-model="props.params.wgsl"
          density="compact"
          hide-details
          label="wgsl"
        />
      </template>
    </v-tooltip>
    <v-tooltip text="Enable Quad Rendering">
      <template #activator="{ props: tooltipProps }">
        <v-checkbox
          v-bind="tooltipProps"
          v-model="props.params.quad"
          density="compact"
          hide-details
          label="Quad"
        />
      </template>
    </v-tooltip>
    <v-tooltip text="Auto-morph between sketches">
      <template #activator="{ props: tooltipProps }">
        <v-checkbox
          v-bind="tooltipProps"
          v-model="props.params.morph"
          density="compact"
          hide-details
          label="Morph"
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
    <v-tooltip v-if="props.syphonAvailable" text="Output to Syphon">
      <template #activator="{ props: tooltipProps }">
        <v-checkbox
          v-bind="tooltipProps"
          v-model="props.params.syphon"
          density="compact"
          hide-details
          label="Syphon"
        />
      </template>
    </v-tooltip>
  </v-row></v-col><v-col>
    <InActorPanel
      :report-in-actor-state="props.reportInActorState"
      :script="props.sketch"
      :update-script="props.updateScript"
    />
  </v-col></v-row></v-container>
</template>
