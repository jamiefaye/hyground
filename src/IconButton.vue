<script lang="ts" setup>
import { ref, defineComponent, watch, emit, type Ref } from 'vue';

  const props = defineProps({
  	icon: String,
  	action: Function
	});

  function handleClick(evt) {
  if (props.action) props.action(evt);
  }

</script>

<template>
<button :class="icon" @click="handleClick($event)"></button>
</template>

<style>

.icon {
  cursor: pointer;
  pointer-events: auto;
  margin: 4px;
  vertical-align: middle;
}

.pricon {
  margin: 4px;
  margin-right: 12px;
  margin-left: 12px;
  cursor: pointer;
  pointer-events: auto;

}

.icon:hover{
  color: #ccc;
}

.pricon:hover{
  color: #ccc;
}


.icon.hidden {
  display: none;
}

.hidden > #modal > #modal-body {
  overflow: hidden;
}

</style>