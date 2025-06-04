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
    // An AST traveler that accumulates a list of Literal nodes.
    const traveler = makeTraveler({
      go (node, state) {
        if (node.type === 'Literal') {
          state.literalTab.push(node);
        } else if (node.type === 'MemberExpression') {
          if (node.property && node.property.type === 'Literal') {
            // numeric array subscripts are ineligable
            return;
          }
        } else if (node.type === 'CallExpression') {
          if (node.callee && node.callee.property && node.callee.property.name && node.callee.property.name !== 'out') {
            state.functionTab.push(node);
          }
        }
        // Call the parent's `go` method
        this.super.go.call(this, node, state);
      },
    });

    const state = {};
    state.literalTab = [];
    state.functionTab = [];

    traveler.go(ast, state);

    this.litCount = state.literalTab.length;
    this.funCount = state.functionTab.length;
    if (this.litCount !== this.initialVector.length) {
      const nextVect = [];
      for(let i = 0; i < this.litCount; ++i) {
        nextVect.push(state.literalTab[i].value);
      }
      this.initialVector = nextVect;
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
    const ftype = this.transMap[oldName].type;
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
