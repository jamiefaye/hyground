<script setup>
  import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';

  const props = defineProps({
    state: Object,
    obj:   Object,
  });

</script>

<template>
  <v-container class="pa-1" fluid>
    <v-row class="mb-1" dense>
      <v-col class="py-1" cols="6">
        <v-text-field
          v-model.number="props.state.minFunctions"
          density="compact"
          hide-details
          label="Min f()"
          max="25"
          min="1"
          type="number"
          variant="outlined"
        />
      </v-col>
      <v-col class="py-1" cols="6">
        <v-text-field
          v-model.number="props.state.maxFunctions"
          density="compact"
          hide-details
          label="Max f()"
          max="25"
          min="1"
          type="number"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-row class="mb-1" dense>
      <v-col class="py-1" cols="6">
        <v-text-field
          v-model.number="props.state.minValue"
          density="compact"
          hide-details
          label="Min arg"
          max="1000"
          min="0"
          type="number"
          variant="outlined"
        />
      </v-col>
      <v-col class="py-1" cols="6">
        <v-text-field
          v-model.number="props.state.maxValue"
          density="compact"
          hide-details
          label="Max arg"
          max="1000"
          min="1"
          type="number"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-row class="mb-1" dense>
      <v-col class="py-1" cols="4">
        <v-text-field
          v-model.number="props.state.arrowFunctionProb"
          density="compact"
          hide-details
          label="P=>"
          max="100"
          min="0"
          type="number"
          variant="outlined"
        />
      </v-col>
      <v-col class="py-1" cols="4">
        <v-text-field
          v-model.number="props.state.mouseFunctionProb"
          density="compact"
          hide-details
          label="P=>xy"
          max="100"
          min="0"
          type="number"
          variant="outlined"
        />
      </v-col>
      <v-col class="py-1" cols="4">
        <v-text-field
          v-model.number="props.state.modulateItselfProb"
          density="compact"
          hide-details
          label="P(o0)"
          max="100"
          min="0"
          type="number"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-divider class="my-1" />

    <v-combobox
      v-model="props.state.exclusiveSourceList"
      chips
      class="mb-1"
      :close-on-select="false"
      density="compact"
      hide-details
      :items="props.obj.sourcesList"
      label="Use sources"
      multiple
      variant="outlined"
    />

    <v-combobox
      v-model="props.state.exclusiveFunctionList"
      chips
      class="mb-1"
      :close-on-select="false"
      density="compact"
      hide-details
      :items="props.obj.getAllFunctions()"
      label="Use functions"
      multiple
      variant="outlined"
    />

    <v-combobox
      v-model="props.state.ignoredList"
      chips
      class="mb-1"
      :close-on-select="false"
      density="compact"
      hide-details
      :items="props.obj.getAllElements()"
      label="Don't use"
      multiple
      variant="outlined"
    />
  </v-container>
</template>
