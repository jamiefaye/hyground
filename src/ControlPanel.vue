<script lang="ts" setup>
import { ref, defineComponent, watch, emit, type Ref } from 'vue';
import IconButton from "./IconButton.vue";
</script>
<template>
<div class="simpleborder">
<IconButton icon="fa--play icon"/>
<IconButton icon="fa--random icon" />
<IconButton icon="fa-solid--dice icon"/>
</div>
</template>
<style>
.simpleborder {
display:inline-block;
 border: 1px solid black;
 box-sizing: border-box;
 position: relative;

}
</style>