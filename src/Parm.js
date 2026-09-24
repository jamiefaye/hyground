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
  const visit = node => {
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
  // always, even with no constants (it clears the last sketch's labels); the argument is one letter per
  // slot, 'a' an argument knob and '=' a named constant, so a host can place the knobs by slot number
  // before the parm calls run (the ones inside arrow functions run at the first frame, not at eval)
  const kinds = controls.map(c => (c.kind === 'assign' ? '=' : 'a')).join('');
  const code = `parm.begin('${kinds}')\n` + body;
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

// A knob's colour on a device with RGB LEDs: one hue family per Hydra function (the label's first
// letters), so every osc knob is one colour and every rotate another; the level shows the value.
const FAMILY_NAMES = ['red', 'orange', 'yellow', 'lime', 'green', 'spring', 'turquoise', 'cyan', 'sky', 'blue', 'indigo', 'purple', 'magenta', 'pink'];
function familyFor (label) {
  const fn = String(label).replace(/^=/, '').replace(/[0-9]+$/, '') || label;
  let h = 0;
  for (const ch of fn) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FAMILY_NAMES[h % FAMILY_NAMES.length];
}
const levelFor = pos => (pos < 0.25 ? 3 : pos < 0.5 ? 2 : pos < 0.75 ? 1 : 0); // dim, mid, full, light

/**
 * Install once per page. Registers window.parm and window.midi (EC4 PARM profile: setup 14,
 * channel 14, labels written live to the OLED over sysex; a Launch Control XL 3 in DAW mode
 * when one is plugged in). Safe without a controller: the knobs keep their init values and
 * the picture is the sketch as written.
 *
 * Where a sketch's knobs land (decided at each parm.begin('aa=a'), by slot number):
 * the endless rows of every device that has ports, the ones added after the default first (an
 * XL3's three encoder rows before the EC4's groups), then the default device's groups; a named
 * constant (let x = 0.5, label '=x..') goes to a bounded row (the XL3's faders, soft pickup)
 * while there are any, else in with the rest. A device without ports is skipped, so a sketch
 * parmed with the EC4 alone puts everything on the EC4.
 */
export async function installParm (options = {}) {
  if (_parm) return _parm;
  const { install, parm: profile, xl3daw, nano, palette } = await import('hydra-synth/extensions/midi');
  const midi = await install(null, Object.assign({ profile, sysex: true, log: false, devices: [xl3daw, nano] }, options));
  const slots = new Map(); // slot -> { label, init, min, max, curve, fn, device, id, row }
  const byKey = new Map(); // 'device:channel:number' -> slot, for events coming back
  let live = new Set();
  let plan = null;
  let used = { endless: 0, bounded: 0 };
  const placed = new Map();

  // Every knob a sketch could land on, in order: page 1 of each paged device (an XL3's rows), the
  // default device's groups, then pages 2.. of the paged devices until `need` knobs are found
  const MAX_PAGES = 8;
  const targets = (need = 0) => {
    const endless = []; const bounded = []; const paged = [];
    const devs = [...midi._order.filter(d => d !== midi.default), midi.default];
    const pageOf = (d, rows, page) => {
      // a surface with no endless rows at all (the nano: knobs and faders, all bounded) gives its bounded rows to every knob
      const onlyBounded = !rows.some(r => r.kind === 'endless');
      const inFillOrder = rows.slice().sort((a, b) => (a.fill ?? 99) - (b.fill ?? 99)); // a row's `fill` says who goes first (the nano: faders before knobs)
      for (const r of inFillOrder) {
        const list = r.kind === 'endless' || (onlyBounded && r.kind === 'bounded') ? endless : r.kind === 'bounded' && page === 1 ? bounded : null;
        if (list) for (let n = 1; n <= (r.count || 8); n++) list.push({ device: d, id: [r.group, n], row: r, page });
      }
    };
    // plugged in = a port whose name the profile knows (the default device also takes every port the others left)
    const plugged = d => d.inputs.some(n => (d.profile.match instanceof RegExp ? d.profile.match.test(n) : true));
    const others = devs.filter(d => d !== midi.default && plugged(d));
    for (const d of devs) {
      if (d !== midi.default && !plugged(d)) continue; // not plugged in
      if (d === midi.default && others.length && !plugged(d)) continue; // an absent default device, with another to hand
      const rows = (d.profile.layout || []).filter(r => r.group);
      if (rows.length) { pageOf(d, rows, 1); paged.push({ d, rows }); } else if (d.profile.encoder) {
        const groups = d.profile.groups || 1; const per = d.profile.encodersPerGroup || 16;
        for (let g = 1; g <= groups; g++) for (let n = 1; n <= per; n++) endless.push({ device: d, id: [g, n], row: { kind: 'endless', closed: false } });
      }
    }
    for (let page = 2; page <= MAX_PAGES && endless.length < need; page++) for (const { d, rows } of paged) if (rows.some(r => r.kind === 'endless')) pageOf(d, rows, page);
    return { endless, bounded, paged: paged.map(x => x.d) };
  };
  const placeOne = (slot, label) => {
    if (!plan) plan = targets();
    const kind = label.startsWith('=') && plan.bounded.length > used.bounded ? 'bounded' : 'endless';
    const t = plan[kind][used[kind]++] || null;
    placed.set(slot, t);
    return t;
  };
  // begin('aa=a') places every slot up front, in slot order; a begin() without the letters places as the calls come
  const place = (slot, label) => (placed.has(slot) ? placed.get(slot) : placeOne(slot, label));
  const keyOf = (device, channel, number) => `${device.id}:${channel == null ? '*' : channel}:${number}`;

  const parm = (slot, label, init, min, max, curve = 'linear') => {
    live.add(slot);
    const prev = slots.get(slot);
    // Inside an arrow function this runs every frame: the same control again is a lookup, not a registration
    if (prev && prev.label === label && prev.init === init && prev.min === min && prev.max === max && prev.curve === curve) return prev.fn;
    const t = place(slot, label);
    if (!t) { // more constants than knobs: a plain value, as written
      const fn = () => init; fn.set = () => {}; fn.reset = () => {}; fn.config = { min, max, init, curve: curve === 'int' ? 'linear' : curve };
      slots.set(slot, { label, init, min, max, curve, fn, device: null, id: null, row: null });
      return fn;
    }
    const { device, id, row } = t;
    const opts = { min, max, init, label };
    if (t.page) opts.page = t.page;
    if (row.kind === 'bounded') {
      // a fader: its range is the whole travel, soft pickup so nothing jumps
      opts.curve = curve === 'int' ? 'linear' : curve; opts.pickup = 'soft';
    } else {
      // an endless encoder: no rails unless the device's range is closed; push and turn: a tenth of a detent
      opts.open = row.closed ? false : true; opts.fine = 10;
      if (curve === 'int') { opts.curve = 'linear'; opts.steps = Math.max(1, Math.round(max - min)); opts.open = row.closed ? false : 'up'; opts.fine = 0; } else opts.curve = curve;
    }
    if (device.profile.feedback && device.profile.feedback.colour) opts.colour = palette.hue(familyFor(label), levelFor(prev && prev.fn.pos !== undefined ? prev.fn.pos : 0.5));
    const fn = device.cc(id, opts);
    if (!prev || prev.label !== label || prev.init !== init) fn.set(init); // a new sketch on this slot starts at its own value
    slots.set(slot, { label, init, min, max, curve, fn, device, id, row });
    for (const a of fn.aliases || []) byKey.set(keyOf(device, a.channel, a.number), slot);
    if (device.profile.feedback && device.profile.feedback.text) device.text(id, [label, formatValue(fn(), curve)]);
    return fn;
  };
  /** Start of a parmed sketch: the knobs are placed afresh; slots it does not use again lose their labels after the eval. */
  parm.begin = (kinds = '') => {
    live = new Set(); used = { endless: 0, bounded: 0 }; placed.clear();
    plan = targets(String(kinds).length);
    Array.from(String(kinds)).forEach((k, i) => placeOne(i + 1, k === '=' ? '=' : 'a'));
    for (const d of plan.paged) if (d.page !== 1) d.setPage(1); // a new sketch starts on page 1
    queueMicrotask(() => {
      for (const [slot, s] of slots) {
        if (live.has(slot)) continue;
        if (s.device) {
          s.device.cc(s.id, { min: s.fn.config.min, max: s.fn.config.max, label: '----' });
          const fb = s.device.profile.feedback || {};
          if (fb.colour) s.device.colour(s.id, 0);
          if (fb.text) s.device.text(s.id, ['']);
          for (const a of s.fn.aliases || []) byKey.delete(keyOf(s.device, a.channel, a.number));
        }
        slots.delete(slot);
      }
      pageLamps();
    });
  };
  // The pages of a paged device on its last button row: press = that page; lit for the live page, dim
  // where a page holds knobs, off where it is empty
  const pagesOf = d => Math.max(1, ...[...slots.values()].filter(s => s.device === d && s.fn.page).map(s => s.fn.page));
  const pageRow = d => (d.profile.layout || []).find(r => r.group && r.kind === 'button' && r.role === 'pages') || null;
  const pageLamps = () => {
    for (const d of midi._order) {
      const row = pageRow(d);
      if (!row || !(d.profile.feedback && d.profile.feedback.lamp)) continue;
      const n = pagesOf(d);
      for (let i = 1; i <= (row.count || 8); i++) d.lamp([row.group, i], i === d.page ? 1 : (i <= n ? 0.3 : 0));
    }
  };
  for (const d of midi._order) {
    const row = pageRow(d);
    if (!row) continue;
    for (let i = 1; i <= (row.count || 8); i++) d.note([row.group, i]);
    d.onPage(pageLamps);
  }
  midi.onEvent(ev => {
    if (ev.type !== 'noteon') return;
    const d = midi.device(ev.device); const row = d && pageRow(d);
    if (!row) return;
    const at = d.profile.locate ? d.profile.locate(ev.number, ev.channel) : null;
    if (at && at[0] === row.group && at[1] <= pagesOf(d)) d.setPage(at[1]);
  });
  /** The slot a controller event belongs to, or undefined. */
  parm.slotOf = ev => (ev && ev.device !== undefined ? byKey.get(keyOf({ id: ev.device }, ev.channel, ev.number)) ?? byKey.get(keyOf({ id: ev.device }, null, ev.number)) : undefined);
  parm.slots = slots;
  parm.midi = midi;
  parm.familyFor = familyFor;

  // A knob turned or set: its LED level and its display page follow (devices that have them)
  midi.onEvent(ev => {
    if (!ev.registered || (ev.type !== 'cc' && ev.type !== 'set') || ev.pos === undefined) return;
    const slot = parm.slotOf(ev);
    const s = slot !== undefined ? slots.get(slot) : null;
    if (!s || !s.device) return;
    const fb = s.device.profile.feedback || {};
    if (fb.colour) s.device.colour(s.id, palette.hue(familyFor(s.label), levelFor(ev.pos)));
    if (fb.text) s.device.text(s.id, [s.label, formatValue(s.fn(), s.curve), s.row.kind === 'bounded' && !ev.caught ? 'move to catch' : '']);
    // the nano's S, M, R under a fader or knob say where it stands against its value: below, caught, above
    if (s.device.profile.id === 'nano' && s.row.kind === 'bounded' && ev.phys !== undefined) {
      const n = s.id[1];
      const below = !ev.caught && ev.phys < ev.pos; const above = !ev.caught && ev.phys > ev.pos;
      s.device.lamp([3, n], below ? 1 : 0); s.device.lamp([4, n], ev.caught ? 1 : 0); s.device.lamp([5, n], above ? 1 : 0);
    }
  });

  _parm = parm;
  if (typeof window !== 'undefined') window.parm = parm;
  return parm;
}
