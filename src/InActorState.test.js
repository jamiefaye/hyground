import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InActorState } from './InActorState.js';

const load = text => { const st = new InActorState(() => {}, {}); st.loadPlayer(text); return st.playA; };

test('a //+ line is for the sketch below it: its duration, mark and key', () => {
  const a = load('//+ 10\nosc(1).out()\n\n\n\n//+ 20 mark\nosc(2).out()\n\n\n\n//+ dur=30 key\n// a comment first\nosc(3).out()\n');
  assert.deepEqual(a.map(p => p.dur), [10, 20, 30]);
  assert.deepEqual(a.map(p => p.mark), [false, true, false]);
  assert.deepEqual(a.map(p => p.key), [false, false, true]);
  assert.equal(a[2].sketch, '// a comment first\nosc(3).out()');
});

test('a sketch with no //+ line has no duration (the player uses the default), whatever came before', () => {
  const a = load('osc(1).out()\n\n\n\n//+ 7 mark\nosc(2).out()\n\n\n\nosc(3).out()\n');
  assert.deepEqual(a.map(p => p.dur), [0, 7, 0]);
  assert.deepEqual(a.map(p => p.mark), [false, true, false]);
});

test('a recording written out and loaded back keeps each sketch with its own time', () => {
  const st = new InActorState(() => {}, {});
  st.recordA = [{ timeStamp: 1000, sketch: 'osc(1).out()' }, { timeStamp: 6000, sketch: 'osc(2).out()' }, { timeStamp: 8500, sketch: 'osc(3).out()' }];
  st.loadPlayer(st.recordingToText());
  assert.deepEqual(st.playA.map(p => [p.sketch, p.dur]), [['osc(1).out()', 5], ['osc(2).out()', 2.5], ['osc(3).out()', 0]]);
});
