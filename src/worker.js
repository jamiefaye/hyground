import * as Comlink from "comlink";

const obj = {
  counter: 0,
  inc() {
    this.counter++;
  },
};

const kindXMap = new Map();
const namesByKind = new Map();
const callbackTab = new Map();

class MsgBroker {

	constructor() {

	}

	assignName(kind) {
		if (!kindXMap.has(kind)) {
			kindXMap.set(kind, 0);
		}
		let v = kindXMap.get(kind);
		kindXMap.set(kind, v + 1);
		let vs = kind + v;
		
		if (!namesByKind.has(kind)) {
			namesByKind.set(kind, []);
		}
		namesByKind.get(kind).push(vs);
		return vs;
	}

	registerCallback(name, cb) {
		callbackTab.set(name, cb);
	}

	callback(name, msg, arg1, arg2) {
		let cb = callbackTab.get(name);
		return cb(msg, arg1, arg2);
	}

	listForKind(kind) {
		if (namesByKind.has(kind))
			return namesByKind.get(kind);
		else return [];
	}

	dropAndNotify(name, kindToDrop, kindToNotify) {
		callbackTab.delete(name);
		if (namesByKind.has(kindToDrop)) {
			let ka = namesByKind.get(kindToDrop);
			let dropX = ka.indexOf(name);
			if (dropX >= 0) {
			   ka.splice(dropX, 1);
			}
			if (namesByKind.has(kindToNotify)) {
				let kn = namesByKind.get(kindToNotify);
				for (let i = 0; i < kn.length; ++i) {
					let nameToTell = kn[i];
					this.callback(nameToTell, "drop", name, kindToDrop);
				}
			}
		}
	} // method
} // class

let ourBroker = new MsgBroker();

 addEventListener("connect", (event) => {
 		 Comlink.expose(ourBroker, event.ports[0]);
 	});


export {MsgBroker};