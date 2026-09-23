import { Parser } from 'acorn';
import { generate } from 'astring';
import { attachComments, defaultTraveler, makeTraveler } from 'astravel';
import { hydraFunctions } from './hydra-functions.js';

class Mutator {
  constructor () {
    this.initialVector = [];

    this.funcTab = {};
    this.transMap = {};
    this.scanFuncs();
    //  this.dumpDict();
  }

  dumpList () {
    const hydraTab = hydraFunctions;
    hydraTab.forEach (v => {
      let argList = '';
      v.inputs.forEach(a => {
        if (argList != '') argList += ', ';
        const argL = a.name + ': ' + a.type + ' {' + a.default + '}';
        argList = argList + argL;
      });
      console.log(v.name + ' [' + v.type + '] ('+ argList + ')');
    });
  }

  scanFuncs () {
    const hydraTab = hydraFunctions;
    hydraTab.forEach (f => {
      this.transMap[f.name] = f;
      if (this.funcTab[f.type] === undefined) {this.funcTab[f.type] = []}
      this.funcTab[f.type].push(f);
    });
  }

  dumpDict () {
    for(const tn in this.funcTab)
    {
      this.funcTab[tn].forEach(f => {
        let argList = '';
        f.inputs.forEach(a => {
          if (argList != '') argList += ', ';
          const argL = a.name + ': ' + a.type + ' {' + a.default + '}';
          argList = argList + argL;
        });
        console.log(f.name + ' [' + f.type + '] ('+ argList + ')');
      });
    }
  }

  mutate (options, text) {
    const needToRun = true;
    let tryCounter = 5;
    while (needToRun && tryCounter-- >= 0) {
      // Parse to AST
      const comments = [];
      const ast = Parser.parse(text, {
        locations: true,
        ecmaVersion: 'latest',
        allowAwaitOutsideFunction: true,   // sketches may await (loadGlb, ...) and return at top level
        allowReturnOutsideFunction: true,
        onComment: comments }
      );

      // Modify the AST.
      this.transform(ast, options);

      // Put the comments back.
      attachComments(ast, comments);

      // Generate JS from AST and return value
      const regen = generate(ast, { comments: true });

      return regen;
    }
    return text; // give up, return unchanged.
  }


  // The options object contains a flag that controls how the
  // Literal to mutate is determined. If reroll is false, we
  // pick one at random. If reroll is true, we use the same field
  // we did last time.
  transform (ast, options) {
    // Walk the tree for the dice's two tables. A numeric literal counts only where it is an argument
    // (however deep: inside an arrow, an array or an arithmetic expression) of a Hydra function, so
    // out()'s level, setResolution(), initCam(1) and .fast(0.1) are never rerolled. A subscript
    // (o[1]) is not a literal to roll. The function table holds the method calls that are Hydra
    // functions (sources at the head of a chain stay what they are), so a transform always has a
    // type to change within.
    const SKIP = new Set(['type', 'start', 'end', 'loc', 'range']);
    const nameOf = callee => callee.type === 'Identifier' ? callee.name
      : (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' ? callee.property.name : null);
    const state = { literalTab: [], functionTab: [] };
    const visit = (node, inHydra) => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'Literal') { if (inHydra && typeof node.value === 'number') state.literalTab.push(node); return; }
      if (node.type === 'MemberExpression') { visit(node.object, inHydra); if (node.computed && node.property.type !== 'Literal') visit(node.property, inHydra); return; }
      if (node.type === 'CallExpression') {
        const name = nameOf(node.callee);
        const hydra = !!(name && this.transMap[name]);
        if (hydra && node.callee.type === 'MemberExpression') state.functionTab.push(node);
        visit(node.callee, inHydra);
        node.arguments.forEach(arg => visit(arg, hydra));
        return;
      }
      for (const key of Object.keys(node)) {
        if (SKIP.has(key)) continue;
        const child = node[key];
        if (Array.isArray(child)) child.forEach(ch => visit(ch, inHydra));
        else if (child && typeof child.type === 'string') visit(child, inHydra);
      }
    };
    visit(ast, false);

    this.litCount = state.literalTab.length;
    this.funCount = state.functionTab.length;
    // The initial values (what a reroll is relative to) belong to a sketch shape, not a literal count:
    // a new sketch with the same number of constants gets its own
    const shape = generate(ast).replace(/\d+(\.\d+)?/g, '#');
    if (shape !== this.shape) {
      this.shape = shape;
      this.initialVector = state.literalTab.map(n => n.value);
    }
    if (options.changeTransform) {
      this.glitchTrans(state, options);
    }
    else this.glitchLiteral(state, options);

  }

  glitchLiteral (state, options)
  {
    let litx = 0;
    if (options.reroll) {
      if (this.lastLitX !== undefined) {
        litx = this.lastLitX;
      }
    } else {
      litx = Math.floor(Math.random() * this.litCount);
      this.lastLitX = litx;
    }

    const modLit = state.literalTab[litx];
    if (modLit) {
      // let glitched = this.glitchNumber(modLit.value);
      const glitched = this.glitchRelToInit(modLit.value, this.initialVector[litx]);
      const was = modLit.raw;
      modLit.value = glitched;
      modLit.raw = '' + glitched;
      console.log('Literal: ' + litx + ' changed from: ' + was + ' to: ' + glitched);
    }
  }

  glitchNumber (num) {
    if (num === 0) {
      num = 1;
    }
    const range = num * 2;
    const rndVal = Math.round(Math.random() * range * 1000) / 1000;
    return rndVal;
  }

  glitchRelToInit (num, initVal) {
    if (initVal === undefined) {
      return glitchNumber(num);
    } if (initVal === 0) {
      initVal = 0.5;
    }

    const rndVal = Math.round(Math.random() * initVal * 2 * 1000) / 1000;
    return rndVal;
  }
  glitchTrans (state, options)
  {
    const funx = Math.floor(Math.random() * this.funCount);
    if (state.functionTab[funx] === undefined || state.functionTab[funx].callee === undefined || state.functionTab[funx].callee.property === undefined) {
      console.log('No valid functionTab for index: ' + funx);
      return;
    }
    const oldName = state.functionTab[funx].callee.property.name;

    if (oldName == undefined) {
      console.log('No name for callee');
      return;
    }
    const ftype = this.transMap[oldName] && this.transMap[oldName].type;
    if (ftype == undefined) {
      console.log('ftype undefined for: ' + oldName);
      return;
    }
    const others = this.funcTab[ftype];
    if (others == undefined) {
      console.log('no funcTab entry for: ' + ftype);
      return;
    }
    const changeX = Math.floor(Math.random() * others.length);
    const become = others[changeX].name;

    // check blacklisted combinations.
    if (oldName === 'modulate' && become === 'modulateScrollX')
    {
      console.log('Function: ' + funx + ' changing from: ' + oldName + " can't change to: " + become);
      return;
    }

    state.functionTab[funx].callee.property.name = become;
    console.log('Function: ' + funx + ' changed from: ' + oldName + ' to: ' + become);
  }

} //  End of class Mutator.

export { Mutator }
