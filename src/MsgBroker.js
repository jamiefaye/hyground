	import * as Comlink from "comlink";


class MsgBrokerClass {
	constructor () {
		this.worker = new SharedWorker(new URL('./worker.js', import.meta.url), { type: 'module'});
		this.broker = Comlink.wrap(this.worker.port);
	}

	async registerCallback(name, cb) {
		await this.broker.registerCallback(name, Comlink.proxy(cb));
	}
	
	async register(myKind, otherKind, callback) {
		this.myKind = myKind;
		this.otherKind = otherKind;
		this.name = await this.broker.assignName(myKind);
		await this.registerCallback(this.name, callback);
		return this.name;
	}

	async dropAndNotify(other) {
		console.log (`drop and notify ${this.name} ${this.myKind} ${this.otherKind}`);
		await this.broker.dropAndNotify(this.name, this.myKind, other ? this.otherKind : this.myKind)
	}


	async locateTarget() {
		let list = await this.broker.listForKind(this.otherKind);
		if (list.length > 0) {
			this.targetView = list[list.length - 1];
			console.log("Target found: " + targetView);
		} else {
				console.log("Target not found");
		}
		return this.targetView;
	}

	async checkTarget() {
		let list = await this.broker.listForKind(this.otherKind);
		if (list.length > 0) {
			this.targetView = list[list.length - 1];
		}
		return this.targetView;
	}

	async lookForTarget() {
	console.log("lookForTarget");
		if (this.targetView === undefined) {
			await this.checkTarget();
			if (this.targetView === undefined) {
			  console.log("Target checking in 1 second.");
			  let that = this;
				setTimeout(()=>that.lookForTarget(), 1000);
			}
		}
		if (this.targetView === undefined) {
			console.log("Target undefined");
		}
	}
}

 
async function openMsgBroker(myKind, otherKind, callback) {
	let brokerObj = new MsgBrokerClass();
	await brokerObj.register(myKind, otherKind, callback);
	return brokerObj;
}

  export {MsgBrokerClass, openMsgBroker};
