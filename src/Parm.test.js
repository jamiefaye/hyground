import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isParmed, unparmSketch, abbrev, describeControls, firstDigit, formatValue, parmSketch, rangeFor, renderValues } from './Parm.js';

test('labels: abbreviation plus first digit, unique keys, index mode', () => {
  assert.equal(abbrev('colorama'), 'cor'); assert.equal(abbrev('modulateScrollX'), 'msx'); assert.equal(abbrev('zzz'), 'zzz');
  assert.equal(firstDigit('0.4'), '4'); assert.equal(firstDigit('12'), '1'); assert.equal(firstDigit('0'), '0'); assert.equal(firstDigit('-0.05'), '5');
  const r = parmSketch('osc(5).add(noise(5, 2)).color(0, 0, 3).colorama(0.4).out()', { label: 'digit' });
  assert.deepEqual(r.controls.map(c => c.key), ['osc5', 'noi5', 'noi2', 'col0', 'col0b', 'col3', 'cor4']);
  assert.deepEqual(r.controls.map(c => c.label), ['osc5', 'noi5', 'noi2', 'col0', 'col0', 'col3', 'cor4']);
  const i = parmSketch('osc(5).add(noise(5, 2)).color(0, 0, 3).colorama(0.4).out()');
  assert.deepEqual(i.controls.map(c => c.key), ['osc1', 'noi1', 'noi2', 'col1', 'col2', 'col3', 'cor1']);
});

test('the transformed sketch: begin, direct args become parm(...), out() and subscripts stay', () => {
  const r = parmSketch('osc(5).add(noise(5, 2)).color(0, 0, 3).colorama(0.4).out(o0)', { label: 'digit' });
  assert.equal(r.code, 'parm.begin()\nosc(parm(1, "osc5", 5, 0.625, 40, "log")).add(noise(parm(2, "noi5", 5, 0.625, 40, "log"), parm(3, "noi2", 2, 0, 4))).color(parm(4, "col0", 0, 0, 1), parm(5, "col0b", 0, 0, 1), parm(6, "col3", 3, 0, 6)).colorama(parm(7, "cor4", 0.4, 0, 0.8)).out(o0);');
  assert.equal(r.controls[0].arg, 'frequency'); assert.equal(r.controls[6].fn, 'colorama');
  assert.match(describeControls(r.controls), /1 osc5 {3}osc\(frequency\) = 5 {2}\[0.625\.\.40 log\]/);
});

test('inside expressions the value is called; arrays, out options and non-hydra calls are left alone', () => {
  const r = parmSketch('osc(10, () => time * 0.1, [1, 2, 3]).rotate(-0.5).out(o0, { level: 1 })\nsetResolution(640, 480)\nsrc(o0).modulate(osc(3), 0.2).out(o1)', { label: 'digit' });
  assert.equal(r.code, 'parm.begin()\nosc(parm(1, "osc1", 10, 1.25, 80, "log"), () => time * parm(2, "osc1b", 0.1, 0.0125, 0.8, "log")(), [1, 2, 3]).rotate(parm(3, "rot5", -0.5, -1, 0)).out(o0, {\n  level: 1\n});\nsetResolution(640, 480);\nsrc(o0).modulate(osc(parm(4, "osc3", 3, 0.375, 24, "log")), parm(5, "mod2", 0.2, 0, 0.4)).out(o1);');
  assert.equal(r.controls[1].arg, 'sync'); assert.equal(r.controls[2].value, -0.5);
});

