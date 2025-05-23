// This came from a project by:
// Ale Cominotti - 2020.
// https://github.com/alecominotti/hydracodegenerator.

// It was converted from Python using:
// https://www.codeconvert.ai/python-to-javascript-converter
// mistakes belong to jamie (at) fentonia.com


//   let r = reactive({minValue: 0, // Set your minValue
// maxValue: 100, // Set your maxValue
// arrowFunctionProb: 10, // Set your arrowFunctionProb
// mouseFunctionProb: 0, // Set your mouseFunctionProb
// mouseFunctionProb: 0, // Probabilities of generating an arrow function that uses mouse position (ex.: ():> mouse.x)
// modulateItselfProb: 20, // Probabilities of generating a modulation function with "o0" as argument (ex.: modulate(o0,1))
// exclusiveSourceList: [],
// exclusiveFunctionList: [],
// ignoredList: ["solid", "brightness", "luma", "invert", "posterize", "thresh", "layer", "modulateScrollX", "modulateScrollY"] });

class RandomHydra {
    constructor(r) {
        this.info = `// Random Hydra  (by alecominotti's generator).
`
        this.r = r; // r tracks the reactive state manipulated by this class.

        this.mathFunctions = ['sin', 'cos', 'tan']; // Add your math functions
        this.mouseList = ['mouseX', 'mouseY']; // Add your mouse functions

        this.mathFunctions = ["sin", "cos", "tan"];
        this.sourcesList = ["gradient", "noise", "osc", "shape", "solid", "voronoi"];
        this.colorList = ["brightness", "contrast", "color", "colorama", "invert", "luma", "posterize", "saturate", "thresh"];
        this.geometryList = ["kaleid", "pixelate", "repeat", "repeatX", "repeatY", "rotate", "scale", "scrollX", "scrollY"];
        this.modulatorsList = ["modulate", "modulateHue", "modulateKaleid", "modulatePixelate", "modulateRepeat", "modulateRepeatX", "modulateRepeatY", "modulateRotate", "modulateScale", "modulateScrollX", "modulateScrollY"];
        this.operatorsList = ["add", "blend", "diff", "layer", "mask", "mult"];
        this.functionsList = ["genColor", "genGeometry", "genModulator", "genOperator"];
    }

    getAllElements() {
      return this.colorList.concat(this.geometryList, this.modulatorsList , this.operatorsList);
    }

    truncate(number, digits) {
        const stepper = Math.pow(10, digits);
        return Math.trunc(stepper * number) / stepper;
    }

    isIgnored(chosen) {
        return this.r.ignoredList.map(x => x.toLowerCase()).includes(chosen.toLowerCase());
    }

    isExclusiveSource(chosen) {
        if (this.r.exclusiveSourceList.length === 0) {
            return true;
        } else {
            return this.r.exclusiveSourceList.map(x => x.toLowerCase()).includes(chosen.toLowerCase());
        }
    }

    isExclusiveFunction(chosen) {
        if (this.r.exclusiveFunctionList.length === 0) {
            return true;
        } else {
            return this.r.exclusiveFunctionList.map(x => x.toLowerCase()).includes(chosen.toLowerCase());
        }
    }

    checkSources(inputSourcesList) {
        return inputSourcesList.every(source => this.sourcesList.includes(source));
    }

    checkFunctions(inputFunctionsList) {
        const allFunctions = [...this.colorList, ...this.geometryList, ...this.modulatorsList, ...this.operatorsList];
        return inputFunctionsList.every(func => allFunctions.includes(func));
    }

    printError(message) {
        console.log("ERROR: " + message);
    }

    genNormalValue() {
        const randomTruncate = Math.floor(Math.random() * 4);
        const val = this.truncate(Math.random() * (this.r.maxValue - this.r.minValue) + this.r.minValue, randomTruncate);
        return String(val);
    }

    genArrowFunctionValue() {
        const randomTimeMultiplier = this.truncate(Math.random() * (1 - 0.1) + 0.1, Math.floor(Math.random() * 2) + 1);
        // probabilities of generating an arrow function
        if (Math.floor(Math.random() * 100) + 1 <= this.r.arrowFunctionProb) {
            return `() => Math.${this.mathFunctions[Math.floor(Math.random() * this.mathFunctions.length)]}(time * ${randomTimeMultiplier})`;
        }
        // probabilities of generating a mouse function
        if (Math.floor(Math.random() * 100) + 1 <= this.r.mouseFunctionProb) {
            return `() => ${this.mouseList[Math.floor(Math.random() * this.mouseList.length)]} * ${randomTimeMultiplier}`;
        }
        return "";
    }

    genValue() {  // generates a number, mouse, or math functions
        const arrow = this.genArrowFunctionValue();
        if (arrow !== "") {
            return arrow;
        } else {
            return this.genNormalValue();
        }
    }

