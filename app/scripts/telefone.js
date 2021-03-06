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
  var serversList = [ "stun.l.google.com:19302", "stun1.l.google.com:19302", "stun2.l.google.com:19302", "stun3.l.google.com:19302", "stun4.l.google.com:19302", "stun.ekiga.net", "stun.ideasip.com", "stun.rixtelecom.se", "stun.schlund.de", "stun.stunprotocol.org:3478", "stun.voiparound.com", "stun.voipbuster.com", "stun.voipstunt.com", "stun.voxgratia.org" ];
  var iceServers = serversList.reduce(function(servers, server) {
    var lastEntry = servers[servers.length - 1];
    server = "stun:" + server;
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
    this.onCandidate = stream.filter(message => message.type === "candidate");
    this.onNew = stream.filter(message => message.type === "new");
    this.onPeers = stream.filter(message => message.type === "peers");
    this.onLeave = stream.filter(message => message.type === "leave");
  }
  const constraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  };
  const configuration = {
    iceServers: iceServers
  };
  function Dialup(url, room) {
    let me = null;
    const channel = new Channel(url, room);
    const clientIds = [];
    const connections = {};
    const data = {};
    const streams = [];
    const controller = Streamlet.control();
    const stream = controller.stream;
    this.onAdd = stream.filter(message => message.type === "add");
    this.onData = stream.filter(message => message.type === "data");
    this.onPeers = channel.onPeers;
    this.onLeave = channel.onLeave;
    this.broadcast = function(message) {
      for (const clientId in data) {
        this.send(clientId, message);
      }
    };
    this.send = function(clientId, message) {
      const dc = data[clientId];
      if (dc.readyState === "open") {
        dc.send(message);
      }
    };
    this.createStream = function(audio, video) {
      return navigator.mediaDevices.getUserMedia({
        audio: audio,
        video: video
      }).then(function(stream) {
        Overtone.filter(stream);
        streams.push(stream);
        for (const id of clientIds) {
          const connection = connections[id] = createPeerConnection(id);
          for (const stream of streams) {
            stream.getTracks().forEach(function(track) {
              connection.addTrack(track, stream);
            });
          }
          createDataChannel(id, connection);
          createOffer(id, connection);
        }
        return stream;
      });
    };
    channel.onPeers.listen(function(message) {
      me = message.you;
      for (const id of message.connections) {
        clientIds.push(id);
      }
    });
    channel.onCandidate.listen(function(message) {
      const clientId = message.id;
      connections[clientId].addIceCandidate(message.candidate);
    });
    channel.onNew.listen(function(message) {
      const clientId = message.id;
      const pc = createPeerConnection(clientId);
      clientIds.push(clientId);
      connections[clientId] = pc;
      streams.forEach(function(stream) {
        stream.getTracks().forEach(function(track) {
          pc.addTrack(track, stream);
        });
      });
    });
    channel.onLeave.listen(function(message) {
      const clientId = message.id;
      delete connections[clientId];
      delete data[clientId];
      clientIds.splice(clientIds.indexOf(clientId), 1);
    });
    channel.onOffer.listen(function(message) {
      const clientId = message.id;
      const pc = connections[clientId];
      pc.setRemoteDescription(message.description);
      createAnswer(clientId, pc);
    });
    channel.onAnswer.listen(function(message) {
      const clientId = message.id;
      const pc = connections[clientId];
      pc.setRemoteDescription(message.description);
    });
    function createOffer(clientId, pc) {
      pc.createOffer(constraints).then(offer => pc.setLocalDescription(offer)).then(() => channel.send("offer", {
        id: clientId,
        description: pc.localDescription
      }), function() {});
    }
    function createAnswer(clientId, pc) {
      pc.createAnswer().then(answer => pc.setLocalDescription(answer)).then(() => channel.send("answer", {
        id: clientId,
        description: pc.localDescription
      }), function() {});
    }
    function createDataChannel(clientId, pc, label) {
      label || (label = "dataChannel");
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
      data[clientId] = dc;
    }
    function createPeerConnection(clientId) {
      const pc = new RTCPeerConnection(configuration);
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
},{"overtone":3,"streamlet":5}],3:[function(require,module,exports){
module.exports = require('./overtone.js')

},{"./overtone.js":4}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
module.exports = require('./streamlet.js')
},{"./streamlet.js":6}],6:[function(require,module,exports){
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
},{"subsequent":7}],7:[function(require,module,exports){
module.exports = require('./subsequent.js')
},{"./subsequent.js":8}],8:[function(require,module,exports){
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
},{"_process":9,"timers":14}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"./streamlet.js":11,"dup":5}],11:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6,"subsequent":12}],12:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"./subsequent.js":13,"dup":7}],13:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"_process":9,"dup":8,"timers":14}],14:[function(require,module,exports){
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
},{"process/browser.js":9,"timers":14}],15:[function(require,module,exports){
const Dialup = require('dialup/client')
const Observable = require('streamlet')
const Player = require('./player')
const drop = require('./drop')
const $ = require('./bootstrap')

let room

if (location.pathname === '/') {
	room = Array.apply(null, Array(20)).map(function (chars) {
			return function () {
				return chars.charAt(Math.floor(Math.random() * chars.length))
			}
		}('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')).join('')

	history.pushState(null, '', room)
	Observable.fromEvent(window, 'popstate').listen(function (e) {
		location = location
	})
} else {
	room = location.pathname.slice(1)
}

const dialup = new Dialup(location.origin.replace(/^http/, 'ws'), room)
let alone = false

Observable.fromEvent($('#chat'), 'change')
	.filter(function (e) { return e.target.value })
	.listen(function (e) {
		dialup.broadcast(e.target.value)
		var entry = document.createElement('li')
		entry.innerHTML = e.target.value
		$('#log').insertBefore(entry, $('#log').firstChild)
		e.target.value = ''
	})

dialup.createStream(true, true).then(function (stream) {
	const player = new Player(stream, {
		muted: true
	})

	$('#conference').appendChild(player)

	setTimeout(function(){
		alone && prompt('You are alone here, send this URL to your friends', location)
	}, 0)
})

dialup.onPeers.listen(function (message) {
	if (message.connections.length === 0) {
		alone = true
	}
})

dialup.onAdd.listen(function (message) {
	if (!document.querySelector('#remote' + message.id)) {
		const player = new Player(message.stream, {
			id: 'remote' + message.id
		})
		drop(player).listen(function (data) {
			dialup.send(message.id, data)
		})
		$('#conference').appendChild(player)
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

dialup.onLeave.listen(function (message) {
	const video = $('#remote' + message.id)
	if (video) {
		URL.revokeObjectURL(video.src)
		const player = video.parentNode
		player.parentNode.removeChild(player)
	}
})

function fancyName () {
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

},{"./bootstrap":16,"./drop":17,"./player":18,"dialup/client":1,"streamlet":10}],16:[function(require,module,exports){
module.exports = function $(selector, context) {
  const result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}


NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter

},{}],17:[function(require,module,exports){
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

},{"streamlet":10}],18:[function(require,module,exports){
if (document.getCSSCanvasContext) {
	const ctx = document.getCSSCanvasContext('2d', 'noise', 300, 300)
	const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
	const pixels = imageData.data
	for (let i = 0; i < pixels.length; i += 4) {
		const color = Math.round(Math.random() * 255)
		pixels[i] = pixels[i + 1] = pixels[i + 2] = color
		pixels[i + 3] = 5
	}
	ctx.putImageData(imageData, 0, 0)
}

const Observable = require('streamlet')

function Player(stream, props) {
	const player = document.createElement('div')
	player.className = 'player'
	player.appendChild(this.video(stream, props))
	player.appendChild(this.controls(stream))
	return player
}

Player.prototype.video = function (stream, props) {
	const video = document.createElement('video')
	video.autoplay = true
	video.srcObject = stream
	for (var i in props) {
		video[i] = props[i]
	}
	return video
}

Player.prototype.controls = function (stream) {
	const controls = document.createElement('div')
	controls.className = 'controls'

	const audio = stream.getAudioTracks()[0]
	const mute = document.createElement('button')
	mute.textContent = 'A'
	Observable.fromEvent(mute, 'click').listen(function() {
		audio.enabled = !audio.enabled
		mute.classList.toggle('off')
	})
	controls.appendChild(mute)

	const video = stream.getVideoTracks()[0]
	const black = document.createElement('button')
	black.textContent = 'V'
	Observable.fromEvent(black, 'click').listen(function() {
		video.enabled = !video.enabled
		black.classList.toggle('off')
	})
	controls.appendChild(black)

	return controls
}

module.exports = Player

},{"streamlet":10}]},{},[15]);
