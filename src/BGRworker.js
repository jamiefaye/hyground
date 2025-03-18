import * as Comlink from "comlink";
import HydraSynth from "hydra-synth";
import {BGHydraSynth} from "./BGHydra-synth.js";

import {Deglobalize} from './Deglobalize.js';

class BGRWorker {
  constructor() {
    this.callbackTab = new Map();
  }

  registerCallback(name, cb) {
		this.callbackTab.set(name, cb);
		if (name === 'frame') {
			this.frameCB = cb;
		} else if (name === 'proxy') {
			this.proxyCB = cb;
		}
	}

  setBuffer(buf) {
  	this.buffer = buf;
  //	console.log(this.buffer);
  }
 
  getBuffer() {
  	return this.buffer;
  }

	callback(name, msg, arg1, arg2) {
		let cb = this.callbackTab.get(name);
		return cb(msg, arg1, arg2);
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
    let fn = new Function(...keys, str);
    fn(...values);
    return errFound;
  }
  
  async hush() {
  	 if (!this.h) return;
  	 this.h.hush();
  }
  
	async tick(dt, mouseData, timeV) {
		if (this.h) {
				if (mouseData) {
					this.h.mouse.x = mouseData.x;
					this.h.mouse.y = mouseData.y;
				}
				//this.h.time+= (dt / 1000.0);
				this.h.tick(dt);
				if (this.frameCB) {
					let fr = this.can.transferToImageBitmap();
					this.frameCB(Comlink.transfer(fr, [fr]));
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

Comlink.expose(BGRWorker);