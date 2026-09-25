// Function metadata for sketch parsing (Mutator, HydraSketchMorpher, Parm): hyv's own
// function table plus the vertex extension's lighting functions and its geometry, transforms
// and layouts, shader bodies stripped. One source of truth: a function added in hyv shows up here.
// A vertex function that shares a name with a Hydra one (scale, offset, rotate, repeat) is only
// in vertexFunctions: Parm tells them apart by the chain's root, the dice keeps Hydra's.
import glslFunctions from 'hydra-synth/src/glsl/glsl-functions.js';
import lightingFunctions from 'hydra-synth/extensions/vertex/lighting-functions.js';
import vertexTable from 'hydra-synth/extensions/vertex/vertex-functions.js';

const strip = ({ name, type, inputs, live }) => (live === undefined ? { name, type, inputs } : { name, type, inputs, live });

const base = [...glslFunctions(), ...lightingFunctions].map(strip);
const known = new Set(base.map(f => f.name));
export const vertexFunctions = vertexTable.map(strip);
export const hydraFunctions = [...base, ...vertexFunctions.filter(f => !known.has(f.name))];
