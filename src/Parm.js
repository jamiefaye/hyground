/**
 * Parming: hand a sketch's constants to the knobs. The dice picks a literal and jumps it;
 * this replaces every numeric literal in a Hydra chain with a call that returns a MIDI
 * control's value, labelled on the controller's display, so the person does the adjusting.
 *
 *   parmSketch(text, { label: 'index' | 'digit', slots: 128 })
 *     -> { code, controls: [{ slot, key, label, fn, arg, index, value, min, max, curve }] }
 *   installParm()   once per page: installs the midi extension (EC4 PARM profile, sysex) and
 *                   defines window.parm, which the transformed code calls.
 *
 * The transformed code is plain text and self-contained, so it runs anywhere window.parm
 * exists: the editor's preview and the stage alike. A literal that is a direct argument of
 * a Hydra function becomes parm(...) (a function Hydra samples every frame); one inside an
 * expression, such as () => time * 0.1, becomes parm(...)() and is read where it sits. A
 * literal assigned to a variable (let speed = 0.5, speed = 0.5) becomes parm(...)() too, with
 * a label of '=' and the name (=spe): a variable holds a number, read once at eval, so a host
 * that wants those knobs live re-evaluates the sketch when one moves (controls[].kind ===
 * 'assign' says which).
 * Array subscripts, sequences ([1, 2, 3]) and calls that are not Hydra functions (out,
 * setResolution, ...) are left alone. The knob's home value is the literal: the picture is
 * the same until a knob turns. parm.begin() at the top marks the previous sketch's slots
 * stale so their labels clear; parm(slot, label, init, min, max, curve) re-registers the
 * same slot across re-evals and keeps the live value unless the label or init changed.
 *
 * Ranges come from the argument's name in the function table: multiplicative parameters
 * (frequency, scale, speed, ...) get a log range an octave-triplet each side of the literal,
 * counts (nSides, repeatX, ...) get integer detents, everything else the dice's rule, zero
 * to twice the literal, or a unit range when the literal is zero. The range is not a rail:
 * the knobs are endless and the controls are registered open, so min..max only sets the size
 * of a detent (a 64th of the range) and a value can go on past either end. A log control
 * turned down approaches zero without reaching it; a count keeps its floor of 1. Push and
 * turn moves a tenth of a detent (the EC4's push sends a note on the encoder's number).
 */
import { Parser } from 'acorn';
import { generate } from 'astring';
import { attachComments } from 'astravel';
import { hydraFunctions } from './hydra-functions.js';

// Three-letter codes for labels; anything not listed takes its first three letters.
const ABBREV = {
  noise: 'noi', voronoi: 'vor', osc: 'osc', shape: 'shp', gradient: 'grd', src: 'src', srcb: 'srb', solid: 'sol',
  rotate: 'rot', scale: 'scl', pixelate: 'pix', posterize: 'pos', shift: 'sft', repeat: 'rep', modulateRepeat: 'mrp',
  repeatX: 'rpx', modulateRepeatX: 'mrx', repeatY: 'rpy', modulateRepeatY: 'mry', kaleid: 'kal', modulateKaleid: 'mkl',
  offset: 'off', tilt: 'tlt', scroll: 'scr', scrollX: 'scx', modulateScrollX: 'msx', scrollY: 'scy', modulateScrollY: 'msy',
  add: 'add', sub: 'sub', layer: 'lay', blend: 'bln', mult: 'mul', diff: 'dif', modulate: 'mod', modulateScale: 'msc',
  modulatePixelate: 'mpx', modulateRotate: 'mrt', modulateHue: 'mhu', invert: 'inv', contrast: 'con', ingamut: 'ing',
  opaque: 'opq', age: 'age', colormat: 'cmt', knee: 'kne', brightness: 'bri', mask: 'msk', luma: 'lum', thresh: 'thr',
  color: 'col', saturate: 'sat', hue: 'hue', colorama: 'cor', blur: 'blr', blurb: 'blb', prev: 'prv', sum: 'sum',
  r: 'chr', g: 'chg', b: 'chb', a: 'cha', diffuse: 'dfs', specular: 'spc', fresnel: 'frs', halfLambert: 'hlb',
};

