import * as Comlink from "comlink";
import HydraSynth from "hydra-synth";
import {BGHydraSynth} from "./BGHydra-synth.js";

import {Deglobalize} from './Deglobalize.js';

const GeneratorFunction = function* () {}.constructor;


class BGR {
  constructor() {
    //this.callbackTab = new Map();
    
    
    if (!(typeof self !== "undefined" && self.constructor && self.constructor.name === "DedicatedWorkerGlobalScope")) {
    	this.isWebWorker = false;
		} else {
    	this.isWebWorker = true;
		}
  } 

	destroy() {
		if (this._h) {
			this._h._destroy();
		}
	}
		

  registerCallback(name, cb) {
		if (name === 'frame') {
			this.frameCB = cb;
		} else if (name === 'proxy') {
			this.proxyCB = cb;
		}
	}


	async openHydra() {
			if (this.h === undefined) {
			this.can = new OffscreenCanvas(1920, 1080);
    	this.h = new BGHydraSynth({ worker: this, makeGlobal: false, canvas: this.can, autoloop: false, detectAudio: false, enableStreamCapture: false }).synth;
    	console.log("BGHydraSynth created: " + this.h);
    }
	}


  async setSketch(inStr) {
  	if (!this.h) return;
  	let str;
  	let errFound = "";
  	try {
  		str = Deglobalize(inStr, "_h");
  	} catch (err) {
  		errFound = err;
  		console.log("Deglobalize error " + err);
  		str = inStr;
  	}
  	let keys = Object.keys(this.h);
    let values = [];
    for (let i = 0; i < keys.length; ++i) values.push(this.h[keys[i]]);
    keys.push("h");
    values.push(this.h);
    keys.push("_h"); // _h used for fixing-up primitive-valued 'global' references, like "time".
    values.push(this.h);
  
    let fn = new GeneratorFunction(...keys, str);
    this.h.generator = fn(...values);
    this.stopEarlierTimer();
    let reply = this.h.generator.next();
    this.planNext(reply);
    return errFound;
  }


 stopEarlierTimer() {
	if(this.timeOutKey !== undefined) {
		clearTimeout(this.timeOutKey);
		this.timeOutKey = undefined;
	}
}

 generatorTick() {
	if (!this.h || !this.h.generator) return;
	let f = this.h.generator;
	let reply = f.next();
	this.planNext(reply);
}

 planNext(reply) {
	 if (!reply) return;

   if (!reply.done) {
    		let wT = reply.value;
    		if (wT === undefined) {
    			wT = 10;
    		} else {
    			wT = wT * 1000; // Convert to ms.
    		}
    		let that = this;
    		this.timeOutKey = setTimeout(()=>that.generatorTick(), wT);
    } else {
    		delete this.h.generator;
    		this.timeOutKey = undefined;
    }
}
  async hush() {
  	 if (!this.h) return;
  	 this.h.hush();
  }
  
	async tick(dt, mouseData, timeV) {
		if (this.h) {
				if (mouseData && this.isWebWorker) {
					this.h.mouse.x = mouseData.x;
					this.h.mouse.y = mouseData.y;
				}
				//this.h.time+= (dt / 1000.0);
				this.h.tick(dt);
				if (this.frameCB) {
					let fr = this.can.transferToImageBitmap();
					if (this.isWebWorker) {
						this.frameCB(Comlink.transfer(fr, [fr]));
					} else {
						this.frameCB(fr);
					}
				}
		}
	}

	getFrameData() {
		let img = this.can.transferToImageBitmap();
		return img;
	}

	async openSourceProxy(kind, sourceX, mediaAddr, params) {
		// Forward open proxy request via proxy callback to the HydraStage
		if (this.proxyCB) {
			this.proxyCB(kind, sourceX, mediaAddr, params);
		} else {
			console.log("No proxy callback registered.");
		}
	}

	async proxyFrameUpdate(sourceX, img) {
		let h = this.h;
		if (h) {
			let sName = 's' + sourceX;
			let st = h[sName];
			st.injectImage(img);
		} else {
			console.log("No hydra to update in BGRWorker");
		}
	}
}
export {BGR}
