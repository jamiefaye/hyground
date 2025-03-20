import * as Comlink from "comlink";

import {BGR} from './BGR.js';

let BGRWorker = BGR;

Comlink.expose(BGRWorker);
