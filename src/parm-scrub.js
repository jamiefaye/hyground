/**
 * In-situ scrubbing: a parmed sketch's constants become cells in the editor itself. Each cell
 * sits where the literal is (a CodeMirror replace decoration over its span, so it scrolls with
 * the text and the layout does not move), shows the knob's label, live value and range bar, and
 * turns the same slot the controller does: drag up or down (4 px a detent, a 64th of the range),
 * wheel a detent a tick, shift for a tenth, arrows once the cell has focus. No recompile per tick:
 * the host's `set` writes the parm slot, and a re-eval where the sketch needs one is the host's.
 * The text is read only while parmed (the mode is the gate; the knob icon leaves it).
 *
 *   extensions: [parmScrub()]
 *   view.dispatch({ effects: setParm.of({ source, controls, valueOf, set, describe }) })   // null leaves
 *
 * `controls` are parmSketch's (slot, key, start, end, min, max, curve); `source` the text they index,
 * so a doc that is not that text (the parmed code shown, a new sketch) gets no cells.
 * `valueOf(control)` -> number | undefined, `set(control, value)`, `describe(control)` -> tip text,
 * `labels` false hides the key in each cell (the value alone; the tip still names it).
 */
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { formatValue } from './Parm.js';

export const setParm = StateEffect.define();

const PX_PER_STEP = 4;
const DETENTS = 64;

/** A value one step on from v along the control's range: a 64th of it, a tenth of that when fine. */
export function stepValue (c, v, steps, fine = false) {
  const n = fine ? steps / 10 : steps;
  if (c.curve === 'int') return Math.max(1, Math.round(v + Math.sign(steps) * Math.max(1, Math.abs(Math.round(n)))));
  if (c.curve === 'log') return Math.max(v * Math.pow(c.max / c.min, n / DETENTS), Number.EPSILON);
  return v + (c.max - c.min) * n / DETENTS;
}
/** Where a value stands in its range, 0..1 (past the ends clamps: the knobs are open). */
export function positionOf (c, v) {
  let p;
  if (c.curve === 'log') p = Math.log(v / c.min) / Math.log(c.max / c.min);
  else p = (v - c.min) / (c.max - c.min);
  return isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
}

class CellWidget extends WidgetType {
  constructor (control, hooks) { super(); this.control = control; this.hooks = hooks; this.dom = null; }
  eq (other) { return other.control.slot === this.control.slot && other.control.key === this.control.key && other.hooks === this.hooks; }
  ignoreEvent () { return true; }
  toDOM () {
    const c = this.control; const hooks = this.hooks;
    const cell = document.createElement('span'); cell.className = 'parm-cell'; cell.tabIndex = 0;
    cell.title = (hooks.describe ? hooks.describe(c) + '\n' : '') + 'drag up/down or wheel turns it, shift = fine, arrows once focused';
    const key = document.createElement('span'); key.className = 'parm-key'; key.textContent = c.key;
    const val = document.createElement('span'); val.className = 'parm-val';
    const bar = document.createElement('i'); bar.className = 'parm-bar'; const fill = document.createElement('b'); bar.appendChild(fill);
    if (hooks.labels !== false) cell.appendChild(key);
    cell.appendChild(val); cell.appendChild(bar);
    this.dom = cell; this.val = val; this.fill = fill; this.shown = undefined;
    cell.parmWidget = this; // the tick refreshes what is on screen: CodeMirror keeps this DOM for an equal widget built later
    const turn = (steps, fine) => {
      const v = hooks.valueOf(c);
      if (v === undefined) return;
      hooks.set(c, stepValue(c, v, steps, fine));
      this.refresh();
    };
    let drag = null;
    cell.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      try { cell.setPointerCapture(e.pointerId); } catch { /* no capture: the drag still works while the pointer stays over the cell */ }
      drag = { y: e.clientY, pointerId: e.pointerId };
      cell.classList.add('parm-active');
      e.preventDefault(); e.stopPropagation();
    });
    cell.addEventListener('pointermove', e => {
      if (!drag) return;
      const steps = Math.trunc((drag.y - e.clientY) / PX_PER_STEP);
      if (steps !== 0) { turn(steps, e.shiftKey); drag.y = e.clientY; }
    });
    const end = () => { if (!drag) return; drag = null; cell.classList.remove('parm-active'); cell.focus(); };
    cell.addEventListener('pointerup', end); cell.addEventListener('pointercancel', end);
    cell.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); turn(e.deltaY < 0 ? 1 : -1, e.shiftKey); }, { passive: false });
    cell.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); e.stopPropagation();
      turn(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
    });
    // a click in the cell must not move the editor's selection or start a text drag
    cell.addEventListener('mousedown', e => e.stopPropagation());
    this.refresh();
    return cell;
  }
  /** Write the live value into the cell (the plugin's tick, and after a turn). */
  refresh () {
    if (!this.dom) return;
    const v = this.hooks.valueOf(this.control);
    const text = v === undefined ? '--' : formatValue(v, this.control.curve);
    if (text !== this.shown) { this.shown = text; this.val.textContent = text; }
    this.fill.style.width = v === undefined ? '0' : `${Math.round(positionOf(this.control, v) * 100)}%`;
  }
}

