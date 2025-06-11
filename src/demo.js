import { HydraSketchMorpher } from './HydraSketchMorpher.js';

console.log('🎨 Hydra Sketch Morphing Demo\n');

const morpher = new HydraSketchMorpher();

// Demo with two classic Olivia Jack style sketches
const sketchA = 'osc(20, 0.1, 0.8).rotate(0.8).pixelate(20, 20).out()';
const sketchB = 'noise(5, 0.2).contrast(1.5).kaleid(4).colorama(0.1).out()';

console.log('Source A:', sketchA);
console.log('Source B:', sketchB);
console.log('');

try {
  const morphs = morpher.morphSketches(sketchA, sketchB, 8);

  console.log('🎭 Generated Morph Sequence:');
  morphs.forEach((step, i) => {
    const bar = '█'.repeat(Math.floor(step.t * 20)) + '░'.repeat(20 - Math.floor(step.t * 20));
    console.log(`${String(i).padStart(2)}: [${bar}] ${step.code}`);
  });

  console.log('\n✅ Successfully generated', morphs.length, 'intermediate sketches!');
  console.log('💡 Each step is a valid Hydra sketch that preserves visual continuity.');

} catch (error) {
  console.error('❌ Error:', error.message);
}
