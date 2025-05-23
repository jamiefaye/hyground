
<script setup>
  import {onMounted, onBeforeUnmount, ref, reactive} from 'vue';
  import Multiselect from 'vue-multiselect';

  const props = defineProps({
  state: Object,
  obj:   Object
	});

</script>

<template>
    <p/>
    <Multiselect v-model="props.state.ignoredList" :options="props.obj.getAllElements()" :close-on-select="false" :show-labels="false" :multiple="true"/>
    <p/>
</template>