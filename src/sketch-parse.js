/**
 * Parse a Hydra sketch the way the engine compiles it. createHydra runs every sketch as the body
 * of an async generator, so `await`, `yield` and a top-level `return` are all legal in one; acorn
 * only accepts `yield` inside a generator, so the text is parsed wrapped as one (as Deglobalize
 * does) and the wrapper's block becomes the Program that tools walk and astring regenerates.
 *
 *   const { ast, offset } = parseSketch(text, comments)
 *
 * Node positions are in the wrapped text: subtract `offset` for a position in the sketch. The
 * comments array (astravel's attachComments takes it) is in the same coordinates, so attaching
 * and generating need no adjustment.
 */
import { Parser } from 'acorn';

export const SKETCH_PREFIX = 'async function* f() {\n';

export function parseSketch (text, comments = []) {
  const wrapped = Parser.parse(SKETCH_PREFIX + text + '\n}', { ecmaVersion: 'latest', locations: true, allowReserved: true, onComment: comments });
  const block = wrapped.body[0].body;
  const ast = { type: 'Program', sourceType: 'script', body: block.body, start: block.start + 1, end: block.end - 1 };
  return { ast, offset: SKETCH_PREFIX.length };
}
