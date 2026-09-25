import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Mutator } from './Mutator.js'

const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn() } finally { console.log = log } }

test('the dice parses sketches with top-level await', () => {
  const m = new Mutator()
  const out = quiet(() => m.mutate({}, 'await loadGlb("x.glb")\nosc(10).out()'))
  assert.match(out, /await loadGlb\("x\.glb"\)/)
})

// (the cube's size is a geometry constant, in the table since the vertex functions joined it: the dice may roll it)
test('only arguments of table functions are rerolled: out() level, setResolution, initCam, .fast stay', () => {
  const m = new Mutator()
  const src = 'setResolution(1920, 1080)\ns0.initCam(1)\nshape([4,5,6].fast(0.1), 0.3).out(o0, cube(0.5), 2)'
  for (let i = 0; i < 40; i++) {
    const out = quiet(() => m.mutate({}, src))
    assert.match(out, /setResolution\(1920, 1080\)/); assert.match(out, /initCam\(1\)/); assert.match(out, /fast\(0\.1\)/); assert.match(out, /cube\([0-9.]+\), 2\)/)
  }
})

test('a transform change never lands on a non-Hydra method and never throws', () => {
  const m = new Mutator()
  const src = 'shape([4,5,6].fast(0.1)).rotate(0.2).then(x => x).out()'
  for (let i = 0; i < 40; i++) {
    const out = quiet(() => m.mutate({ changeTransform: true }, src))
    assert.match(out, /fast\(0\.1\)/); assert.match(out, /\.then\(/)
  }
})

test('initial values follow the sketch shape, not the literal count', () => {
  const m = new Mutator()
  quiet(() => m.mutate({}, 'osc(10, 0.1).out()'))
  assert.deepEqual(m.initialVector, [10, 0.1])
  quiet(() => m.mutate({}, 'noise(3, 0.5).out()'))   // same count, different sketch
  assert.deepEqual(m.initialVector, [3, 0.5])
})
