import { Parser } from 'acorn';
import { generate } from 'astring';
import { attachComments, makeTraveler } from 'astravel';
import { hydraFunctions } from './hydra-functions.js';

/**
 * HydraSketchMorpher - Generates incremental transformations between two Hydra sketches
 * Each intermediate state is guaranteed to be a valid, executable Hydra sketch
 */
class HydraSketchMorpher {
  constructor () {
    this.funcsByType = {};
    this.funcMetadata = {};
    this._buildFunctionMaps();
  }

  _buildFunctionMaps () {
    hydraFunctions.forEach(func => {
      this.funcMetadata[func.name] = func;
      if (!this.funcsByType[func.type]) {
        this.funcsByType[func.type] = [];
      }
      this.funcsByType[func.type].push(func);
    });
  }

  /**
   * Parse a Hydra sketch into an AST and extract its structure
   */
  parseSketch (sketchCode) {
    try {
      const comments = [];
      const ast = Parser.parse(sketchCode, {
        locations: true,
        ecmaVersion: 'latest',
        onComment: comments,
      });

      const structure = this._extractSketchStructure(ast);
      return { ast, comments, structure };
    } catch (error) {
      throw new Error(`Failed to parse sketch: ${error.message}`);
    }
  }

  /**
   * Extract the chain structure of a Hydra sketch from its AST
   */
  _extractSketchStructure (ast) {
    const chains = [];
    const self = this;

    const visitor = makeTraveler({
      go (node, state) {
        if (node.type === 'ExpressionStatement' &&
            node.expression &&
            self._isHydraChain(node.expression)) {
          const chain = self._extractChain(node.expression);
          if (chain.length > 0) {
            chains.push(chain);
          }
        }
        this.super.go.call(this, node, state);
      },
    });

    visitor.go(ast, {});
    return chains;
  }

  /**
   * Check if a node represents a Hydra function chain
   */
  _isHydraChain (node) {
    if (node.type === 'CallExpression') {
      const funcName = this._getFunctionName(node);
      return funcName && (this.funcMetadata[funcName] || funcName === 'out');
    }
    return false;
  }

  /**
   * Extract a function chain from a call expression node
   */
  _extractChain (node, chain = []) {
    if (node.type === 'CallExpression') {
      const funcName = this._getFunctionName(node);
      const args = node.arguments.map(arg => this._extractArgument(arg));

      chain.unshift({
        name: funcName,
        args,
        metadata: this.funcMetadata[funcName] || { type: 'output', name: funcName },
      });

      // Follow the chain backwards (right to left in method chaining)
      if (node.callee && node.callee.object) {
        return this._extractChain(node.callee.object, chain);
      }
    } else if (node.type === 'Identifier') {
      // Base case: source identifier like 'osc', 'noise', etc.
      const funcName = node.name;
      if (this.funcMetadata[funcName]) {
        chain.unshift({
          name: funcName,
          args: [],
          metadata: this.funcMetadata[funcName],
        });
      }
    }
    return chain;
  }

  /**
   * Get function name from a call expression
   */
  _getFunctionName (callNode) {
    if (callNode.callee.type === 'MemberExpression') {
      return callNode.callee.property.name;
    } else if (callNode.callee.type === 'Identifier') {
      return callNode.callee.name;
    }
    return null;
  }

  /**
   * Extract argument information from an AST node
   */
  _extractArgument (argNode) {
    if (argNode.type === 'Literal') {
      return { type: 'literal', value: argNode.value };
    } else if (argNode.type === 'ArrowFunctionExpression' ||
               argNode.type === 'FunctionExpression') {
      return { type: 'function', code: generate(argNode) };
    } else {
      return { type: 'expression', code: generate(argNode) };
    }
  }

  /**
   * Generate a sequence of incremental transformations between two sketches
   */
  morphSketches (sketchA, sketchB, steps = 10) {
    const parsedA = this.parseSketch(sketchA);
    const parsedB = this.parseSketch(sketchB);

    if (parsedA.structure.length === 0 || parsedB.structure.length === 0) {
      throw new Error('One or both sketches contain no valid Hydra chains');
    }

    // For now, focus on the first chain of each sketch
    const chainA = parsedA.structure[0];
    const chainB = parsedB.structure[0];

    return this._generateMorphSteps(chainA, chainB, steps);
  }

  /**
   * Generate incremental transformation steps between two function chains
   */
  _generateMorphSteps (chainA, chainB, steps) {
    const morphSteps = [];

    // Create alignment between the two chains
    const alignment = this._alignChains(chainA, chainB);

    for (let step = 0; step <= steps; step++) {
      const t = step / steps; // Interpolation parameter (0 to 1)
      const morphedChain = this._interpolateChains(alignment, t);
      const sketchCode = this._chainToCode(morphedChain);

      // Validate the generated sketch
      if (this._validateSketch(sketchCode)) {
        morphSteps.push({
          step,
          t,
          code: sketchCode,
          chain: morphedChain,
        });
      }
    }

    return morphSteps;
  }

  /**
   * Align two chains for interpolation, handling different lengths and function types
   */
  _alignChains (chainA, chainB) {
    const maxLength = Math.max(chainA.length, chainB.length);
    const alignment = [];

    for (let i = 0; i < maxLength; i++) {
      const funcA = chainA[i] || null;
      const funcB = chainB[i] || null;

      if (funcA && funcB) {
        // Both chains have functions at this position
        if (funcA.metadata.type === funcB.metadata.type) {
          // Same type - direct interpolation
          alignment.push({ type: 'interpolate', funcA, funcB });
        } else {
          // Different types - transition
          alignment.push({ type: 'transition', funcA, funcB });
        }
      } else if (funcA) {
        // Only chain A has a function - fade out
        alignment.push({ type: 'fadeOut', func: funcA });
      } else if (funcB) {
        // Only chain B has a function - fade in
        alignment.push({ type: 'fadeIn', func: funcB });
      }
    }

    return alignment;
  }

