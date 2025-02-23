// This is a stripped-down version of glsl-functions.js which omits the glsl entries.
let hydraFunctions = [
  {
  name: 'noise',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 10,
    },
{
      type: 'float',
      name: 'offset',
      default: 0.1,
    }
  ]
},
{
  name: 'voronoi',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0.3,
    },
{
      type: 'float',
      name: 'blending',
      default: 0.3,
    }
  ]
},
{
  name: 'osc',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'frequency',
      default: 60,
    },
{
      type: 'float',
      name: 'sync',
      default: 0.1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'shape',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'sides',
      default: 3,
    },
{
      type: 'float',
      name: 'radius',
      default: 0.3,
    },
{
      type: 'float',
      name: 'smoothing',
      default: 0.01,
    }
  ]
},
{
  name: 'gradient',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ]
},
{
  name: 'src',
  type: 'src',
  inputs: [
    {
      type: 'sampler2D',
      name: 'tex',
      default: NaN,
    }
  ]
},
{
  name: 'solid',
  type: 'src',
  inputs: [
    {
      type: 'float',
      name: 'r',
      default: 0,
    },
{
      type: 'float',
      name: 'g',
      default: 0,
    },
{
      type: 'float',
      name: 'b',
      default: 0,
    },
{
      type: 'float',
      name: 'a',
      default: 1,
    }
  ]
},
{
  name: 'rotate',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'angle',
      default: 10,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ]
},
{
  name: 'scale',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1.5,
    },
{
      type: 'float',
      name: 'xMult',
      default: 1,
    },
{
      type: 'float',
      name: 'yMult',
      default: 1,
    },
{
      type: 'float',
      name: 'offsetX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'offsetY',
      default: 0.5,
    }
  ]
},
{
  name: 'pixelate',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'pixelX',
      default: 20,
    },
{
      type: 'float',
      name: 'pixelY',
      default: 20,
    }
  ]
},
{
  name: 'posterize',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'bins',
      default: 3,
    },
{
      type: 'float',
      name: 'gamma',
      default: 0.6,
    }
  ]
},
{
  name: 'shift',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'r',
      default: 0.5,
    },
{
      type: 'float',
      name: 'g',
      default: 0,
    },
{
      type: 'float',
      name: 'b',
      default: 0,
    },
{
      type: 'float',
      name: 'a',
      default: 0,
    }
  ]
},
{
  name: 'repeat',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'repeatX',
      default: 3,
    },
{
      type: 'float',
      name: 'repeatY',
      default: 3,
    },
{
      type: 'float',
      name: 'offsetX',
      default: 0,
    },
{
      type: 'float',
      name: 'offsetY',
      default: 0,
    }
  ]
},
{
  name: 'modulateRepeat',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'repeatX',
      default: 3,
    },
{
      type: 'float',
      name: 'repeatY',
      default: 3,
    },
{
      type: 'float',
      name: 'offsetX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'offsetY',
      default: 0.5,
    }
  ]
},
{
  name: 'repeatX',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'modulateRepeatX',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0.5,
    }
  ]
},
{
  name: 'repeatY',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'modulateRepeatY',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'reps',
      default: 3,
    },
{
      type: 'float',
      name: 'offset',
      default: 0.5,
    }
  ]
},
{
  name: 'kaleid',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'nSides',
      default: 4,
    }
  ]
},
{
  name: 'modulateKaleid',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'nSides',
      default: 4,
    }
  ]
},
{
  name: 'scroll',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'scrollX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'scrollY',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speedX',
      default: 0,
    },
{
      type: 'float',
      name: 'speedY',
      default: 0,
    }
  ]
},
{
  name: 'scrollX',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'scrollX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ]
},
{
  name: 'modulateScrollX',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'scrollX',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ]
},
{
  name: 'scrollY',
  type: 'coord',
  inputs: [
    {
      type: 'float',
      name: 'scrollY',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ]
},
{
  name: 'modulateScrollY',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'scrollY',
      default: 0.5,
    },
{
      type: 'float',
      name: 'speed',
      default: 0,
    }
  ]
},
{
  name: 'add',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ]
},
{
  name: 'sub',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ]
},
{
  name: 'layer',
  type: 'combine',
  inputs: [

  ]
},
{
  name: 'blend',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.5,
    }
  ]
},
{
  name: 'mult',
  type: 'combine',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ]
},
{
  name: 'diff',
  type: 'combine',
  inputs: [

  ]
},
{
  name: 'modulate',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.1,
    }
  ]
},
{
  name: 'modulateScale',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'multiple',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 1,
    }
  ]
},
{
  name: 'modulatePixelate',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'multiple',
      default: 10,
    },
{
      type: 'float',
      name: 'offset',
      default: 3,
    }
  ]
},
{
  name: 'modulateRotate',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'multiple',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'modulateHue',
  type: 'combineCoord',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ]
},
{
  name: 'invert',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1,
    }
  ]
},
{
  name: 'contrast',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 1.6,
    }
  ]
},
{
  name: 'brightness',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.4,
    }
  ]
},
{
  name: 'mask',
  type: 'combine',
  inputs: [

  ]
},

{
  name: 'luma',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'threshold',
      default: 0.5,
    },
{
      type: 'float',
      name: 'tolerance',
      default: 0.1,
    }
  ]
},
{
  name: 'thresh',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'threshold',
      default: 0.5,
    },
{
      type: 'float',
      name: 'tolerance',
      default: 0.04,
    }
  ]
},
{
  name: 'color',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'r',
      default: 1,
    },
{
      type: 'float',
      name: 'g',
      default: 1,
    },
{
      type: 'float',
      name: 'b',
      default: 1,
    },
{
      type: 'float',
      name: 'a',
      default: 1,
    }
  ]
},
{
  name: 'saturate',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 2,
    }
  ]
},
{
  name: 'hue',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'hue',
      default: 0.4,
    }
  ],
},
{
  name: 'colorama',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'amount',
      default: 0.005,
    }
  ]
},
{
  name: 'prev',
  type: 'src',
  inputs: [

  ]
},
{
  name: 'sum',
  type: 'color',
  inputs: [
    {
      type: 'vec4',
      name: 'scale',
      default: 1,
    }
  ],
},
{
  name: 'r',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'g',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'b',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
},
{
  name: 'a',
  type: 'color',
  inputs: [
    {
      type: 'float',
      name: 'scale',
      default: 1,
    },
{
      type: 'float',
      name: 'offset',
      default: 0,
    }
  ]
}
];

export {hydraFunctions}
