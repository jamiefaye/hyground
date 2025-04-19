import * as Comlink from "comlink";
import {BGRWorkerCode} from 'hydra-synth';
let BGRWorker = BGRWorkerCode;
Comlink.expose(BGRWorker);
export {BGRWorker}
