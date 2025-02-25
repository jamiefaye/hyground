<script lang="ts" setup>
import { ref, defineComponent, watch, emit, type Ref } from 'vue';

  const props = defineProps({
  	onicon: String,
  	officon: String,
  	action: Function,
  	onstate:  Boolean
	});

  function handleOnClick(evt) {
  	if (props.action) props.action(evt, true);
  }
  function handleOffClick(evt) {
  	if (props.action) props.action(evt, false);
  }

</script>

<template>
<template v-if="onstate">
<button :class="onicon" @click="handleOnClick($event)"></button>
</template>
<template v-if="!onstate">
<button :class="officon" @click="handleOffClick($event)"></button>
</template>
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