function buildCells (state, parm) {
  if (!parm || state.doc.toString() !== parm.source) return Decoration.none;
  const b = new RangeSetBuilder();
  const controls = [...parm.controls].filter(c => c.start !== undefined && c.end > c.start && c.end <= state.doc.length).sort((x, y) => x.start - y.start);
  let last = -1;
  for (const c of controls) {
    if (c.start < last) continue; // overlapping spans (not from parmSketch) are skipped
    b.add(c.start, c.end, Decoration.replace({ widget: new CellWidget(c, parm) }));
    last = c.end;
  }
  return b.finish();
}

const parmField = StateField.define({
  create: () => ({ parm: null, cells: Decoration.none }),
  update (value, tr) {
    let parm = value.parm; let changed = false;
    for (const e of tr.effects) if (e.is(setParm)) { parm = e.value; changed = true; }
    // the doc is swapped by the host (a new sketch, the parmed code shown): the cells follow, or go
    if (!changed && !tr.docChanged) return value;
    return { parm, cells: buildCells(tr.state, parm) };
  },
  provide: f => EditorView.decorations.from(f, v => v.cells),
});

// The cells' values follow the knobs: a tick, no transaction (the DOM is written in place)
const ticker = ViewPlugin.fromClass(class {
  constructor (view) {
    this.timer = setInterval(() => {
      if (!view.state.field(parmField).parm) return;
      for (const el of view.contentDOM.querySelectorAll('.parm-cell')) if (el.parmWidget) el.parmWidget.refresh();
    }, 100);
  }
  destroy () { clearInterval(this.timer); }
});

const theme = EditorView.baseTheme({
  '.parm-cell': {
    display: 'inline-block', position: 'relative', padding: '0 5px 3px 4px', margin: '0 1px', borderRadius: '3px', cursor: 'ns-resize',
    userSelect: 'none', whiteSpace: 'nowrap', lineHeight: '1.2', verticalAlign: 'baseline', outline: 'none',
  },
  '&light .parm-cell': { background: 'rgba(255, 200, 80, 0.22)', color: '#222' },
  '&dark .parm-cell': { background: 'rgba(255, 220, 120, 0.16)', color: '#fff' },
  '.parm-cell:focus, .parm-cell.parm-active': { boxShadow: '0 0 0 1px #fc6' },
  '.parm-key': { fontSize: '0.75em', opacity: '0.8', marginRight: '4px' },
  '&light .parm-key': { color: '#a50' },
  '&dark .parm-key': { color: '#fd6' },
  '.parm-val': { fontWeight: 'bold' },
  '.parm-bar': { display: 'block', position: 'absolute', left: '3px', right: '3px', bottom: '1px', height: '2px', background: 'rgba(128, 128, 128, 0.4)' },
  '.parm-bar > b': { display: 'block', height: '100%', background: '#fc6', width: '0' },
});

/** The extension: cells for a parmed sketch's constants, read only while parmed, a class on the editor for styling the rest. */
export function parmScrub () {
  return [
    parmField, ticker, theme,
    Prec.highest(EditorView.editable.compute([parmField], s => !s.field(parmField).parm)), // highest: the first value wins, and the host sets its own
    EditorView.editorAttributes.compute([parmField], s => ({ class: s.field(parmField).parm ? 'cm-parmed' : '' })),
  ];
}