// Argument classes for ranges (see the header)
const MULT = new Set(['frequency', 'scale', 'multiple', 'radius', 'speed', 'sync', 'headroom', 'shininess', 'power', 'dist']);
const INT = new Set(['nSides', 'sides', 'repeatX', 'repeatY', 'reps', 'pixelX', 'pixelY', 'bins']);
const UNIT = new Set(['r', 'g', 'b', 'a', 'alpha', 'threshold', 'tolerance', 'amount', 'blending', 'smoothing', 'gamma', 'hue',
  'keep', 'intensity', 'ambient', 'xMult', 'yMult', 'offsetX', 'offsetY', 'scrollX', 'scrollY', 'x', 'y', 'offset']);

const table = {};
for (const f of hydraFunctions) table[f.name] = f;

export function abbrev (name) { return ABBREV[name] || String(name).slice(0, 3).toLowerCase(); }

/** First significant digit of a number's source text: '0.4' -> '4', '12' -> '1', '0' -> '0'. */
export function firstDigit (raw) {
  const m = String(raw).match(/[1-9]/);
  return m ? m[0] : '0';
}

const sig = x => Number(Number(x).toPrecision(3));

/** Is this text parmSketch's output (or a sketch built from it)? */
export function isParmed (text) { return /\bparm\s*\.\s*begin\s*\(/.test(text); }

/**
 * The reverse of parmSketch: parm(slot, label, init, min, max[, curve]) and parm(...)() become
 * the init literal again, parm.begin() statements go. Text that parmSketch did not make comes
 * back unchanged (a sketch calling its own parm is left alone).
 */
export function unparmSketch (text) {
  const comments = [];
  const ast = Parser.parse(text, { ecmaVersion: 'latest', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, locations: true, onComment: comments });
  const isParmCall = n => n && n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'parm' && n.arguments.length >= 3 && n.arguments[2].type === 'Literal';
  const isBegin = n => n && n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.type === 'MemberExpression'
    && n.expression.callee.object.type === 'Identifier' && n.expression.callee.object.name === 'parm' && n.expression.callee.property.name === 'begin';
  const literalOf = n => { const init = n.arguments[2]; return lit(init.value, init.raw); };
  // Returns a replacement node or undefined
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return undefined;
    if (node.type === 'CallExpression' && node.arguments.length === 0 && isParmCall(node.callee)) return literalOf(node.callee); // parm(...)()
    if (isParmCall(node)) return literalOf(node);
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (let i = child.length - 1; i >= 0; i--) {
          if (isBegin(child[i])) { child.splice(i, 1); continue; }
          const r = visit(child[i]); if (r) child[i] = r;
        }
      } else if (child && typeof child.type === 'string') { const r = visit(child); if (r) node[key] = r; }
    }
    return undefined;
  };
  visit(ast);
  attachComments(ast, comments);
  return generate(ast, { comments: true }).trimEnd();
}

/** Range for a literal from its function and argument: { min, max, curve } with curve linear | log | int. */
export function rangeFor (fn, argName, value) {
  const v = Number(value);
  const mult = MULT.has(argName) || (fn === 'scale' && argName === 'amount');
  if (INT.has(argName) && v >= 1) return { min: 1, max: Math.max(Math.round(2 * v), 8), curve: 'int' };
  if (mult && v > 0) return { min: sig(v / 8), max: sig(v * 8), curve: 'log' };
  if (v > 0) return { min: 0, max: sig(2 * v), curve: 'linear' };
  if (v < 0) return { min: sig(2 * v), max: 0, curve: 'linear' };
  return { min: UNIT.has(argName) ? 0 : -1, max: 1, curve: 'linear' };
}

const lit = (value, raw) => ({ type: 'Literal', value, raw: raw ?? String(value) });
const str = s => ({ type: 'Literal', value: s, raw: JSON.stringify(s) });
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc', 'range', 'comments', 'leadingComments', 'trailingComments']);

/**
 * Transform a sketch. options.label: 'index' (osc1, osc2: function + argument position, the
 * default) or 'digit' (osc5, noi2: function + first digit of the literal). options.slots caps
 * the number of controls (EC4 PARM: 8 groups x 16).
 */
