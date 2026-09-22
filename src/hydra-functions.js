// Function metadata for sketch parsing (Mutator, HydraSketchMorpher): hyv's own
// function table plus the vertex extension's lighting functions, shader bodies
// stripped. One source of truth: a function added in hyv shows up here.
import glslFunctions from 'hydra-synth/src/glsl/glsl-functions.js';
import lightingFunctions from 'hydra-synth/extensions/vertex/lighting-functions.js';

const strip = ({ name, type, inputs }) => ({ name, type, inputs });

export const hydraFunctions = [...glslFunctions(), ...lightingFunctions].map(strip);
