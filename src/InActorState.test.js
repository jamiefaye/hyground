import { mock, test } from 'node:test';
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

test('the countdown: a step restarts it at the new sketch\'s time; pause holds what is left and play carries on', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 5_000_000 });
  const shown = []; const info = { defaultDur: 2, maxDur: 0, holdDur: 0 };
  const st = new InActorState(s => shown.push(s), info);
  st.loadPlayer('//+ 10\nA\n\n\n\n//+ 20\nB\n\n\n\n//+ 30\nC\n\n\n\nD\n');
  st.doPlay();
  const tick = ms => mock.timers.tick(ms);
  tick(4000); assert.equal(info.countdown, '-6.0');
  st.doStepForward(); tick(100);                      // a step while playing: B, 20 s from now
  assert.deepEqual(shown, ['A', 'B']); assert.equal(info.countdown, '-19.9');
  tick(9000); assert.deepEqual(shown, ['A', 'B']);    // A's old 10 s mark passes: nothing

  st.doPlay();                                        // pause with 10.9 s of B left
  assert.equal(info.playing, false); assert.equal(info.countdown, '-10.9');
  tick(60000); assert.deepEqual(shown, ['A', 'B']); assert.equal(info.countdown, '-10.9');   // it stands
  st.doPlay(); tick(100);                             // play: B carries on, nothing new is loaded
  assert.deepEqual(shown, ['A', 'B']); assert.equal(info.countdown, '-10.8');
  tick(10700); assert.deepEqual(shown, ['A', 'B']);
  tick(200); assert.deepEqual(shown, ['A', 'B', 'C']);   // B's time is up: on to C

  st.doPlay();                                        // pause, then step: the new sketch's whole time waits
  st.doStepForward();
  assert.equal(shown.at(-1), 'D'); assert.equal(info.countdown, '-2.0');   // D has no time of its own: the default
  st.doStepBackward(); assert.equal(shown.at(-1), 'C'); assert.equal(info.countdown, '-30.0');
  tick(60000); assert.equal(shown.at(-1), 'C');
  st.doPlay(); tick(29900); assert.equal(shown.at(-1), 'C');
  tick(200); assert.equal(shown.at(-1), 'D');
  mock.timers.reset();
});

test('pause and play with a hold: a touch while paused still holds the sketch once play resumes', async () => {
  const { touchParm } = await import('./Parm.js');
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 9_000_000 });
  const shown = []; const info = { defaultDur: 2, maxDur: 0, holdDur: 5 };
  const st = new InActorState(s => shown.push(s), info);
  st.loadPlayer('A\n\n\n\nB\n');
  st.doPlay();
  const tick = ms => mock.timers.tick(ms);
  tick(1000); st.doPlay();                            // pause with 1 s left
  assert.equal(info.countdown, '-1.0'); assert.equal(info.holding, false);
  tick(20000); touchParm(); tick(1000);               // someone turns a knob while it is paused
  st.doPlay(); tick(1100);                            // play: the 1 s runs out, but the touch was 2.1 s ago
  assert.deepEqual(shown, ['A']); assert.equal(info.holding, true);
  tick(3000); assert.deepEqual(shown, ['A', 'B']);    // 5 s after the touch
  mock.timers.reset();
});

test('a loaded file starts on its first sketch: play, or a step forward; a step back goes to the last', () => {
  const file = 'A\n\n\n\nB\n\n\n\nC\n';
  const fresh = () => { const shown = []; const st = new InActorState(s => shown.push(s), { defaultDur: 2 }); st.loadPlayer(file); return { st, shown }; };
  let { st, shown } = fresh();
  st.doStepForward(); st.doStepForward(); assert.deepEqual(shown, ['A', 'B']);
  ({ st, shown } = fresh());
  st.doStepBackward(); st.doStepForward(); assert.deepEqual(shown, ['C', 'A']);
  ({ st, shown } = fresh());
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 12_000_000 });
  st.doPlay(); mock.timers.tick(2050); mock.timers.tick(2050); st.doPlay();   // one timer a tick: the mock clock runs a tick's timers at its end
  mock.timers.reset();
  assert.deepEqual(shown, ['A', 'B', 'C']);
  st.loadPlayer(file); st.doStepForward();            // a file loaded again starts again
  assert.equal(shown.at(-1), 'A');
});
