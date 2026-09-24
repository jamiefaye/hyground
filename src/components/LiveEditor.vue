<script setup lang="ts">
  // The live editor: CodeMirror over the picture, as on hydra.ojack.xyz. Transparent, no gutter,
  // each line on a dark strip so the code reads over whatever is playing. Mod-Enter runs the text
  // (the parent decides where), Mod-Shift-H hides the editor, Escape lets go of the keyboard so
  // the page's own keys work again. The parent keeps the text; this reports edits and focus.
  import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
  import CodeMirror from 'vue-codemirror6';
  import { javascript } from '@codemirror/lang-javascript';
  import { EditorView, keymap } from '@codemirror/view';
  import { Prec } from '@codemirror/state';

  const props = defineProps({
    text: String,
  });
  const emit = defineEmits(['run', 'hide', 'textChanged', 'focusChanged']);

  const val: Ref<string> = ref(props.text || '');
  watch(val, v => emit('textChanged', v));
  watch(() => props.text, t => { if (typeof t === 'string' && t !== val.value) val.value = t; });

  const lang = javascript();
  const extensions = [
    Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => { emit('run', val.value); return true; } },
      { key: 'Shift-Mod-Enter', run: () => { emit('run', val.value); return true; } },
      { key: 'Mod-Shift-h', run: () => { emit('hide'); return true; } },
      { key: 'Mod-Shift-k', run: () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, shiftKey: true })); return true; } },
      { key: 'Escape', run: (view: EditorView) => { view.contentDOM.blur(); return true; } },
    ])),
    EditorView.lineWrapping,
  ];

  const wrap = ref<HTMLElement | null>(null);
  const onFocusIn = () => emit('focusChanged', true);
  const onFocusOut = () => emit('focusChanged', false);
  onMounted(() => { wrap.value?.addEventListener('focusin', onFocusIn); wrap.value?.addEventListener('focusout', onFocusOut); });
  onBeforeUnmount(() => { wrap.value?.removeEventListener('focusin', onFocusIn); wrap.value?.removeEventListener('focusout', onFocusOut); });

  /** Put the caret in the editor (the parent calls this when it shows the editor). */
  function focus () {
    const el = wrap.value?.querySelector('.cm-content') as HTMLElement | null;
    el?.focus();
  }
  defineExpose({ focus });
</script>

<template>
  <div ref="wrap" class="live-editor">
    <code-mirror v-model="val" dark :extensions="extensions" :lang="lang" minimal />
  </div>
</template>

<style>
.live-editor { position: absolute; inset: 0; z-index: 5; overflow: auto; }
.live-editor .cm-editor { height: 100%; background: transparent; font-size: 16px; outline: none; }
.live-editor .cm-editor.cm-focused { outline: none; }
.live-editor .cm-scroller { font-family: Menlo, Monaco, 'Courier New', monospace; line-height: 1.4; }
.live-editor .cm-gutters { display: none; }
.live-editor .cm-content { color: #fff; text-shadow: 0 0 3px #000, 0 0 1px #000; padding: 12px 0; caret-color: #fff; }
.live-editor .cm-line { background: rgba(0, 0, 0, 0.66); width: fit-content; padding: 0 8px 0 12px; }
.live-editor .cm-activeLine { background: rgba(0, 0, 0, 0.78); }
.live-editor .cm-selectionBackground, .live-editor .cm-editor ::selection { background: rgba(120, 160, 255, 0.45) !important; }
.live-editor .cm-cursor { border-left-color: #fff; }
</style>
