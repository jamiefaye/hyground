import * as Comlink from "comlink";
import Hydra from "hydra-synth";
  
class BGRWorker {
  constructor(init = 0) {
    console.log(init);
    this._counter = init;
    this.callbackTab = new Map();
  }

  get counter() {
    return this._counter;
  }

  increment(delta = 1) {
    this._counter += delta;
  }

  registerCallback(name, cb) {
		this.callbackTab.set(name, cb);
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
			this.can = new OffscreenCanvas(1280, 720);
    	this.h = new Hydra({ makeGlobal: false, canvas: this.can, autoloop: false, detectAudio: false, enableStreamCapture: false }).synth;
    	console.log("Hydra created: " + this.h);
    }
	}

  async setSketch(str) {
  	if (!this.h) return;
  	let keys = Object.keys(this.h);
    let values = [];
    for (let i = 0; i < keys.length; ++i) values.push(this.h[keys[i]]);
    keys.push("h");
    values.push(this.h);
    let fn = new Function(...keys, str);
    fn(...values);
  }
  
  
	async tick(dt) {
		if (this.h) {
				this.h.tick(dt);
		}
	}
	
	getFrameData() {
		let img = this.can.transferToImageBitmap();
		return img;
	}
}

Comlink.expose(BGRWorker);