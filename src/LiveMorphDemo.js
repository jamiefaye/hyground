import { HydraSketchMorpher } from './HydraSketchMorpher.js';

/**
 * LiveMorphDemo - Shows how to use HydraSketchMorpher in a live performance context
 * This creates smooth real-time transitions between Hydra sketches
 */
class LiveMorphDemo {
  constructor () {
    this.morpher = new HydraSketchMorpher();
    this.currentMorph = null;
    this.isPlaying = false;
    this.morphDuration = 5000; // 5 seconds
    this.currentStep = 0;
    this.animationFrame = null;

    // Collection of curated Hydra sketches for live performance
    this.sketchLibrary = [
      {
        name: 'Oscillator Waves',
        code: `osc(20, 0.1, 0.8).rotate(0.2).scale(1.2).out()`,
        description: 'Smooth oscillating waves with rotation',
      },
      {
        name: 'Noise Field',
        code: `noise(3, 0.1).contrast(0.7).brightness(0.2).out()`,
        description: 'Organic noise patterns',
      },
      {
        name: 'Geometric Shapes',
        code: `shape(6, 0.4, 0.01).rotate(0.5).repeat(2, 2).out()`,
        description: 'Hexagonal geometry with repetition',
      },
      {
        name: 'Color Gradient',
        code: `gradient(0.5).posterize(8).colorama(0.1).out()`,
        description: 'Smooth color transitions',
      },
      {
        name: 'Kaleidoscope',
        code: `osc(10, 0.2, 1).kaleid(4).scale(0.8).out()`,
        description: 'Four-way mirrored patterns',
      },
      {
        name: 'Feedback Loop',
        code: `osc(40, 0.1, 0.8).modulate(src(o0).scale(1.01), 0.1).out()`,
        description: 'Self-modulating feedback',
      },
      {
        name: 'Pixelated Dreams',
        code: `noise(5, 0.2).pixelate(8, 8).contrast(1.5).out()`,
        description: 'Low-res pixelated aesthetic',
      },
      {
        name: 'Flowing Voronoi',
        code: `voronoi(5, 0.3, 0.2).modulateRotate(osc(8), 0.1).out()`,
        description: 'Cellular patterns in motion',
      },
    ];
  }

  /**
   * Generate a morph sequence between two sketch indices
   */
  generateMorph (fromIndex, toIndex, steps = 30) {
    const sketchA = this.sketchLibrary[fromIndex];
    const sketchB = this.sketchLibrary[toIndex];

    if (!sketchA || !sketchB) {
      throw new Error('Invalid sketch indices');
    }

    console.log(`🎨 Generating morph: "${sketchA.name}" → "${sketchB.name}"`);

    try {
      this.currentMorph = {
        from: sketchA,
        to: sketchB,
        steps: this.morpher.morphSketches(sketchA.code, sketchB.code, steps),
        startTime: null,
        duration: this.morphDuration,
      };

      console.log(`✅ Generated ${this.currentMorph.steps.length} transition steps`);
      return this.currentMorph;

    } catch (error) {
      console.error('❌ Failed to generate morph:', error.message);
      throw error;
    }
  }

  /**
   * Start playback of the current morph sequence
   */
  play () {
    if (!this.currentMorph) {
      console.error('No morph sequence loaded');
      return;
    }

    this.isPlaying = true;
    this.currentMorph.startTime = Date.now();
    console.log('▶️  Starting morph playback...');

    this._animate();
  }

  /**
   * Stop playback
   */
  stop () {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log('⏹️  Morph playback stopped');
  }

  /**
   * Animation loop for real-time playback
   */
  _animate () {
    if (!this.isPlaying || !this.currentMorph) return;

    const elapsed = Date.now() - this.currentMorph.startTime;
    const progress = Math.min(elapsed / this.currentMorph.duration, 1.0);

    // Calculate current step based on progress
    const stepIndex = Math.floor(progress * (this.currentMorph.steps.length - 1));
    const step = this.currentMorph.steps[stepIndex];

    if (stepIndex !== this.currentStep) {
      this.currentStep = stepIndex;
      this._onStepChange(step, progress);
    }

    if (progress < 1.0) {
      this.animationFrame = requestAnimationFrame(() => this._animate());
    } else {
      this._onMorphComplete();
    }
  }

