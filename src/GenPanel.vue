
<script setup>
  import {onMounted, onBeforeUnmount, ref, reactive} from 'vue';

  const props = defineProps({
  state: Object,
  obj:   Object
	});

</script>

<template>
  <v-container fluid class="pa-1">
    <v-row dense class="mb-1">
      <v-col cols="6" class="py-1">
        <v-text-field
          v-model.number="props.state.minFunctions"
          label="Min f()"
          type="number"
          min="1"
          max="25"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="6" class="py-1">
        <v-text-field
          v-model.number="props.state.maxFunctions"
          label="Max f()"
          type="number"
          min="1"
          max="25"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
    </v-row>

    <v-row dense class="mb-1">
      <v-col cols="6" class="py-1">
        <v-text-field
          v-model.number="props.state.minValue"
          label="Min arg"
          type="number"
          min="0"
          max="1000"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="6" class="py-1">
        <v-text-field
          v-model.number="props.state.maxValue"
          label="Max arg"
          type="number"
          min="1"
          max="1000"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
    </v-row>

    <v-row dense class="mb-1">
      <v-col cols="4" class="py-1">
        <v-text-field
          v-model.number="props.state.arrowFunctionProb"
          label="P=>"
          type="number"
          min="0"
          max="100"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="4" class="py-1">
        <v-text-field
          v-model.number="props.state.mouseFunctionProb"
          label="P=>xy"
          type="number"
          min="0"
          max="100"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="4" class="py-1">
        <v-text-field
          v-model.number="props.state.modulateItselfProb"
          label="P(o0)"
          type="number"
          min="0"
          max="100"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
    </v-row>

    <v-divider class="my-1" />

    <v-combobox
      v-model="props.state.exclusiveSourceList"
      :items="props.obj.sourcesList"
      label="Use sources"
      density="compact"
      variant="outlined"
      :close-on-select="false"
      multiple
      chips
      hide-details
      class="mb-1"
    />

    <v-combobox
      v-model="props.state.exclusiveFunctionList"
      :items="props.obj.getAllFunctions()"
      label="Use functions"
      density="compact"
      variant="outlined"
      :close-on-select="false"
      multiple
      chips
      hide-details
      class="mb-1"
    />

    <v-combobox
      v-model="props.state.ignoredList"
      :items="props.obj.getAllElements()"
      label="Don't use"
      density="compact"
      variant="outlined"
      :close-on-select="false"
      multiple
      chips
      hide-details
      class="mb-1"
    />
  </v-container>
</template>

