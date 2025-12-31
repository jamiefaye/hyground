// Hyperspace Starfield Demo - Simple Version
// Start with this to verify basics work, then try full version
//
// Usage on hydra.ojack.xyz:
// const ext = await import('https://www.fentonia.com/hydra-extensions/vertex-webgpu/index.js')
// await ext.replaceHydra()

// Configuration
const STAR_COUNT = 400
const FIELD_WIDTH = 5
const FIELD_DEPTH = 10

// Generate random star positions
const starPositions = new Float32Array(STAR_COUNT * 3)
for (let i = 0; i < STAR_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2
  const radius = Math.pow(Math.random(), 0.5) * FIELD_WIDTH / 2
  starPositions[i * 3]     = Math.cos(angle) * radius
  starPositions[i * 3 + 1] = Math.sin(angle) * radius
  starPositions[i * 3 + 2] = Math.random() * FIELD_DEPTH
}

// Simple version: quads as stars, Z loops with time
// Each star's Z = mod(initial_z + time * speed, depth) - depth/2

// Background
solid(0, 0, 0.03).out(o0)

// Stars - using quad geometry with instancing
solid(1, 1, 1)
  .out(o0,
    quad(0.008, 0.008)
      .instances(starPositions)
      // Z position loops: _ix provides per-star offset
      .translate(0, 0, "mod(_ix * 0.5 + time * 1.5, 10.0) - 5.0")
      .perspective(60)
  , 1)
