	import * as Comlink from "comlink";


async function openMsgBroker() {
//new URL(new URL(	let url = new URL('./worker.js', import.meta.url);
   const worker = new SharedWorker(new URL('./worker.js', import.meta.url), { type: 'module'});

// The following is a hack to get hyground and hydra to launch the same shared worker:
// const worker = new SharedWorker('/../assets/worker.js', { type: 'module'});
    
    const broker = Comlink.wrap(worker.port);
    return broker;
  }

  export {openMsgBroker};
