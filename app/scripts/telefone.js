(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = require('./dialup');

},{"./dialup":2}],2:[function(require,module,exports){
(function(global) {
  "use strict";
  if (typeof global !== "Window") {
    global = window;
  }
  var Streamlet, Overtone;
  if (typeof define === "function" && define.amd) {
    define([ "streamlet", "overtone" ], function(streamlet, overtone) {
      Streamlet = streamlet;
      Overtone = overtone;
      return Dialup;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Dialup;
    Streamlet = require("streamlet");
    Overtone = require("overtone");
  } else {
    global.Dialup = Dialup;
    Streamlet = global.Streamlet;
    Overtone = global.Overtone;
  }
  var serversList = [ "stun.l.google.com:19302" ];
  var iceServers = serversList.reduce(function(servers, server) {
    server = "stun:" + server;
    var lastEntry = servers[servers.length - 1];
    if (lastEntry) {
      var lastServer = lastEntry.urls[0];
      if (trimIce(lastServer) === trimIce(server)) {
        lastEntry.urls.push(server);
      } else {
        servers.push({
          urls: [ server ]
        });
      }
    } else {
      servers.push({
        urls: [ server ]
      });
    }
    return servers;
  }, []);
  function trimIce(server) {
    return server.replace(/^stun:stun\d*\./, "").replace(/:\d+$/, "");
  }
  function Channel(url, room) {
    const controller = Streamlet.control();
    const stream = controller.stream;
    const ws = new WebSocket(url);
    ws.onopen = function() {
      send("join", {
        room: room || ""
      });
    };
    ws.onerror = function() {};
    ws.onmessage = function(e) {
      controller.add(JSON.parse(e.data));
    };
    function send(message, data) {
      data.type = message;
      ws.send(JSON.stringify(data));
    }
    this.send = send;
    this.onJoin = stream.filter(message => message.type === "join");
    this.onOffer = stream.filter(message => message.type === "offer");
    this.onAnswer = stream.filter(message => message.type === "answer");
    this.onPeers = stream.filter(message => message.type === "peers");
    this.onNew = stream.filter(message => message.type === "new");
    this.onCandidate = stream.filter(message => message.type === "candidate");
    this.onLeave = stream.filter(message => message.type === "leave");
  }
  const configuration = {
    iceServers: iceServers
  };
  function Dialup(url, room) {
    let me = null;
    const channel = new Channel(url, room);
    const clientIds = [];
    const streams = [];
    const peerConnections = {};
    const dataChannels = {};
    const controller = Streamlet.control();
    const stream = controller.stream;
    this.onAdd = stream.filter(message => message.type === "add");
    this.onData = stream.filter(message => message.type === "data");
    this.onPeers = channel.onPeers;
    this.onLeave = channel.onLeave;
    this.broadcast = function(message) {
      for (const clientId in dataChannels) {
        this.send(clientId, message);
      }
    };
    this.send = function(clientId, message) {
      const dc = dataChannels[clientId];
      if (dc.readyState === "open") {
        dc.send(message);
      }
    };
    this.getUserStream = async function(audio, video) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio,
        video: video ? {
          facingMode: "user"
        } : false
      });
      streams.push(stream);
      Overtone.filter(stream);
      for (const clientId of clientIds) {
        addTracks(clientId, stream);
      }
      return stream;
    };
    this.getDisplayStream = async function() {
      const stream = await navigator.mediaDevices.getDisplayMedia();
      streams.push(stream);
      for (const clientId of clientIds) {
        addTracks(clientId, stream);
      }
      return stream;
    };
    this.stopStream = function(stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    };
    channel.onPeers.listen(function(message) {
      me = message.you;
      for (const clientId of message.connections) {
        clientIds.push(clientId);
        createPeerConnection(clientId);
        createDataChannel(clientId);
      }
    });
    channel.onNew.listen(function(message) {
      const clientId = message.id;
      clientIds.push(clientId);
      createPeerConnection(clientId);
    });
    channel.onCandidate.listen(function(message) {
      const clientId = message.id;
      const pc = peerConnections[clientId];
      pc.addIceCandidate(message.candidate);
    });
    channel.onLeave.listen(function(message) {
      const clientId = message.id;
      delete peerConnections[clientId];
      delete dataChannels[clientId];
      clientIds.splice(clientIds.indexOf(clientId), 1);
    });
    channel.onOffer.listen(async function(message) {
      const clientId = message.id;
      const pc = peerConnections[clientId];
      await pc.setRemoteDescription(message.description);
      if (pc.iceConnectionState === "new") {
        for (const stream of streams) {
          addTracks(clientId, stream);
        }
      }
      await createAnswer(clientId);
    });
    channel.onAnswer.listen(async function(message) {
      const clientId = message.id;
      const pc = peerConnections[clientId];
      await pc.setRemoteDescription(message.description);
    });
    function addTracks(clientId, stream) {
      const pc = peerConnections[clientId];
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }
    async function createOffer(clientId) {
      const pc = peerConnections[clientId];
      await pc.setLocalDescription(await pc.createOffer());
      channel.send("offer", {
        id: clientId,
        description: pc.localDescription
      });
    }
    async function createAnswer(clientId) {
      const pc = peerConnections[clientId];
      await pc.setLocalDescription(await pc.createAnswer());
      channel.send("answer", {
        id: clientId,
        description: pc.localDescription
      });
    }
    function createDataChannel(clientId, label) {
      label || (label = "dataChannel");
      const pc = peerConnections[clientId];
      const dc = pc.createDataChannel(label);
      addDataChannel(clientId, dc);
    }
    function addDataChannel(clientId, dc) {
      dc.onopen = function() {};
      dc.onmessage = function(e) {
        controller.add({
          id: clientId,
          type: "data",
          data: e.data
        });
      };
      dc.onclose = function() {};
      dataChannels[clientId] = dc;
    }
    function createPeerConnection(clientId) {
      const pc = new RTCPeerConnection(configuration);
      peerConnections[clientId] = pc;
      pc.onicecandidate = function(e) {
        if (e.candidate && e.candidate.candidate) {
          channel.send("candidate", {
            id: clientId,
            candidate: e.candidate
          });
        }
      };
      pc.oniceconnectionstatechange = function() {
        switch (pc.iceConnectionState) {
         case "disconnected":
          break;

         case "failed":
          pc.close();
          break;

         case "completed":
          pc.onicecandidate = function() {};
          break;
        }
      };
      pc.onicecandidateerror = function(e) {
        console.log(e);
      };
      pc.onnegotiationneeded = function() {
        createOffer(clientId);
      };
      pc.ontrack = function(e) {
        controller.add({
          id: clientId,
          type: "add",
          stream: e.streams[0]
        });
      };
      pc.ondatachannel = function(e) {
        addDataChannel(clientId, e.channel);
      };
      return pc;
    }
  }
})(this);
},{"overtone":14,"streamlet":3}],3:[function(require,module,exports){
module.exports = require('./streamlet.js')
},{"./streamlet.js":6}],4:[function(require,module,exports){
module.exports = require('./subsequent.js')
},{"./subsequent.js":5}],5:[function(require,module,exports){
(function (process,setImmediate){(function (){
(function(root) {
  "use strict";
  var nextTick = function(nextTick, buffer, length, tick) {
    buffer = new Array(1e4);
    length = 0;
    function enqueue(fn) {
      if (length === buffer.length) {
        length = buffer.push(fn);
      } else {
        buffer[length++] = fn;
      }
      if (!tick) {
        return tick = true;
      }
    }
    function execute() {
      var i = 0;
      while (i < length) {
        buffer[i]();
        buffer[i++] = undefined;
      }
      length = 0;
      tick = false;
    }
    if (typeof setImmediate === "function") {
      return function(fn) {
        enqueue(fn) && setImmediate(execute);
      };
    }
    if (typeof process === "object" && process.nextTick) {
      return function(fn) {
        enqueue(fn) && process.nextTick(execute);
      };
    }
    var MutationObserver = root.MutationObserver;
    if (typeof MutationObserver !== "undefined") {
      var val = 1, node = root.document.createTextNode("");
      new MutationObserver(execute).observe(node, {
        characterData: true
      });
      return function(fn) {
        enqueue(fn) && (node.data = val *= -1);
      };
    }
    if (root.postMessage) {
      var isPostMessageAsync = true;
      if (root.attachEvent) {
        var checkAsync = function() {
          isPostMessageAsync = false;
        };
        root.attachEvent("onmessage", checkAsync);
        root.postMessage("__check", "*");
        root.detachEvent("onmessage", checkAsync);
      }
      if (isPostMessageAsync) {
        var message = "__subsequent", onMessage = function(e) {
          if (e.data === message) {
            e.stopPropagation && e.stopPropagation();
            execute();
          }
        };
        if (root.addEventListener) {
          root.addEventListener("message", onMessage, true);
        } else {
          root.attachEvent("onmessage", onMessage);
        }
        return function(fn) {
          enqueue(fn) && root.postMessage(message, "*");
        };
      }
    }
    var document = root.document;
    if ("onreadystatechange" in document.createElement("script")) {
      var createScript = function() {
        var script = document.createElement("script");
        script.onreadystatechange = function() {
          script.parentNode.removeChild(script);
          script = script.onreadystatechange = null;
          execute();
        };
        (document.documentElement || document.body).appendChild(script);
      };
      return function(fn) {
        enqueue(fn) && createScript();
      };
    }
    return function(fn) {
      enqueue(fn) && setTimeout(execute, 0);
    };
  }();
  if (typeof define === "function" && define.amd) {
    define(function() {
      return nextTick;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = nextTick;
  } else {
    root.subsequent = nextTick;
  }
})(Function("return this")());
}).call(this)}).call(this,require('_process'),require("timers").setImmediate)
},{"_process":7,"timers":8}],6:[function(require,module,exports){
(function(root) {
  "use strict";
  var nextTick;
  if (typeof define === "function" && define.amd) {
    define([ "subsequent" ], function(subsequent) {
      nextTick = subsequent;
      return Observable;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Observable;
    nextTick = require("subsequent");
  } else {
    root.Streamlet = Observable;
    nextTick = root.subsequent;
  }
  function Observable(fn) {
    this.__listeners__ = [];
    if (arguments.length > 0) {
      var controller = new Controller(this);
      if (typeof fn == "function") {
        try {
          fn(function(val) {
            controller.next(val);
          }, function(err) {
            controller.fail(err);
          }, function() {
            controller.done();
          });
        } catch (e) {
          controller.fail(e);
        }
      }
    }
  }
  Observable.prototype.isDone = false;
  Observable.prototype.isSync = false;
  Observable.prototype.listen = function(onNext, onFail, onDone) {
    if (this.isDone) return;
    var listeners = this.__listeners__, listener = {
      next: onNext,
      fail: onFail,
      done: onDone
    };
    listeners.push(listener);
    return function() {
      var index = (listeners || []).indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  };
  Observable.prototype.transform = function(transformer) {
    var controller = Observable.control(this.isSync), unsubscribe = this.listen(transformer(controller), function(reason) {
      controller.fail(reason);
    }, function() {
      controller.done();
    });
    controller.stream.end(unsubscribe);
    return controller.stream;
  };
  Observable.prototype.pipe = function(stream) {
    var controller = new Controller(stream), unsubscribe = this.listen(function(data) {
      controller.next(data);
    }, function(reason) {
      controller.fail(reason);
    }, function() {
      controller.done();
    });
    stream.end(unsubscribe);
    return stream;
  };
  function Controller(stream) {
    this.stream = stream;
  }
  Controller.NEXT = "next";
  Controller.FAIL = "fail";
  Controller.DONE = "done";
  Controller.prototype.add = Controller.prototype.next = function(data) {
    this.update(Controller.NEXT, data);
  };
  Controller.prototype.fail = function(reason) {
    this.update(Controller.FAIL, reason);
  };
  Controller.prototype.done = function() {
    this.update(Controller.DONE);
  };
  Controller.prototype.update = function(type, data) {
    var stream = this.stream;
    if (stream.isDone) return;
    if (stream.isSync) {
      Controller.handle(stream.__listeners__, type, data);
    } else {
      delay(Controller.handle, stream.__listeners__, type, data);
    }
    if (type === Controller.DONE) {
      stream.isDone = true;
      stream.__listeners__ = undefined;
    }
  };
  Controller.handle = function(listeners, type, data) {
    if (!listeners.length) return;
    var i = 0;
    while (i < listeners.length) {
      var listener = listeners[i++], fn = listener[type], fail = listener.fail;
      if (isFunction(fn)) {
        try {
          fn(data);
        } catch (e) {
          if (isFunction(fail)) {
            fail(e);
          }
        }
      }
    }
  };
  Observable.prototype["catch"] = function(onFail) {
    return this.listen(null, onFail);
  };
  Observable.prototype.end = function(onDone) {
    return this.listen(null, null, onDone);
  };
  Observable.prototype.map = function(convert) {
    return this.transform(function(controller) {
      return function(data) {
        data = convert(data);
        controller.add(data);
      };
    });
  };
  Observable.prototype.filter = function(test) {
    return this.transform(function(controller) {
      return function(data) {
        if (!test(data)) return;
        controller.add(data);
      };
    });
  };
  Observable.prototype.skip = function(count) {
    return this.transform(function(controller) {
      return function(data) {
        if (count-- > 0) return;
        controller.add(data);
      };
    });
  };
  Observable.prototype.skipWhile = function(test) {
    return this.transform(function(controller) {
      return function(data) {
        if (test(data)) return;
        controller.add(data);
      };
    });
  };
  Observable.prototype.skipDuplicates = function(compare, seed) {
    compare || (compare = function(a, b) {
      return a === b;
    });
    return this.transform(function(controller) {
      return function(data) {
        if (compare(data, seed)) return;
        controller.add(seed = data);
      };
    });
  };
  Observable.prototype.take = function(count) {
    return this.transform(function(controller) {
      return function(data) {
        if (count-- > 0) {
          controller.add(data);
        } else {
          controller.done();
        }
      };
    });
  };
  Observable.prototype.takeWhile = function(test) {
    return this.transform(function(controller) {
      return function(data) {
        if (test(data)) {
          controller.add(data);
        } else {
          controller.done();
        }
      };
    });
  };
  Observable.prototype.expand = function(expand) {
    return this.transform(function(controller) {
      return function(data) {
        data = expand(data);
        for (var i in data) {
          controller.add(data[i]);
        }
      };
    });
  };
  Observable.prototype.scan = function(combine, seed) {
    return this.transform(function(controller) {
      return function(data) {
        if (seed != null) {
          data = combine(seed, data);
        }
        controller.add(seed = data);
      };
    });
  };
  Observable.prototype.merge = function(stream) {
    return Observable.merge(this, stream);
  };
  Observable.control = function(isSync) {
    var observable = new Observable();
    observable.isSync = isSync;
    return new Controller(observable);
  };
  Observable.fromEvent = function(element, eventName) {
    var controller = Observable.control(true);
    element.addEventListener(eventName, function(e) {
      controller.add(e);
    }, false);
    return controller.stream;
  };
  Observable.fromPromise = function(promise) {
    var controller = Observable.control();
    onFullfilled = function(data) {
      controller.add(data);
      controller.done();
    }, onRejected = function(reason) {
      controller.fail(reason);
      controller.done();
    };
    promise.then(onFullfilled, onRejected);
    return controller.stream;
  };
  Observable.merge = function(streams) {
    streams = parse(arguments);
    var isSync = streams[0].isSync, controller = Observable.control(isSync), count = streams.length, i = 0, onNext = function(data) {
      controller.add(data);
    }, onFail = function(reason) {
      controller.fail(reason);
    }, onDone = function() {
      if (--count > 0) return;
      controller.done();
    };
    while (i < count) {
      streams[i++].listen(onNext, onFail, onDone);
    }
    return controller.stream;
  };
  function isFunction(fn) {
    return fn && typeof fn === "function";
  }
  function parse(obj) {
    if (obj.length === 1 && Array.isArray(obj[0])) {
      return obj[0];
    } else {
      var args = new Array(obj.length), i = 0;
      while (i < args.length) {
        args[i] = obj[i++];
      }
      return args;
    }
  }
  function delay(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    nextTick(function() {
      fn.apply(null, args);
    });
  }
})(Function("return this")());
},{"subsequent":4}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":7,"timers":8}],9:[function(require,module,exports){
require('./layout')

const Dialup = require('dialup/client')
const Observable = require('streamlet')
const Player = require('./player')
const drop = require('./drop')
const $ = require('./bootstrap')

let room

if (location.pathname === '/') {
	room = fancyName()

	history.pushState(null, '', room)
	Observable.fromEvent(window, 'popstate').listen(function (e) {
		location = location
	})
} else {
	room = location.pathname.slice(1)
}

const dialup = new Dialup(location.origin.replace(/^http/, 'ws'), room)


dialup.onPeers.listen(function (message) {
	if (message.connections.length === 0) {
		prompt('You are alone here, send this URL to your friends', location)
	}

	dialup.getUserStream(true, true).then(function (stream) {
		const player = Player(stream, {
			local: true,
			toggleScreenShare: function toggleScreenShare() {
				if (toggleScreenShare.promise) {
					const promise = toggleScreenShare.promise
					toggleScreenShare.promise = null
					return promise.then((stream) => {
						dialup.stopStream(stream)
						throw new Error('sharing disabled')
					})
				} else {
					return toggleScreenShare.promise = dialup.getDisplayStream()
				}
			}
		})

		$('#faces').insertBefore(player, $('#faces').firstChild)
	})
})

Observable.fromEvent($('#input'), 'change')
	.filter(function (e) { return e.target.value })
	.listen(function (e) {
		dialup.broadcast(e.target.value)
		var entry = document.createElement('li')
		entry.innerHTML = e.target.value
		$('#log').appendChild(entry)
		e.target.value = ''
	})

dialup.onAdd.listen(function (message) {
	const streamId = message.stream.id.replace('{', '').replace('}', '')
	if (!$('[data-stream="' + streamId + '"]')) {
		if (!$('[data-client="' + message.id + '"]')) {
			const player = Player(message.stream, {
				props: {
					'data-client': message.id,
					'data-stream': streamId
				}
			})
			drop(player).listen(function (data) {
				dialup.send(message.id, data)
			})
			$('#faces').appendChild(player)
		} else {
			const player = Player(message.stream, {
				props: {
					'data-client': message.id,
					'data-stream': streamId
				}
			})
			$('#screen').appendChild(player)
		}

	}
})

dialup.onLeave.listen(function (message) {
	const video = $('[data-client="' + message.id + '"]')
	if (video.length > 0) {
		video.forEach(v => {
			URL.revokeObjectURL(v.src)
			const player = v.parentNode
			player.parentNode.removeChild(player)
		})
	} else {
		URL.revokeObjectURL(video.src)
		const player = video.parentNode
		player.parentNode.removeChild(player)
	}
})

dialup.onData.filter(function (message) {
	return typeof message.data === 'string'
}).listen(function (message) {
	const entry = document.createElement('li')
	entry.innerHTML = '<b>' + message.data + '</b>'
	$('#log').insertBefore(entry, $('#log').firstChild)
})

dialup.onData.filter(function (message) {
	return typeof message.data !== 'string'
}).listen(function (message) {
	const entry = document.createElement('li')
	const url = URL.createObjectURL(new Blob([message.data]))
	entry.innerHTML = '<a href="' + url + '" target="_blank">Download File</a>'
	$('#log').insertBefore(entry, $('#log').firstChild)
})

function fancyName() {
	const adjectives = [
			"autumn", "hidden", "bitter", "misty", "silent", "empty", "dry", "dark",
			"summer", "icy", "delicate", "quiet", "white", "cool", "spring", "winter",
			"patient", "twilight", "dawn", "crimson", "wispy", "weathered", "blue",
			"billowing", "broken", "cold", "damp", "falling", "frosty", "green",
			"long", "late", "lingering", "bold", "little", "morning", "muddy", "old",
			"red", "rough", "still", "small", "sparkling", "throbbing", "shy",
			"wandering", "withered", "wild", "black", "young", "holy", "solitary",
			"fragrant", "aged", "snowy", "proud", "floral", "restless", "divine",
			"polished", "ancient", "purple", "lively", "nameless"
		]
	const nouns = [
			"waterfall", "river", "breeze", "moon", "rain", "wind", "sea", "morning",
			"snow", "lake", "sunset", "pine", "shadow", "leaf", "dawn", "glitter",
			"forest", "hill", "cloud", "meadow", "sun", "glade", "bird", "brook",
			"butterfly", "bush", "dew", "dust", "field", "fire", "flower", "firefly",
			"feather", "grass", "haze", "mountain", "night", "pond", "darkness",
			"snowflake", "silence", "sound", "sky", "shape", "surf", "thunder",
			"violet", "water", "wildflower", "wave", "water", "resonance", "sun",
			"wood", "dream", "cherry", "tree", "fog", "frost", "voice", "paper",
			"frog", "smoke", "star"
		]
	const rnd = Math.floor(Math.random() * Math.pow(2, 12))

	return  adjectives[rnd >> 6 % 64] + '-' + nouns[rnd % 64] + '-' + rnd
}

},{"./bootstrap":10,"./drop":11,"./layout":12,"./player":13,"dialup/client":1,"streamlet":3}],10:[function(require,module,exports){
module.exports = function $(selector, context) {
  const result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}


NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter

},{}],11:[function(require,module,exports){
const Observable = require('streamlet')

module.exports = function (element) {
	const controller = Observable.control()

	Observable.fromEvent(element, 'dragenter').listen(function (e) {
		e.preventDefault()
		e.target.className = 'over'
	})

	Observable.fromEvent(element, 'dragover').listen(function (e) {
		e.preventDefault()
	})

	Observable.fromEvent(element, 'dragleave').listen(function (e) {
		e.target.className = ''
	})

	Observable.fromEvent(element, 'drop').listen(function (e) {
		e.stopPropagation()
		e.preventDefault()
		e.target.className = ''

		var files = e.dataTransfer.files,
			f = files[0],
			reader = new FileReader()

		reader.onload = function (e) {
			controller.add(e.target.result)
		}
		reader.readAsArrayBuffer(f)
	})

	return controller.stream
}

},{"streamlet":3}],12:[function(require,module,exports){
const conference = document.querySelector("#conference")
const faces = document.querySelector("#faces")
const screen = document.querySelector("#screen")

const screenObserver = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length) {
			conference.classList.add('presenting')
		} else if (mutation.removedNodes.length) {
			conference.classList.remove('presenting')
		}
  })
})
screenObserver.observe(screen, { childList: true })

const facesObserver = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length || mutation.removedNodes.length) {
			autoLayout()
		}
  })
})
facesObserver.observe(faces, { childList: true })

