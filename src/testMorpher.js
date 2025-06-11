import { HydraSketchMorpher } from './HydraSketchMorpher.js';

// Test the HydraSketchMorpher with sample sketches from Olivia Jack

const morpher = new HydraSketchMorpher();

// Sample Hydra sketches to morph between
const sketchA = `osc(20, 0.1, 0.8).rotate(0.8).out()`;

const sketchB = `noise(3, 0.1).contrast(0.7).diff(noise(3.5, 0.2).contrast(0.7)).out()`;

const sketchC = `shape(3, 0.3, 0.01).rotate(0.5).scale(1.5).out()`;

const sketchD = `gradient(0).posterize(4).pixelate(20, 20).out()`;

function testMorphing () {
  console.log('🎨 Testing Hydra Sketch Morphing System\n');

  try {
    // Test 1: Simple oscillator to noise morphing
    console.log('📊 Test 1: Oscillator → Noise');
    console.log('Source A:', sketchA);
    console.log('Source B:', sketchB);
    console.log('');

    const morphSteps1 = morpher.morphSketches(sketchA, sketchB, 5);

    morphSteps1.forEach((step, index) => {
      console.log(`Step ${index} (t=${step.t.toFixed(2)}): ${step.code}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 2: Oscillator to geometric shape
    console.log('📊 Test 2: Oscillator → Shape');
    console.log('Source A:', sketchA);
    console.log('Source C:', sketchC);
    console.log('');

    const morphSteps2 = morpher.morphSketches(sketchA, sketchC, 5);

    morphSteps2.forEach((step, index) => {
      console.log(`Step ${index} (t=${step.t.toFixed(2)}): ${step.code}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 3: Complex sketch analysis
    console.log('📊 Test 3: Complex Sketch Analysis');
    const complexSketch = `
      noise(3,0.1).contrast(0.7)
        .diff(noise(3.5,0.2).contrast(0.7))
        .diff(noise(4,0.3).contrast(0.7))
        .modulateKaleid(osc(8).rotate(()=>Math.sin(time/8)*Math.PI))
        .mult(src(o0).rotate(Math.PI/2),0.7)
        .colorama(-.063)
        .out()
    `;

    console.log('Analyzing complex sketch structure...');
    const parsed = morpher.parseSketch(complexSketch);
    console.log('Found', parsed.structure.length, 'chain(s)');

    if (parsed.structure.length > 0) {
      const chain = parsed.structure[0];
      console.log('First chain functions:');
      chain.forEach((func, index) => {
        console.log(`  ${index}: ${func.name}(${func.args.length} args) [${func.metadata.type}]`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 4: Different function types
    console.log('📊 Test 4: Cross-type morphing (Oscillator → Gradient)');
    console.log('Source A:', sketchA);
    console.log('Source D:', sketchD);
    console.log('');

    const morphSteps4 = morpher.morphSketches(sketchA, sketchD, 5);

    morphSteps4.forEach((step, index) => {
      console.log(`Step ${index} (t=${step.t.toFixed(2)}): ${step.code}`);
    });

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
  }
}

function demonstrateInteractiveGeneration () {
  console.log('\n🎬 Interactive Generation Example\n');

  const sourceA = `osc(60, 0.1, 0).out()`;
  const sourceB = `noise(10, 0.5).kaleid(4).out()`;

  console.log('Generating smooth transition between:');
  console.log('A:', sourceA);
  console.log('B:', sourceB);
  console.log('');

  try {
    const steps = morpher.morphSketches(sourceA, sourceB, 10);

    console.log('🎭 Generated Transition Sequence:');
    steps.forEach((step, index) => {
      const progress = '█'.repeat(Math.floor(step.t * 20)) +
                      '░'.repeat(20 - Math.floor(step.t * 20));
      console.log(`${String(index).padStart(2)} [${progress}] ${step.code}`);
    });

    console.log('\n💡 Usage: Each step is a valid, executable Hydra sketch');
    console.log('   that can be run in any Hydra environment.');

  } catch (error) {
    console.error('❌ Error in interactive demo:', error.message);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testMorphing();
  demonstrateInteractiveGeneration();
}

export { testMorphing, demonstrateInteractiveGeneration };