  /**
   * Interpolate between aligned chains at parameter t (0 to 1)
   */
  _interpolateChains (alignment, t) {
    const morphedChain = [];

    alignment.forEach(alignItem => {
      switch (alignItem.type) {
        case 'interpolate':
          morphedChain.push(this._interpolateFunctions(alignItem.funcA, alignItem.funcB, t));
          break;
        case 'transition':
          morphedChain.push(this._transitionFunctions(alignItem.funcA, alignItem.funcB, t));
          break;
        case 'fadeOut':
          if (t < 0.5) {
            const fadeT = 1 - (t * 2);
            morphedChain.push(this._fadeFunctionOut(alignItem.func, fadeT));
          }
          break;
        case 'fadeIn':
          if (t > 0.5) {
            const fadeT = (t - 0.5) * 2;
            morphedChain.push(this._fadeFunctionIn(alignItem.func, fadeT));
          }
          break;
      }
    });

    return morphedChain;
  }

  /**
   * Interpolate between two functions of the same type
   */
  _interpolateFunctions (funcA, funcB, t) {
    const maxArgs = Math.max(funcA.args.length, funcB.args.length);
    const morphedArgs = [];

    for (let i = 0; i < maxArgs; i++) {
      const argA = funcA.args[i];
      const argB = funcB.args[i];

      if (argA && argB && argA.type === 'literal' && argB.type === 'literal') {
        // Interpolate between numeric literals
        if (typeof argA.value === 'number' && typeof argB.value === 'number') {
          morphedArgs.push({
            type: 'literal',
            value: this._lerp(argA.value, argB.value, t),
          });
        } else {
          // Non-numeric literals - switch at midpoint
          morphedArgs.push(t < 0.5 ? argA : argB);
        }
      } else if (argA && argB) {
        // Different types or complex expressions - switch at midpoint
        morphedArgs.push(t < 0.5 ? argA : argB);
      } else {
        // One argument missing - include the existing one
        morphedArgs.push(argA || argB);
      }
    }

    return {
      name: funcA.name, // Keep the function name (should be the same for interpolation)
      args: morphedArgs,
      metadata: funcA.metadata,
    };
  }

  /**
   * Transition between two functions of different types
   */
  _transitionFunctions (funcA, funcB, t) {
    if (t < 0.5) {
      // First half: use function A with diminishing effect
      return this._modifyFunctionIntensity(funcA, 1 - (t * 2));
    } else {
      // Second half: use function B with increasing effect
      return this._modifyFunctionIntensity(funcB, (t - 0.5) * 2);
    }
  }

  /**
   * Fade out a function by reducing its intensity
   */
  _fadeFunctionOut (func, intensity) {
    return this._modifyFunctionIntensity(func, intensity);
  }

  /**
   * Fade in a function by increasing its intensity
   */
  _fadeFunctionIn (func, intensity) {
    return this._modifyFunctionIntensity(func, intensity);
  }

  /**
   * Modify a function's intensity/effect strength
   */
  _modifyFunctionIntensity (func, intensity) {
    const modifiedArgs = func.args.map((arg, index) => {
      if (arg.type === 'literal' && typeof arg.value === 'number') {
        const metadata = func.metadata.inputs && func.metadata.inputs[index];
        if (metadata && this._isIntensityParameter(metadata.name)) {
          return {
            type: 'literal',
            value: arg.value * intensity,
          };
        }
      }
      return arg;
    });

    return {
      name: func.name,
      args: modifiedArgs,
      metadata: func.metadata,
    };
  }

  /**
   * Check if a parameter name represents an intensity/effect strength
   */
  _isIntensityParameter (paramName) {
    const intensityParams = ['amount', 'strength', 'intensity', 'scale', 'contrast', 'brightness'];
    return intensityParams.includes(paramName.toLowerCase());
  }

  /**
   * Convert a function chain back to Hydra code
   */
  _chainToCode (chain) {
    if (chain.length === 0) return '';

    let code = '';

    chain.forEach((func, index) => {
      if (index === 0) {
        // First function (source)
        code = func.name;
      } else {
        // Chained function
        code += `.${func.name}`;
      }

      // Add arguments if any
      if (func.args && func.args.length > 0) {
        const argStrings = func.args.map(arg => {
          switch (arg.type) {
            case 'literal':
              return typeof arg.value === 'string' ? `"${arg.value}"` : String(arg.value);
            case 'function':
            case 'expression':
              return arg.code;
            default:
              return '0';
          }
        });
        code += `(${argStrings.join(', ')})`;
      } else if (index > 0) {
        // Chained functions need parentheses even if no args
        code += '()';
      }
    });

    // Ensure the chain ends with .out()
    if (!code.includes('.out(')) {
      code += '.out()';
    }

    return code;
  }

  /**
   * Validate that a generated sketch is syntactically correct
   */
  _validateSketch (sketchCode) {
    try {
      Parser.parse(sketchCode, { ecmaVersion: 'latest' });
      return true;
    } catch (error) {
      console.warn('Generated invalid sketch:', sketchCode, error.message);
      return false;
    }
  }

  /**
   * Linear interpolation utility
   */
  _lerp (a, b, t) {
    return a + (b - a) * t;
  }
}

export { HydraSketchMorpher };
