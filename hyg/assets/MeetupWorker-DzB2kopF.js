(function () {
  'use strict';
  /**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   */
  const proxyMarker = Symbol('Comlink.proxy');
  const createEndpoint = Symbol('Comlink.endpoint');
  const releaseProxy = Symbol('Comlink.releaseProxy');
  const finalizer = Symbol('Comlink.finalizer');
  const throwMarker = Symbol('Comlink.thrown');
  const isObject = val => typeof val === 'object' && val !== null || typeof val === 'function';
  const proxyTransferHandler = {
    canHandle: val => isObject(val) && val[proxyMarker],
    serialize (obj) {
      const { port1, port2 } = new MessageChannel();
      expose(obj, port1);
      return [port2, [port2]];
    },
    deserialize (port) {
      port.start();
      return wrap(port);
    },
  };
  const throwTransferHandler = {
    canHandle: value => isObject(value) && throwMarker in value,
    serialize ({ value }) {
      let serialized;
      if (value instanceof Error) {
        serialized = {
          isError: true,
          value: {
            message: value.message,
            name: value.name,
            stack: value.stack,
          },
        };
      } else {
        serialized = { isError: false, value };
      }
      return [serialized, []];
    },
    deserialize (serialized) {
      if (serialized.isError) {
        throw Object.assign(new Error(serialized.value.message), serialized.value);
      }
      throw serialized.value;
    },
  };
  const transferHandlers = /* @__PURE__ */ new Map([
    ['proxy', proxyTransferHandler],
    ['throw', throwTransferHandler],
  ]);
  function isAllowedOrigin (allowedOrigins, origin) {
    for (const allowedOrigin of allowedOrigins) {
      if (origin === allowedOrigin || allowedOrigin === '*') {
        return true;
      }
      if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
        return true;
      }
    }
    return false;
  }
  function expose (obj, ep = globalThis, allowedOrigins = ['*']) {
    ep.addEventListener('message', function callback (ev) {
      if (!ev || !ev.data) {
        return;
      }
      if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
        console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
        return;
      }
      const { id, type, path } = Object.assign({ path: [] }, ev.data);
      const argumentList = (ev.data.argumentList || []).map(fromWireValue);
      let returnValue;
      try {
        const parent = path.slice(0, -1).reduce((obj2, prop) => obj2[prop], obj);
        const rawValue = path.reduce((obj2, prop) => obj2[prop], obj);
        switch (type) {
          case 'GET':
            {
              returnValue = rawValue;
            }
            break;
          case 'SET':
            {
              parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
              returnValue = true;
            }
            break;
          case 'APPLY':
            {
              returnValue = rawValue.apply(parent, argumentList);
            }
            break;
          case 'CONSTRUCT':
            {
              const value = new rawValue(...argumentList);
              returnValue = proxy(value);
            }
            break;
          case 'ENDPOINT':
            {
              const { port1, port2 } = new MessageChannel();
              expose(obj, port2);
              returnValue = transfer(port1, [port1]);
            }
            break;
          case 'RELEASE':
            {
              returnValue = void 0;
            }
            break;
          default:
            return;
        }
      } catch (value) {
        returnValue = { value, [throwMarker]: 0 };
      }
      Promise.resolve(returnValue).catch(value => {
        return { value, [throwMarker]: 0 };
      }).then(returnValue2 => {
        const [wireValue, transferables] = toWireValue(returnValue2);
        ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
        if (type === 'RELEASE') {
          ep.removeEventListener('message', callback);
          closeEndPoint(ep);
          if (finalizer in obj && typeof obj[finalizer] === 'function') {
            obj[finalizer]();
          }
        }
      }).catch(error => {
        const [wireValue, transferables] = toWireValue({
          value: new TypeError('Unserializable return value'),
          [throwMarker]: 0,
        });
        ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
      });
    });
    if (ep.start) {
      ep.start();
    }
  }
  function isMessagePort (endpoint) {
    return endpoint.constructor.name === 'MessagePort';
  }
  function closeEndPoint (endpoint) {
    if (isMessagePort(endpoint))
      endpoint.close();
  }
  function wrap (ep, target) {
    const pendingListeners = /* @__PURE__ */ new Map();
    ep.addEventListener('message', function handleMessage (ev) {
      const { data } = ev;
      if (!data || !data.id) {
        return;
      }
      const resolver = pendingListeners.get(data.id);
      if (!resolver) {
        return;
      }
      try {
        resolver(data);
      } finally {
        pendingListeners.delete(data.id);
      }
    });
    return createProxy(ep, pendingListeners, [], target);
  }
  function throwIfProxyReleased (isReleased) {
    if (isReleased) {
      throw new Error('Proxy has been released and is not useable');
    }
  }
  function releaseEndpoint (ep) {
    return requestResponseMessage(ep, /* @__PURE__ */ new Map(), {
      type: 'RELEASE',
    }).then(() => {
      closeEndPoint(ep);
    });
  }
  const proxyCounter = /* @__PURE__ */ new WeakMap();
  const proxyFinalizers = 'FinalizationRegistry' in globalThis && new FinalizationRegistry(ep => {
    const newCount = (proxyCounter.get(ep) || 0) - 1;
    proxyCounter.set(ep, newCount);
    if (newCount === 0) {
      releaseEndpoint(ep);
    }
  });
  function registerProxy (proxy2, ep) {
    const newCount = (proxyCounter.get(ep) || 0) + 1;
    proxyCounter.set(ep, newCount);
    if (proxyFinalizers) {
      proxyFinalizers.register(proxy2, ep, proxy2);
    }
  }
  function unregisterProxy (proxy2) {
    if (proxyFinalizers) {
      proxyFinalizers.unregister(proxy2);
    }
  }
  function createProxy (ep, pendingListeners, path = [], target = function () {
  }) {
    let isProxyReleased = false;
    const proxy2 = new Proxy(target, {
      get (_target, prop) {
        throwIfProxyReleased(isProxyReleased);
        if (prop === releaseProxy) {
          return () => {
            unregisterProxy(proxy2);
            releaseEndpoint(ep);
            pendingListeners.clear();
            isProxyReleased = true;
          };
        }
        if (prop === 'then') {
          if (path.length === 0) {
            return { then: () => proxy2 };
          }
          const r = requestResponseMessage(ep, pendingListeners, {
            type: 'GET',
            path: path.map(p => p.toString()),
          }).then(fromWireValue);
          return r.then.bind(r);
        }
        return createProxy(ep, pendingListeners, [...path, prop]);
      },
      set (_target, prop, rawValue) {
        throwIfProxyReleased(isProxyReleased);
        const [value, transferables] = toWireValue(rawValue);
        return requestResponseMessage(ep, pendingListeners, {
          type: 'SET',
          path: [...path, prop].map(p => p.toString()),
          value,
        }, transferables).then(fromWireValue);
      },
      apply (_target, _thisArg, rawArgumentList) {
        throwIfProxyReleased(isProxyReleased);
        const last = path[path.length - 1];
        if (last === createEndpoint) {
          return requestResponseMessage(ep, pendingListeners, {
            type: 'ENDPOINT',
          }).then(fromWireValue);
        }
        if (last === 'bind') {
          return createProxy(ep, pendingListeners, path.slice(0, -1));
        }
        const [argumentList, transferables] = processArguments(rawArgumentList);
        return requestResponseMessage(ep, pendingListeners, {
          type: 'APPLY',
          path: path.map(p => p.toString()),
          argumentList,
        }, transferables).then(fromWireValue);
      },
      construct (_target, rawArgumentList) {
        throwIfProxyReleased(isProxyReleased);
        const [argumentList, transferables] = processArguments(rawArgumentList);
        return requestResponseMessage(ep, pendingListeners, {
          type: 'CONSTRUCT',
          path: path.map(p => p.toString()),
          argumentList,
        }, transferables).then(fromWireValue);
      },
    });
    registerProxy(proxy2, ep);
    return proxy2;
  }
  function myFlat (arr) {
    return Array.prototype.concat.apply([], arr);
  }
  function processArguments (argumentList) {
    const processed = argumentList.map(toWireValue);
    return [processed.map(v => v[0]), myFlat(processed.map(v => v[1]))];
  }
  const transferCache = /* @__PURE__ */ new WeakMap();
  function transfer (obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
  }
  function proxy (obj) {
    return Object.assign(obj, { [proxyMarker]: true });
  }
  function toWireValue (value) {
    for (const [name, handler] of transferHandlers) {
      if (handler.canHandle(value)) {
        const [serializedValue, transferables] = handler.serialize(value);
        return [
          {
            type: 'HANDLER',
            name,
            value: serializedValue,
          },
          transferables,
        ];
      }
    }
    return [
      {
        type: 'RAW',
        value,
      },
      transferCache.get(value) || [],
    ];
  }
  function fromWireValue (value) {
    switch (value.type) {
      case 'HANDLER':
        return transferHandlers.get(value.name).deserialize(value.value);
      case 'RAW':
        return value.value;
    }
  }
  function requestResponseMessage (ep, pendingListeners, msg, transfers) {
    return new Promise(resolve => {
      const id = generateUUID();
      pendingListeners.set(id, resolve);
      if (ep.start) {
        ep.start();
      }
      ep.postMessage(Object.assign({ id }, msg), transfers);
    });
  }
  function generateUUID () {
    return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join('-');
  }
  const kindXMap = /* @__PURE__ */ new Map();
  const namesByKind = /* @__PURE__ */ new Map();
  const callbackTab = /* @__PURE__ */ new Map();
  class MsgBroker {
    constructor () {
    }
    assignName (kind) {
      if (!kindXMap.has(kind)) {
        kindXMap.set(kind, 0);
      }
      const v = kindXMap.get(kind);
      kindXMap.set(kind, v + 1);
      const vs = kind + v;
      if (!namesByKind.has(kind)) {
        namesByKind.set(kind, []);
      }
      namesByKind.get(kind).push(vs);
      console.log('Assigned name:' + vs);
      return vs;
    }
    registerCallback (name, cb) {
      callbackTab.set(name, cb);
    }
    callback (name, msg, arg1, arg2) {
      const cb = callbackTab.get(name);
      console.log('Activate callback: ' + msg);
      if (cb) return cb(msg, arg1, arg2);
      console.log('Undefined callback for: ' + name);
    }
    listForKind (kind) {
      if (namesByKind.has(kind))
        return namesByKind.get(kind);
      else return [];
    }
    callbackXfer (name, msg, darray, arg2) {
      const cb = callbackTab.get(name);
      console.log('Activate callback xfer: ' + name + ' msg: ' + msg);
      return cb(msg, transfer(darray, [darray.buffer]), arg2);
    }
    callbackXferSA (name, msg, darray, arg2) {
      const cb = callbackTab.get(name);
      return cb(msg, darray, arg2);
    }
    dropAndNotify (name, kindToDrop, kindToNotify) {
      callbackTab.delete(name);
      if (namesByKind.has(kindToDrop)) {
        const ka = namesByKind.get(kindToDrop);
        const dropX = ka.indexOf(name);
        if (dropX >= 0) {
          ka.splice(dropX, 1);
        }
        if (namesByKind.has(kindToNotify)) {
          const kn = namesByKind.get(kindToNotify);
          for (let i = 0; i < kn.length; ++i) {
            const nameToTell = kn[i];
            this.callback(nameToTell, 'drop', name, kindToDrop);
          }
        }
        console.log('Dropping ' + kindToDrop + ' named ' + name);
      }
    }
    // method
  }
  const ourBroker = new MsgBroker();
  addEventListener('connect', event => {
    expose(ourBroker, event.ports[0]);
  });
})();