    genPosOrNegValue() { // generates a normal number with 1/5 possibilities of being negative
        const arrow = this.genArrowFunctionValue();
        if (arrow !== "") {
            return arrow;
        } else if (Math.floor(Math.random() * 5) + 1 === 5) {
            return "-" + this.genNormalValue();
        } else {
            return this.genNormalValue();
        }
    }

    genCeroOneValue() {  // generates a number between 0 and 1
        const arrow = this.genArrowFunctionValue();
        if (arrow !== "") {
            return arrow;
        } else {
            return String(this.truncate(Math.random(), 1));
        }
    }

    genCeroPointFiveValue() {  // generates a number between 0 and 0.5
        const arrow = this.genArrowFunctionValue();
        if (arrow !== "") {
            return arrow;
        } else {
            return String(this.truncate(Math.random() * 0.5, 2));
        }
    }

    genCeroPointOneToMax() {  // generates a number between 0.1 and maxValue
        const arrow = this.genArrowFunctionValue();
        if (arrow !== "") {
            return arrow;
        } else {
            return String(this.truncate(Math.random() * (this.r.maxValue - 0.1) + 0.1, 2));
        }
    }

    genCeroPointOneToOne() {  // generates a number between 0.1 and 1
        const arrow = this.genArrowFunctionValue();
        if (arrow !== "") {
            return arrow;
        } else {
            return String(this.truncate(Math.random() * (1 - 0.1) + 0.1, 2));
        }
    }

    generateCode(minFunctions, maxFunctions) {
        const functionsAmount = Math.floor(Math.random() * (maxFunctions - minFunctions + 1)) + minFunctions;
        let code = "";
        code += this.info;
        code += this.genSource() + "\n";
        for (let x = 0; x < functionsAmount; x++) {
            code += '  ' + this.genFunction() + "\n";
        }
        code += ".out(o0)";
        return code;
    }

    genSource() {  // returns a source calling one of them randomly
        let srcs = this.randomChoice(this.sourcesList);
        let f = this[srcs].bind(this);
        let fullSource = f();
        let source = fullSource.split("(")[0]; // just source name
        const start = Date.now(); // avoids failing when everything is ignored
        while ((!this.isExclusiveSource(source) || this.isIgnored(source)) && (Date.now() < (start + 10000))) {
            fullSource = this[this.randomChoice(this.sourcesList)]();
            source = fullSource.split("(")[0];
        }
        if (Date.now() >= (start + 15000)) {
            this.printError("Could't generate a Source (You ignored all of them)");
            process.exit(1);
        } else {
            return fullSource;
        }
    }

    genFunction() {  // returns a function calling one of them randomly
        let fullFunction = this[this.randomChoice(this.functionsList)]();
        let functionName = fullFunction.slice(1).split("(")[0]; // just its name
        const start = Date.now(); // avoids failing when everything is ignored
        while ((!this.isExclusiveFunction(functionName) || this.isIgnored(functionName)) && (Date.now() < (start + 10000))) {
            fullFunction = this[this.randomChoice(this.functionsList)]();
            functionName = fullFunction.slice(1).split("(")[0];
        }
        if (Date.now() >= (start + 15000)) {
            console.error("\nERROR: Could't generate a Function (You ignored all of them)");
            process.exit(1);
        } else {
            return fullFunction;
        }
    }

    // FUNCTION METHODS ---

    genColor() {  // returns a color function calling one of them randomly
        return this[this.randomChoice(this.colorList)]();
    }

    genGeometry() {  // returns a geometry function calling one of them randomly
        return this[this.randomChoice(this.geometryList)]();
    }

    genModulator() {  // returns a geometry function calling one of them randomly
        return this[this.randomChoice(this.modulatorsList)]();
    }

