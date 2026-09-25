<script lang="ts" setup>
import { ref, defineComponent, watch, emit, type Ref } from 'vue';

// Load component
import CodeMirror from 'vue-codemirror6';

// CodeMirror extensions
import { javascript } from '@codemirror/lang-javascript';
import type { LanguageSupport } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { parmScrub, setParm } from '../parm-scrub.js';
  
  const props = defineProps({
  	text: String,
  	limit: Boolean,
  	parm: Object,   // a parmed sketch's controls and hooks (parm-scrub.js): cells over the constants; null = plain text
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
const extensions: Extension[] = [parmScrub()];

// The parm cells: told to the view after the text it indexes is in (the text watcher runs first)
const cm = ref<any>(null);
watch(() => props.parm, p => { const view = cm.value && cm.value.view; if (view) view.dispatch({ effects: setParm.of(p || null) }); }, { flush: 'post' });

</script>

<template>

  <code-mirror
    ref="cm"
    v-model="valRef"
    basic
    :dark="dark"
    :extensions="extensions"
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