export function parmSketch (text, options = {}) {
  const opts = Object.assign({ label: 'index', slots: 128 }, options);
  // Parming a parmed sketch (the stage's text is the parmed code; Meta showed it; Auto Parm on a
  // re-run) would add a second parm.begin() and find no constants: undo the first parm and parm
  // the sketch as written, so a re-parm gives the same knobs back.
  if (isParmed(text)) text = unparmSketch(text);
  const comments = [];
  const ast = Parser.parse(text, { ecmaVersion: 'latest', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, locations: true, onComment: comments });
  const controls = [];
  const taken = new Set();

  const uniqueKey = base => {
    let key = base;
    for (let i = 0; taken.has(key); i++) key = base + 'bcdefghijklmnopqrstuvwxyz'[i % 25];
    taken.add(key);
    return key;
  };

  // A control for a Hydra argument ({ fn, index }) or an assignment ({ name })
  const control = ({ fn, index, name }, value, raw, start, end) => {
    if (controls.length >= opts.slots) return null;
    let label, arg, kind;
    if (name !== undefined) {
      kind = 'assign'; arg = name; label = '=' + name.slice(0, 3);
    } else {
      kind = 'arg';
      const meta = table[fn];
      // combine / combineCoord functions take the other texture as their first argument, unlisted in the table
      const offset = (meta.type === 'combine' || meta.type === 'combineCoord') ? 1 : 0;
      const input = meta.inputs[index - offset];
      if (!input || input.type !== 'float') return null;
      arg = input.name;
      label = opts.label === 'index' ? `${abbrev(fn)}${index + 1}` : `${abbrev(fn)}${firstDigit(raw)}`;
    }
    const key = uniqueKey(label);
    const range = rangeFor(fn, arg, value);
    const c = { slot: controls.length + 1, key, label: key.slice(0, 4), kind, fn, arg, index, value, raw, start, end, ...range };
    controls.push(c);
    return c;
  };

  const callNode = c => {
    const args = [lit(c.slot), str(c.key), lit(c.value, c.raw), lit(c.min), lit(c.max)];
    if (c.curve !== 'linear') args.push(str(c.curve));
    return { type: 'CallExpression', callee: { type: 'Identifier', name: 'parm' }, arguments: args, optional: false };
  };

  // A numeric literal, or a negated one, as { value, raw }; null for anything else
  const numberOf = node => {
    if (node.type === 'Literal' && typeof node.value === 'number') return { value: node.value, raw: node.raw ?? String(node.value) };
    if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') {
      return { value: -node.argument.value, raw: '-' + (node.argument.raw ?? String(node.argument.value)) };
    }
    return null;
  };
  const hydraName = callee => {
    const name = callee.type === 'MemberExpression' ? (callee.property && callee.property.name) : (callee.type === 'Identifier' ? callee.name : null);
    return name && table[name] ? name : null;
  };
  const visitChildren = (node, ctx) => {
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach((ch, i) => { const r = visit(ch, ctx, false); if (r) child[i] = r; });
      else if (child && typeof child.type === 'string') { const r = visit(child, ctx, false); if (r) node[key] = r; }
    }
  };

  // ctx: { fn, index } = the Hydra call and argument we are inside; direct = this node is the argument itself.
  // Returns a replacement node or undefined.
  const visit = (node, ctx, direct) => {
    if (!node || typeof node.type !== 'string') return undefined;
    if (node.type === 'ArrayExpression') return undefined; // sequences are patterns, not constants
    const num = numberOf(node);
    if (num) {
      const c = ctx && control(ctx, num.value, num.raw, node.start, node.end);
      if (!c) return undefined;
      const call = callNode(c);
      return direct ? call : { type: 'CallExpression', callee: call, arguments: [], optional: false };
    }
    // let x = 0.5 / x = 0.5: the value is read where it sits, so the call form
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
      const r = visit(node.init, { name: node.id.name }, false); if (r) node.init = r;
      return undefined;
    }
    if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'Identifier') {
      const r = visit(node.right, { name: node.left.name }, false); if (r) node.right = r;
      return undefined;
    }
    if (node.type === 'CallExpression') {
      const name = hydraName(node.callee);
      visit(node.callee, null, false);
      node.arguments.forEach((arg, i) => {
        const r = visit(arg, name ? { fn: name, index: i } : null, !!name);
        if (r) node.arguments[i] = r;
      });
      return undefined;
    }
    if (node.type === 'MemberExpression') {
      const r = visit(node.object, ctx, false); if (r) node.object = r;
      return undefined; // a computed property (subscript) stays as written
    }
    if (node.type === 'Property' && !node.computed) { const r = visit(node.value, ctx, false); if (r) node.value = r; return undefined; }
    visitChildren(node, ctx);
    return undefined;
  };
  visit(ast, null, false);

  attachComments(ast, comments);
  const body = generate(ast, { comments: true }).trimEnd();
  const code = 'parm.begin()\n' + body; // always: a sketch with no constants still clears the last one's labels
  return { code, controls };
}