    genOperator() {  // returns an operator function calling one of them randomly
        return this[this.randomChoice(this.operatorsList)]();
    }


// SOURCES ---

gradient() {
    return "gradient(" + this.genValue() + ")";
}

noise() {
    return "noise(" + this.genValue() + ", " + this.genValue() + ")";
}

osc() {
    return "osc(" + this.genValue() + ", " + this.genValue() + ", " + this.genValue() + ")";
}

shape() {
    return "shape(" + this.genValue() + ", " + this.genCeroPointFiveValue() + ", " + this.genCeroPointOneToOne() + ")";
}

solid() {
    return "solid(" + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ", " + this.genCeroPointOneToMax() + ")";
}

voronoi() {
    return "voronoi(" + this.genValue() + ", " + this.genValue() + ", " + this.genCeroOneValue() + ")";
}

// END SOURCES ---


// COLOR ---

brightness() {
    return ".brightness(" + this.genCeroOneValue() + ")";
}

contrast() {
    return ".contrast(" + this.genCeroPointOneToMax() + ")";
}

color() {
    return ".color(" + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
}

colorama() {
    return ".colorama(" + this.genValue() + ")";
}

invert() {
    return ".invert(" + this.genCeroOneValue() + ")";
}

luma() {
    return ".luma(" + this.genCeroOneValue() + ")";
}

posterize() {
    return ".posterize(" + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
}

saturate() {
    return ".saturate(" + this.genValue() + ")";
}

thresh() {
    return ".thresh(" + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
}

// ENDCOLOR ---


// GEOMETRY ---

kaleid() {
    return ".kaleid(" + this.genValue() + ")";
}

pixelate() {
    return ".pixelate(" + this.genCeroPointOneToMax() + ", " + this.genCeroPointOneToMax() + ")";
}

repeat() {
    return ".repeat(" + this.genValue() + ", " + this.genValue() + ", " + this.genValue() + ", " + this.genValue() + ")";
}

repeatX() {
    return ".repeatX(" + this.genValue() + ", " + this.genValue() + ")";
}

repeatY() {
    return ".repeatY(" + this.genValue() + ", " + this.genValue() + ")";
}

rotate() {
    return ".rotate(" + this.genValue() + ", " + this.genValue() + ")";
}

scale() {
    return ".scale(" + this.genPosOrNegValue() + ", " + this.genCeroPointOneToOne() + ", " + this.genCeroPointOneToOne() + ")";
}

scrollX() {
    return ".scrollX(" + this.genValue() + ", " + this.genValue() + ")";
}

scrollY() {
    return ".scrollY(" + this.genValue() + ", " + this.genValue() + ")";
}

// ENDGEOMETRY ---




    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    modulate() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulate(o0, " + this.genValue() + ")";
        } else {
            return ".modulate(" + this.genSource() + ", " + this.genValue() + ")";
        }
    }

    modulateHue() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateHue(o0, " + this.genValue() + ")";
        } else {
            return ".modulateHue(" + this.genSource() + ", " + this.genValue() + ")";
        }
    }

    modulateKaleid() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateKaleid(o0, " + this.genValue() + ")";
        } else {
            return ".modulateKaleid(" + this.genSource() + ", " + this.genValue() + ")";
        }
    }

    modulatePixelate() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulatePixelate(o0, " + this.genValue() + ")";
        } else {
            return ".modulatePixelate(" + this.genSource() + ", " + this.genValue() + ")";
        }
    }

    modulateRepeat() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateRepeat(o0, " + this.genValue() + ", " + this.genValue() + ", " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
        } else {
            return ".modulateRepeat(" + this.genSource() + ", " + this.genValue() + ", " + this.genValue() + ", " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
        }
    }

    modulateRepeatX() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateRepeatX(o0, " + this.genValue() + ", " + this.genCeroOneValue() + ")";
        } else {
            return ".modulateRepeatX(" + this.genSource() + ", " + this.genValue() + ", " + this.genCeroOneValue() + ")";
        }
    }

    modulateRepeatY() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateRepeatY(o0, " + this.genValue() + ", " + this.genCeroOneValue() + ")";
        } else {
            return ".modulateRepeatY(" + this.genSource() + ", " + this.genValue() + ", " + this.genCeroOneValue() + ")";
        }
    }

    modulateRotate() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateRotate(o0, " + this.genValue() + ")";
        } else {
            return ".modulateRotate(" + this.genSource() + ", " + this.genValue() + ")";
        }
    }

    modulateScale() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateScale(o0, " + this.genValue() + ")";
        } else {
            return ".modulateScale(" + this.genSource() + ", " + this.genValue() + ")";
        }
    }

    modulateScrollX() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateScrollX(o0, " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
        } else {
            return ".modulateScrollX(" + this.genSource() + ", " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
        }
    }

    modulateScrollY() {
        if (Math.floor(Math.random() * 100) + 1 <= this.r.modulateItselfProb) {
            return ".modulateScrollY(o0, " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
        } else {
            return ".modulateScrollY(" + this.genSource() + ", " + this.genCeroOneValue() + ", " + this.genCeroOneValue() + ")";
        }
    }

    // END MODULATORS ---

    // OPERATORS ---

    add() {
        return ".add(" + this.genSource() + ", " + this.genCeroOneValue() + ")";
    }

    blend() {
        return ".blend(" + this.genSource() + ", " + this.genCeroOneValue() + ")";
    }

    diff() {
        return ".diff(" + this.genSource() + ")";
    }

    layer() {
        return ".layer(" + this.genSource() + ")";
    }

    mask() {
        return ".mask(" + this.genSource() + ", " + this.genValue() + ", " + this.genCeroOneValue() + ")";
    }

    mult() {
        return ".mult(" + this.genSource() + ", " + this.genCeroOneValue() + ")";
    }

    // END OPERATORS ---
}


export {RandomHydra}