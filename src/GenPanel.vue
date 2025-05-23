
<script setup>
  import {onMounted, onBeforeUnmount, ref, reactive} from 'vue';
  import Multiselect from 'vue-multiselect';

  const props = defineProps({
  state: Object,
  obj:   Object
	});

</script>

<template>
   <br/> min&nbsp;f():&nbsp;<input type="number" min="1" max="32"  v-model="props.state.minFunctions">
   max&nbsp;f():&nbsp;<input type="number"  min="1" max="32" v-model="props.state.maxFunctions">
   <br/> min&nbsp;val:&nbsp;<input type="number" min="0" max="100"  v-model="props.state.minValue">
   &nbsp;max&nbsp;val:&nbsp;<input type="number"  min="1" max="100" v-model="props.state.maxValue">
   <br/>P=>:&nbsp;<input type="number" min="0" max="100"  v-model="props.state.arrowFunctionProb">
   P=>xy:&nbsp;<input type="number"  min="0" max="100" v-model="props.state.mouseFunctionProb">
   P(o0):&nbsp;<input type="number" min="0" max="100"  v-model="props.state.modulateItselfProb">
   <p/>
    <Multiselect v-model="props.state.exclusiveSourceList" :options="props.obj.sourcesList" :close-on-select="false" :show-labels="false" :multiple="true"/>
    <Multiselect v-model="props.state.exclusiveFunctionList" :options="props.obj.getAllFunctions()" :close-on-select="false" :show-labels="false" :multiple="true"/>
    <Multiselect v-model="props.state.ignoredList" :options="props.obj.getAllElements()" :close-on-select="false" :show-labels="false" :multiple="true"/>
    <p/>
</template>

<style>
  .multiselect,
  .multiselect__input,
  .multiselect__single {
    font-size: 12px;
  }

  .multiselect__tag-icon::after {
    font-size: 10px;
  }

  .multiselect__tag {
    position: relative;
    display: inline-block;
    padding: 4px 26px 4px 10px;
    border-radius: 5px;
    margin-right: 10px;
    color: #fff;
    line-height: 1;
    background: #41b883;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
  }

  .multiselect__tags {

    font-size: 10px;
  }

  .multiselect__option::after {

    font-size: 9px;
  }
</style>