function autoLayout() {
  const gallery = document.querySelector('#faces')
	if (gallery.parentNode.classList.contains('presenting')) return
	const container = gallery.parentNode
  const aspectRatio = 4 / 3
  const screenWidth = container.getBoundingClientRect().width
  const screenHeight = container.getBoundingClientRect().height
  const videoCount = gallery.querySelectorAll('video').length || 1

  const { width, height, cols } = calculateConstraints(
    screenWidth,
    screenHeight,
    videoCount,
    aspectRatio
  )

  gallery.style.setProperty("--width", width + "px")
  gallery.style.setProperty("--height", height + "px")
  gallery.style.setProperty("--cols", cols + "")
}

function calculateConstraints(
	containerWidth,
	containerHeight,
	videoCount,
	aspectRatio,
) {
	let constraints = {
		area: 0,
		cols: 0,
		rows: 0,
		width: 0,
		height: 0
	}

	for (let cols = 1; cols <= videoCount; cols++) {
		const rows = Math.ceil(videoCount / cols)
		const horizontalScale = containerWidth / (cols * aspectRatio)
		const verticalScale = containerHeight / rows

		let width
		let height
		if (horizontalScale <= verticalScale) {
			width = Math.floor(containerWidth / cols)
			height = Math.floor(width / aspectRatio)
		} else {
			height = Math.floor(containerHeight / rows)
			width = Math.floor(height * aspectRatio)
		}

		const area = width * height
		if (area > constraints.area) {
			constraints = {
				area,
				width,
				height,
				rows,
				cols
			}
		}
	}

	return constraints
}