  /**
   * Called when moving to a new step in the morph sequence
   */
  _onStepChange (step, progress) {
    console.log(`🎭 Step ${this.currentStep}/${this.currentMorph.steps.length - 1} (${(progress * 100).toFixed(1)}%)`);
    console.log(`   Code: ${step.code}`);

    // In a real implementation, this would execute the Hydra code
    this._executeHydraCode(step.code);
  }

  /**
   * Called when morph sequence completes
   */
  _onMorphComplete () {
    console.log('🎉 Morph sequence completed!');
    this.isPlaying = false;
    this.currentStep = 0;
  }

  /**
   * Simulate executing Hydra code (in real use, this would run in Hydra)
   */
  _executeHydraCode (code) {
    // In a real implementation, this would be something like:
    // hydra.eval(code);
    // For demo purposes, we just log it
    console.log(`   [HYDRA] ${code}`);
  }

  /**
   * Generate a random sequence of morphs for continuous performance
   */
  generateRandomSequence (length = 5) {
    const sequence = [];
    let currentIndex = Math.floor(Math.random() * this.sketchLibrary.length);

    for (let i = 0; i < length; i++) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * this.sketchLibrary.length);
      } while (nextIndex === currentIndex && this.sketchLibrary.length > 1);

      sequence.push({
        from: currentIndex,
        to: nextIndex,
        fromSketch: this.sketchLibrary[currentIndex],
        toSketch: this.sketchLibrary[nextIndex],
      });

      currentIndex = nextIndex;
    }

    return sequence;
  }

  /**
   * Run a complete demo sequence
   */
  async runDemo () {
    console.log('🎬 Starting Live Morph Demo\n');

    // Show available sketches
    console.log('📚 Available Sketches:');
    this.sketchLibrary.forEach((sketch, index) => {
      console.log(`  ${index}: ${sketch.name} - ${sketch.description}`);
    });
    console.log('');

    // Generate a demo sequence
    const sequence = this.generateRandomSequence(3);
    console.log('🎲 Random Performance Sequence:');
    sequence.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.fromSketch.name}" → "${item.toSketch.name}"`);
    });
    console.log('');

    // Run each morph in the sequence
    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i];
      console.log(`\n🎭 === Morph ${i + 1}/${sequence.length} ===`);

      try {
        this.generateMorph(item.from, item.to, 10);

        // Simulate real-time playback (shortened for demo)
        console.log('⏱️  Simulating 2-second morph...');
        this.morphDuration = 2000;

        await new Promise(resolve => {
          this.play();
          setTimeout(() => {
            this.stop();
            resolve();
          }, 2100);
        });

      } catch (error) {
        console.error(`❌ Failed morph ${i + 1}:`, error.message);
      }
    }

    console.log('\n🎉 Demo sequence complete!');
    console.log('\n💡 In a live performance, you would:');
    console.log('   • Connect this to MIDI controllers for real-time control');
    console.log('   • Pre-generate morph sequences for instant playback');
    console.log('   • Adjust timing based on musical tempo/BPM');
    console.log('   • Layer multiple morphs across different output channels');
  }

  /**
   * List available sketches
   */
  listSketches () {
    console.log('🎨 Sketch Library:');
    this.sketchLibrary.forEach((sketch, index) => {
      console.log(`${String(index).padStart(2)}: ${sketch.name.padEnd(20)} - ${sketch.description}`);
      console.log(`    ${sketch.code}`);
    });
  }
}

// Demo execution
async function runLiveDemo () {
  const demo = new LiveMorphDemo();
  await demo.runDemo();
}

export { LiveMorphDemo, runLiveDemo };
