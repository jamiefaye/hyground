<script lang="ts" setup>
import { ref, defineComponent, watch, emit, type Ref } from 'vue';

// Load component
import CodeMirror from 'vue-codemirror6';

// CodeMirror extensions
import { javascript } from '@codemirror/lang-javascript';
import type { LanguageSupport } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
  
  const props = defineProps({
  	text: String,
  	limit: Boolean
	});
	
const emit = defineEmits(['textChanged'])

/** text */
const valRef: Ref<string> = ref(props.text);
watch(valRef,(newv)=>emit('textChanged', newv));
watch(()=> props.text, ()=>{valRef.value = props.text});

/** Dark mode **/
const dark: Ref<boolean> = ref(
  window.matchMedia('(prefers-color-scheme: dark)').matches
);

/**
 * CodeMirror Language
 *
 * @see {@link https://codemirror.net/6/docs/ref/#language | @codemirror/language}
 */
const lang: LanguageSupport = javascript();

</script>

<template>

  <code-mirror
    v-model="valRef"
    basic
    :dark="dark"
    :lang="lang"
  />

</template>

<style>
.cm-editor {
    max-height: v-bind("limit? '80px' : ''");
    border: 1px solid silver;
    font-size: 14px;
}

</style>