function debounce(func, wait) {
	let timeout
	return function(...args) {
		const context = this
		const later = function() {
			func.apply(context, args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

autoLayout()
window.addEventListener('resize', debounce(autoLayout, 50))

},{}],13:[function(require,module,exports){
const Observable = require('streamlet')

function Player(stream, options) {
	const player = document.createElement('div')
	player.className = 'player'
	player.appendChild(createVideo(stream, options))
	player.appendChild(createControls(stream, options))
	return player
}

createVideo = function (stream, options) {
	const video = document.createElement('video')
	video.autoplay = true
	video.srcObject = stream
	if (options.local) {
		video.muted = true
	}

	if (options.props) {
		for (const prop in options.props) {
			video.setAttribute(prop, options.props[prop])
		}
	}

	const videoTrack = stream.getVideoTracks()[0]
	videoTrack.onended = function () {
		const player = video.parentNode
		player.parentNode.removeChild(player)
		URL.revokeObjectURL(video.src)
	}
	return video
}

createControls = function (stream, options) {
	const controls = document.createElement('div')
	controls.className = 'controls'

	const audioTrack = stream.getAudioTracks()[0]
	if (audioTrack) {
		const mute = document.createElement('button')
		mute.textContent = 'A'
		Observable.fromEvent(mute, 'click').listen(function() {
			audioTrack.enabled = !audioTrack.enabled
			mute.classList.toggle('off')
		})
		controls.appendChild(mute)
	}

	const videoTrack = stream.getVideoTracks()[0]
	if (videoTrack) {
		const mute = document.createElement('button')
		mute.textContent = 'V'
		Observable.fromEvent(mute, 'click').listen(function() {
			videoTrack.enabled = !videoTrack.enabled
			mute.classList.toggle('off')
		})
		controls.appendChild(mute)
	}

	if (options.local) {
		const screen = document.createElement('button')
		screen.textContent = 'S'
		screen.classList.add('off')
		Observable.fromEvent(screen, 'click').listen(function() {
			options.toggleScreenShare().then(
				() => screen.classList.remove('off'),
				() => screen.classList.add('off')
			)
		})
		controls.appendChild(screen)
	}

	return controls
}

module.exports = Player

},{"streamlet":3}],14:[function(require,module,exports){
module.exports = require('./overtone.js')

},{"./overtone.js":15}],15:[function(require,module,exports){
(function(global) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    define(function() {
      return Audio;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Audio;
  } else {
    global.Overtone = Audio;
  }
  function Audio() {}
  Audio.filter = function(stream) {
    if (AudioContext && MediaStream && MediaStream.prototype.removeTrack) {
      var context = new AudioContext(), source = context.createMediaStreamSource(stream), filter = context.createBiquadFilter(), destination = context.createMediaStreamDestination();
      filter.type = filter.LOWPASS;
      filter.Q.value = 0;
      filter.frequency.value = 2e3;
      source.connect(filter);
      filter.connect(destination);
      stream.removeTrack(stream.getAudioTracks()[0]);
      stream.addTrack(destination.stream.getAudioTracks()[0]);
    }
  };
  if (typeof global !== "Window") {
    global = window;
  }
  var AudioContext = global.AudioContext || global.mozAudioContext, MediaStream = global.MediaStream || global.webkitMediaStream || global.mozMediaStream;
})(this);
},{}]},{},[9]);
