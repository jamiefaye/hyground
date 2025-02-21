	import * as Comlink from "comlink";


async function openMsgBroker() {
	let url = new URL('./worker.js', import.meta.url);
    const worker = new SharedWorker(url, { type: 'module'});
    const broker = Comlink.wrap(worker.port);
    return broker;
  }

  export {openMsgBroker};