test('ranges by argument class, integer counts, slot cap, comments kept', () => {
  assert.deepEqual(rangeFor('osc', 'frequency', 60), { min: 7.5, max: 480, curve: 'log' });
  assert.deepEqual(rangeFor('kaleid', 'nSides', 4), { min: 1, max: 8, curve: 'int' });
  assert.deepEqual(rangeFor('scale', 'amount', 1.5), { min: 0.188, max: 12, curve: 'log' });
  assert.deepEqual(rangeFor('blend', 'amount', 0), { min: 0, max: 1, curve: 'linear' });
  assert.deepEqual(rangeFor('osc', 'offset', 0), { min: 0, max: 1, curve: 'linear' });
  assert.deepEqual(rangeFor('rotate', 'speed', 0), { min: -1, max: 1, curve: 'linear' });
  const r = parmSketch('// hi\nosc(1).kaleid(4).out()', { slots: 1 });
  assert.equal(r.controls.length, 1); assert.match(r.code, /kaleid\(4\)/); assert.match(r.code, /\/\/ hi/);
  const none = parmSketch('osc().out()');
  assert.equal(none.controls.length, 0); assert.match(none.code, /^parm.begin\(\)\nosc\(\).out\(\);$/);
});

test('renderValues writes the knob values back over the original constants', () => {
  const text = 'osc(5, () => time * 0.1).rotate(-0.5).kaleid(4).out()';
  const r = parmSketch(text);
  assert.deepEqual(r.controls.map(c => text.slice(c.start, c.end)), ['5', '0.1', '-0.5', '4']);
  const values = { 1: 7.25, 2: 0.123456, 3: 0.5, 4: 5.6 };
  assert.equal(renderValues(text, r.controls, c => values[c.slot]), 'osc(7.25, () => time * 0.123).rotate(0.5).kaleid(6).out()');
  assert.equal(renderValues(text, r.controls, c => (c.slot === 1 ? 40 : undefined)), 'osc(40, () => time * 0.1).rotate(-0.5).kaleid(4).out()');
  assert.equal(formatValue(2.0), '2'); assert.equal(formatValue(0.000123), '0.000123'); assert.equal(formatValue(1234.5), '1230');
});

test('assignments: let / const / plain =, labelled =name, read where they sit', () => {
  const text = 'let speed = 0.5\nconst n = 4, name = "x"\nspeed = -1\nosc(10, speed).kaleid(n).out()';
  const r = parmSketch(text);
  assert.deepEqual(r.controls.map(c => [c.key, c.kind, c.arg, c.raw]), [['=spe', 'assign', 'speed', '0.5'], ['=n', 'assign', 'n', '4'], ['=speb', 'assign', 'speed', '-1'], ['osc1', 'arg', 'frequency', '10']]);
  assert.equal(r.code, 'parm.begin()\nlet speed = parm(1, "=spe", 0.5, 0.0625, 4, "log")();\nconst n = parm(2, "=n", 4, 0, 8)(), name = "x";\nspeed = parm(3, "=speb", -1, -2, 0)();\nosc(parm(4, "osc1", 10, 1.25, 80, "log"), speed).kaleid(n).out();');
  assert.match(describeControls(r.controls), /1 =spe   speed = 0.5/);
  assert.equal(renderValues(text, r.controls, c => c.slot === 2 ? 6 : undefined), 'let speed = 0.5\nconst n = 6, name = "x"\nspeed = -1\nosc(10, speed).kaleid(n).out()');
});

test('re-parm: a parmed sketch is unparmed first, so parm.begin() never repeats and the knobs come back', () => {
  const src = 'let k = 0.5\nosc(10, () => time * 0.1).rotate(0.3).out(o0)'
  const once = parmSketch(src)
  assert.equal(isParmed(once.code), true); assert.equal(isParmed(src), false)
  assert.equal(unparmSketch(once.code), 'let k = 0.5;\nosc(10, () => time * 0.1).rotate(0.3).out(o0);')
  const twice = parmSketch(once.code)
  assert.equal(twice.controls.length, once.controls.length)
  assert.equal((twice.code.match(/parm\.begin\(\)/g) || []).length, 1)
  assert.deepEqual(twice.controls.map(c => [c.slot, c.label, c.value]), once.controls.map(c => [c.slot, c.label, c.value]))
  // a sketch with its own parm() and no begin is not touched
  const own = 'osc(parm(1, 2, 3)).out(o0)'
  assert.equal(parmSketch(own).code.includes('parm(1, 2, 3)'), true)
})