/** A value as it would be written in a sketch: three significant digits, no trailing zeros, counts whole. */
export function formatValue (v, curve) {
  if (v == null || !isFinite(v)) return String(v);
  return curve === 'int' ? String(Math.round(v)) : String(Number(Number(v).toPrecision(3)));
}

/**
 * The original sketch with each parmed constant replaced by a value: what the sketch would
 * be if written with the knobs where they are. valueOf(control) -> number (undefined keeps
 * the original text). Controls carry the literal's source span from parmSketch.
 */
export function renderValues (text, controls, valueOf) {
  let out = text;
  for (const c of [...controls].sort((a, b) => b.start - a.start)) {
    const v = valueOf(c);
    if (v === undefined) continue;
    out = out.slice(0, c.start) + formatValue(v, c.curve) + out.slice(c.end);
  }
  return out;
}

/** Text of the substitutions for reading: one line per control. */
export function describeControls (controls) {
  return controls.map(c => `${String(c.slot).padStart(3)} ${c.key.padEnd(6)} ${c.kind === 'assign' ? c.arg + ' =' : c.fn + '(' + c.arg + ') ='} ${c.raw}  [${c.min}..${c.max}${c.curve === 'linear' ? '' : ' ' + c.curve}]`).join('\n');
}

// ---------------------------------------------------------------- the runtime global

let _parm = null;

/**
 * Install once per page. Registers window.parm and window.midi (EC4 PARM profile: setup 14,
 * channel 14, labels written live to the OLED over sysex). Safe without a controller: the
 * knobs keep their init values and the picture is the sketch as written.
 */
export async function installParm (options = {}) {
  if (_parm) return _parm;
  const { install, parm: profile } = await import('hydra-synth/extensions/midi');
  const midi = await install(null, Object.assign({ profile, sysex: true, log: false }, options));
  const slots = new Map(); // slot -> { label, init, fn }
  let live = new Set();
  const at = slot => [Math.floor((slot - 1) / 16) + 1, ((slot - 1) % 16) + 1];

  const parm = (slot, label, init, min, max, curve = 'linear') => {
    live.add(slot);
    const prev = slots.get(slot);
    // Inside an arrow function this runs every frame: the same control again is a lookup, not a registration
    if (prev && prev.label === label && prev.init === init && prev.min === min && prev.max === max && prev.curve === curve) return prev.fn;
    // No rails: the range sets the detent size. Push and turn: a tenth of a detent (counts stay whole)
    const opts = { min, max, init, label, open: true, fine: 10 };
    if (curve === 'int') { opts.curve = 'linear'; opts.steps = Math.max(1, Math.round(max - min)); opts.open = 'up'; opts.fine = 0; } else opts.curve = curve;
    const fn = midi.cc(at(slot), opts);
    if (!prev || prev.label !== label || prev.init !== init) fn.set(init); // a new sketch on this slot starts at its own value
    slots.set(slot, { label, init, min, max, curve, fn });
    return fn;
  };
  /** Start of a parmed sketch: slots it does not use again lose their labels after the eval. */
  parm.begin = () => {
    live = new Set();
    queueMicrotask(() => {
      for (const [slot, s] of slots) {
        if (live.has(slot)) continue;
        midi.cc(at(slot), { min: s.fn.config.min, max: s.fn.config.max, label: '----' });
        slots.delete(slot);
      }
    });
  };
  parm.slots = slots;
  parm.midi = midi;
  _parm = parm;
  if (typeof window !== 'undefined') window.parm = parm;
  return parm;
}
