import Hydra from "hydra-synth";
import {BGHydraSource} from "./BGHydra-source.js";

class BGHydraSynth extends Hydra {

  constructor (params) {
  	super(params);
  	// The "worker" field is not carried-over by the superclass, so we will have to go and stuff
  	// that value in after the creation of the sources has already happened.
  	for (let i = 0; i < this.s.length; ++i) {
  		this.s[i].worker = params.worker;
  	}
  }

/*
  _initSources (numSources) {
    this.s = []
    for(var i = 0; i < numSources; i++) {
      this.createSource(i)
    }
  }
*/

  createSource (i) {
    let s = new BGHydraSource({regl: this.regl, pb: this.pb, width: this.width, height: this.height, sourceX: i, label: `s${i}`})
    this.synth['s' + this.s.length] = s
    this.s.push(s)
    return s
  }

}


export {BGHydraSynth}
