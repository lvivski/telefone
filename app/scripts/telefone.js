(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Dialup = require('dialup/client'),
	Observable = require('streamlet'),
	Player = require('./player'),
	drop = require('./drop'),
	$ = require('./bootstrap'),
	room

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

var dialup = new Dialup(location.origin.replace(/^http/, 'ws'), room),
    alone = false

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
	var player = new Player(stream, {
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
	var player = new Player(message.stream, {
		id: 'remote' + message.id
	})
	drop(player).listen(function (data) {
		dialup.send(message.id, data)
	})
	$('#conference').appendChild(player)
})

dialup.onData.filter(function (message) {
	return typeof message.data === 'string'
}).listen(function (message) {
	var entry = document.createElement('li')
	entry.innerHTML = '<b>' + message.data + '</b>'
	$('#log').insertBefore(entry, $('#log').firstChild)
})

dialup.onData.filter(function (message) {
	return typeof message.data !== 'string'
}).listen(function (message) {
	var entry = document.createElement('li'),
		url = URL.createObjectURL(new Blob([message.data]))
	entry.innerHTML = '<a href="' + url + '" target="_blank">Download File</a>'
	$('#log').insertBefore(entry, $('#log').firstChild)
})

dialup.onLeave.listen(function (message) {
	var video = $('#remote' + message.id)
	if (video) {
		URL.revokeObjectURL(video.src)
		var player = video.parentNode
		player.parentNode.removeChild(player)
	}
})

function fancyName () {
	var adjectives = [
			"autumn", "hidden", "bitter", "misty", "silent", "empty", "dry", "dark",
			"summer", "icy", "delicate", "quiet", "white", "cool", "spring", "winter",
			"patient", "twilight", "dawn", "crimson", "wispy", "weathered", "blue",
			"billowing", "broken", "cold", "damp", "falling", "frosty", "green",
			"long", "late", "lingering", "bold", "little", "morning", "muddy", "old",
			"red", "rough", "still", "small", "sparkling", "throbbing", "shy",
			"wandering", "withered", "wild", "black", "young", "holy", "solitary",
			"fragrant", "aged", "snowy", "proud", "floral", "restless", "divine",
			"polished", "ancient", "purple", "lively", "nameless"
		],
		nouns = [
			"waterfall", "river", "breeze", "moon", "rain", "wind", "sea", "morning",
			"snow", "lake", "sunset", "pine", "shadow", "leaf", "dawn", "glitter",
			"forest", "hill", "cloud", "meadow", "sun", "glade", "bird", "brook",
			"butterfly", "bush", "dew", "dust", "field", "fire", "flower", "firefly",
			"feather", "grass", "haze", "mountain", "night", "pond", "darkness",
			"snowflake", "silence", "sound", "sky", "shape", "surf", "thunder",
			"violet", "water", "wildflower", "wave", "water", "resonance", "sun",
			"wood", "dream", "cherry", "tree", "fog", "frost", "voice", "paper",
			"frog", "smoke", "star"
		],
		rnd = Math.floor(Math.random() * Math.pow(2, 12))

	return  adjectives[rnd >> 6 % 64] + '-' + nouns[rnd % 64] + '-' + rnd
}

},{"./bootstrap":2,"./drop":3,"./player":4,"dialup/client":6,"streamlet":18}],2:[function(require,module,exports){
module.exports = function $(selector, context) {
  var result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}


NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter

},{}],3:[function(require,module,exports){
var Observable = require('streamlet');

module.exports = function (element) {
	var controller = Observable.control()

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

},{"streamlet":18}],4:[function(require,module,exports){
if (document.getCSSCanvasContext) {
	var ctx = document.getCSSCanvasContext('2d', 'noise', 300, 300),
		imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height),
		pixels = imageData.data
	for (var i = 0; i < pixels.length; i += 4) {
		var color = Math.round(Math.random() * 255)
		pixels[i] = pixels[i + 1] = pixels[i + 2] = color
		pixels[i + 3] = 5
	}
	ctx.putImageData(imageData, 0, 0)
}

var Observable = require('streamlet')

function Player(stream, props) {
	var player = document.createElement('div')
	player.className = 'player'
	player.appendChild(this.video(stream, props))
	player.appendChild(this.controls(stream))
	return player
}

Player.prototype.video = function (stream, props) {
	var video = document.createElement('video')
	video.autoplay = true
	video.src = URL.createObjectURL(stream)
	for (var i in props) {
		video[i] = props[i]
	}
	return video
}

Player.prototype.controls = function (stream) {
	var controls = document.createElement('div')
	controls.className = 'controls'

	var audio = stream.getAudioTracks()[0]
	var mute = document.createElement('button')
	mute.textContent = 'A'
	Observable.fromEvent(mute, 'click').listen(function() {
		audio.enabled = !audio.enabled
		mute.classList.toggle('off')
	})
	controls.appendChild(mute)

	var video = stream.getVideoTracks()[0]
	var black = document.createElement('button')
	black.textContent = 'V'
	Observable.fromEvent(black, 'click').listen(function() {
		video.enabled = !video.enabled
		black.classList.toggle('off')
	})
	controls.appendChild(black)

	return controls
}

module.exports = Player

},{"streamlet":18}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
module.exports = require('./dialup');

},{"./dialup":7}],7:[function(require,module,exports){
(function(global) {
  "use strict";
  if (typeof global !== "Window") {
    global = window;
  }
  var navigator = global.navigator, RTCPeerConnection = global.mozRTCPeerConnection || global.webkitRTCPeerConnection || global.PeerConnection, getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia).bind(navigator), RTCIceCandidate = global.mozRTCIceCandidate || global.RTCIceCandidate, RTCSessionDescription = global.mozRTCSessionDescription || global.RTCSessionDescription;
  global.URL = global.URL || global.webkitURL || global.msURL;
  var Observable, Promise, Audio;
  if (typeof define === "function" && define.amd) {
    define([ "streamlet", "davy", "overtone" ], function(streamlet, davy, overtone) {
      Observable = streamlet;
      Promise = davy;
      Audio = overtone;
      return Dialup;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Dialup;
    Observable = require("streamlet");
    Promise = require("davy");
    Audio = require("overtone");
  } else {
    global.Dialup = Dialup;
    Observable = global.Streamlet;
    Promise = global.Davy;
    Audio = global.Overtone;
  }
  function Dialup(url, room) {
    var me = null, sockets = [], connections = {}, data = {}, streams = [], controller = Observable.control(), socket = new WebSocket(url);
    var constraints = {
      optional: [],
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
      }
    }, constraintsScreen = {
      video: {
        mandatory: {
          chromeMediaSource: "screen"
        }
      }
    }, servers = {
      iceServers: [ {
        url: "stun:stun.l.google.com:19302"
      } ]
    }, config = {
      optional: [ {
        DtlsSrtpKeyAgreement: true
      } ]
    };
    socket.onopen = function() {
      send("join", {
        room: room || ""
      });
    };
    socket.onerror = function() {};
    socket.onmessage = function(e) {
      controller.add(JSON.parse(e.data));
    };
    this.onOffer = controller.stream.filter(function(message) {
      return message.type === "offer";
    });
    this.onAnswer = controller.stream.filter(function(message) {
      return message.type === "answer";
    });
    this.onCandidate = controller.stream.filter(function(message) {
      return message.type === "candidate";
    });
    this.onNew = controller.stream.filter(function(message) {
      return message.type === "new";
    });
    this.onPeers = controller.stream.filter(function(message) {
      return message.type === "peers";
    });
    this.onLeave = controller.stream.filter(function(message) {
      return message.type === "leave";
    });
    this.onAdd = controller.stream.filter(function(message) {
      return message.type === "add";
    });
    this.onRemove = controller.stream.filter(function(message) {
      return message.type === "remove";
    });
    this.onData = controller.stream.filter(function(message) {
      return message.type === "data";
    });
    this.broadcast = function(message) {
      for (var k in data) {
        this.send(k, message);
      }
    };
    this.send = function(id, message) {
      var d = data[id];
      if (d.readyState === "open") d.send(message);
    };
    this.createStream = function(audio, video) {
      var defer = Promise.defer();
      getUserMedia({
        audio: audio,
        video: video
      }, function(stream) {
        Audio.filter(stream);
        streams.push(stream);
        for (var i = 0; i < sockets.length; ++i) {
          var socket = sockets[i];
          connections[socket] = createPeerConnection(socket);
        }
        for (i = 0; i < streams.length; ++i) {
          var stream = streams[i];
          for (socket in connections) {
            var connection = connections[socket];
            connection.addStream(stream);
          }
        }
        for (socket in connections) {
          connection = connections[socket];
          createDataChannel(socket, connection);
          createOffer(socket, connection);
        }
        defer.fulfill(stream);
      }, function() {}, constraints);
      return defer.promise;
    };
    this.onPeers.listen(function(message) {
      me = message.you;
      for (var i in message.connections) {
        var connection = message.connections[i];
        sockets.push(connection);
      }
    });
    this.onCandidate.listen(function(message) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      connections[message.id].addIceCandidate(candidate);
    });
    this.onNew.listen(function(message) {
      var id = message.id, pc = createPeerConnection(id);
      sockets.push(id);
      connections[id] = pc;
      streams.forEach(function(stream) {
        pc.addStream(stream);
      });
    });
    this.onLeave.listen(function(message) {
      var id = message.id;
      delete connections[id];
      delete data[id];
      sockets.splice(sockets.indexOf(id), 1);
    });
    this.onOffer.listen(function(message) {
      var pc = connections[message.id];
      pc.setRemoteDescription(new RTCSessionDescription(message.description));
      createAnswer(message.id, pc);
    });
    this.onAnswer.listen(function(message) {
      var pc = connections[message.id];
      pc.setRemoteDescription(new RTCSessionDescription(message.description));
    });
    function createOffer(socket, pc) {
      pc.createOffer(function(session) {
        pc.setLocalDescription(session);
        send("offer", {
          id: socket,
          description: {
            sdp: session.sdp,
            type: session.type
          }
        });
      }, function() {}, constraints);
    }
    function createAnswer(socket, pc) {
      pc.createAnswer(function(session) {
        pc.setLocalDescription(session);
        send("answer", {
          id: socket,
          description: {
            sdp: session.sdp,
            type: session.type
          }
        });
      }, function() {});
    }
    function createDataChannel(id, pc, label) {
      label || (label = "dataChannel");
      var channel = pc.createDataChannel(label, {
        reliable: true
      });
      addDataChannel(id, channel);
    }
    function addDataChannel(id, channel) {
      channel.onopen = function() {};
      channel.onmessage = function(e) {
        controller.add({
          type: "data",
          id: id,
          data: e.data
        });
      };
      channel.onclose = function() {};
      data[id] = channel;
    }
    function createPeerConnection(id) {
      var pc = new RTCPeerConnection(servers, config);
      pc.onicecandidate = function(e) {
        if (e.candidate != null) {
          send("candidate", {
            label: e.candidate.sdpMLineIndex,
            id: id,
            candidate: e.candidate.candidate
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
      pc.onaddstream = function(e) {
        controller.add({
          type: "add",
          id: id,
          stream: e.stream
        });
      };
      pc.onremovestream = function(e) {
        controller.add({
          type: "remove",
          id: id,
          stream: e.stream
        });
      };
      pc.ondatachannel = function(e) {
        addDataChannel(id, e.channel);
      };
      return pc;
    }
    function send(event, data) {
      data.type = event;
      socket.send(JSON.stringify(data));
    }
  }
})(this);
},{"davy":9,"overtone":12,"streamlet":14}],8:[function(require,module,exports){
(function(global) {
  "use strict";
  var nextTick;
  if (typeof define === "function" && define.amd) {
    define([ "subsequent" ], function(subsequent) {
      nextTick = subsequent;
      return Promise;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Promise;
    nextTick = require("subsequent");
  } else {
    global.Davy = Promise;
    nextTick = global.subsequent;
  }
  function Promise(fn) {
    this.value = undefined;
    this.__deferreds__ = [];
    if (arguments.length > 0) {
      var resolver = new Resolver(this);
      if (typeof fn == "function") {
        try {
          fn(function(val) {
            resolver.fulfill(val);
          }, function(err) {
            resolver.reject(err);
          }, function(val) {
            resolver.notify(val);
          });
        } catch (e) {
          resolver.reject(e);
        }
      } else {
        resolver.fulfill(fn);
      }
    }
  }
  Promise.prototype.isFulfilled = false;
  Promise.prototype.isRejected = false;
  Promise.prototype.then = function(onFulfill, onReject, onNotify) {
    var resolver = new Resolver(new Promise()), deferred = {
      resolver: resolver,
      fulfill: onFulfill,
      reject: onReject,
      notify: onNotify
    };
    if (this.isFulfilled || this.isRejected) {
      Resolver.resolve([ deferred ], this.isFulfilled ? Resolver.SUCCESS : Resolver.FAILURE, this.value);
    } else {
      this.__deferreds__.push(deferred);
    }
    return resolver.promise;
  };
  function Resolver(promise) {
    this.promise = promise;
  }
  Resolver.SUCCESS = "fulfill";
  Resolver.FAILURE = "reject";
  Resolver.NOTIFY = "notify";
  Resolver.prototype.fulfill = function(value) {
    var promise = this.promise;
    if (promise.isFulfilled || promise.isRejected) return;
    if (value === promise) {
      this.reject(new TypeError("Can't resolve a promise with itself."));
      return;
    }
    if (isObject(value) || isFunction(value)) {
      var then;
      try {
        then = value.then;
      } catch (e) {
        this.reject(e);
        return;
      }
      if (isFunction(then)) {
        var isResolved = false, self = this;
        try {
          then.call(value, function(val) {
            if (!isResolved) {
              isResolved = true;
              self.fulfill(val);
            }
          }, function(err) {
            if (!isResolved) {
              isResolved = true;
              self.reject(err);
            }
          }, function(val) {
            self.notify(val);
          });
        } catch (e) {
          if (!isResolved) {
            this.reject(e);
          }
        }
        return;
      }
    }
    promise.isFulfilled = true;
    this.complete(value);
  };
  Resolver.prototype.reject = function(error) {
    var promise = this.promise;
    if (promise.isFulfilled || promise.isRejected) return;
    promise.isRejected = true;
    this.complete(error);
  };
  Resolver.prototype.notify = function(value) {
    var promise = this.promise;
    if (promise.isFulfilled || promise.isRejected) return;
    Resolver.resolve(promise.__deferreds__, Promise.NOTIFY, value);
  };
  Resolver.prototype.complete = function(value) {
    var promise = this.promise, type = promise.isFulfilled ? Resolver.SUCCESS : Resolver.FAILURE;
    promise.value = value;
    Resolver.resolve(promise.__deferreds__, type, value);
    promise.__deferreds__ = undefined;
  };
  Resolver.resolve = function(deferreds, type, value) {
    if (!deferreds.length) return;
    nextTick(function() {
      var i = 0;
      while (i < deferreds.length) {
        var deferred = deferreds[i++], fn = deferred[type], resolver = deferred.resolver;
        if (isFunction(fn)) {
          var val;
          try {
            val = fn(value);
          } catch (e) {
            resolver.reject(e);
            continue;
          }
          if (type === Resolver.NOTIFY) {
            resolver.notify(val);
          } else {
            resolver.fulfill(val);
          }
        } else {
          resolver[type](value);
        }
      }
    });
  };
  Promise.prototype.progress = function(onProgress) {
    return this.then(null, null, onProgress);
  };
  Promise.prototype["catch"] = function(onRejected) {
    return this.then(null, onRejected);
  };
  Promise.prototype["throw"] = function() {
    return this["catch"](function(error) {
      nextTick(function() {
        throw error;
      });
    });
  };
  Promise.prototype["finally"] = function(onResolved) {
    return this.then(onResolved, onResolved);
  };
  Promise.prototype["yield"] = function(value) {
    return this.then(function() {
      return value;
    });
  };
  Promise.prototype.tap = function(onFulfilled) {
    return this.then(onFulfilled)["yield"](this);
  };
  Promise.prototype.spread = function(onFulfilled, onRejected) {
    return this.then(function(val) {
      return onFulfilled.apply(this, val);
    }, onRejected);
  };
  Promise.resolve = Promise.cast = function(val) {
    if (isObject(val) && isFunction(val.then)) {
      return val;
    }
    return new Promise(val);
  };
  Promise.reject = function(err) {
    var resolver = Promise.defer();
    resolver.reject(err);
    return resolver.promise;
  };
  Promise.defer = function() {
    return new Resolver(new Promise());
  };
  Promise.each = function(list, iterator) {
    var resolver = Promise.defer(), len = list.length;
    if (len === 0) resolver.reject(TypeError());
    var i = 0;
    while (i < len) {
      iterator(list[i], i++, list);
    }
    return resolver;
  };
  Promise.all = function() {
    var list = parse(arguments), length = list.length, resolver = Promise.each(list, resolve);
    return resolver.promise;
    function reject(err) {
      resolver.reject(err);
    }
    function resolve(value, i, list) {
      if (isObject(value) && isFunction(value.then)) {
        value.then(function(val) {
          resolve(val, i, list);
        }, reject);
        return;
      }
      list[i] = value;
      if (--length === 0) {
        resolver.fulfill(list);
      }
    }
  };
  Promise.race = function() {
    var list = parse(arguments), resolver = Promise.each(list, resolve);
    return resolver.promise;
    function reject(err) {
      resolver.reject(err);
    }
    function resolve(value) {
      if (isObject(value) && isFunction(value.then)) {
        value.then(resolve, reject);
        return;
      }
      resolver.fulfill(value);
    }
  };
  Promise.wrap = function(fn) {
    return function() {
      var resolver = new Resolver(new Promise());
      arguments[arguments.length++] = function(err, val) {
        if (err) {
          resolver.reject(err);
        } else {
          resolver.fulfill(val);
        }
      };
      fn.apply(this, arguments);
      return resolver.promise;
    };
  };
  function isObject(obj) {
    return obj && typeof obj === "object";
  }
  function isFunction(fn) {
    return fn && typeof fn === "function";
  }
  function parse(obj) {
    if (obj.length === 1 && Array.isArray(obj[0])) {
      return obj[0];
    } else {
      var args = new Array(obj.length);
      for (var i = 0; i < args.length; ++i) {
        args[i] = obj[i];
      }
      return args;
    }
  }
})(this);
},{"subsequent":10}],9:[function(require,module,exports){
module.exports = require('./davy.js')
},{"./davy.js":8}],10:[function(require,module,exports){
module.exports = require('./subsequent.js')
},{"./subsequent.js":11}],11:[function(require,module,exports){
(function (process){
(function(global) {
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
      nextTick = function(fn) {
        enqueue(fn) && setImmediate(execute);
      };
    } else if (typeof process === "object" && process.nextTick) {
      nextTick = function(fn) {
        enqueue(fn) && process.nextTick(execute);
      };
    } else if (global.postMessage) {
      var message = "__subsequent", onMessage = function(e) {
        if (e.data === message) {
          e.stopPropagation && e.stopPropagation();
          execute();
        }
      };
      if (global.addEventListener) {
        global.addEventListener("message", onMessage, true);
      } else {
        global.attachEvent("onmessage", onMessage);
      }
      nextTick = function(fn) {
        enqueue(fn) && global.postMessage(message, "*");
      };
    } else {
      nextTick = function(fn) {
        enqueue(fn) && setTimeout(execute, 0);
      };
    }
    return nextTick;
  }();
  if (typeof define === "function" && define.amd) {
    define(function() {
      return nextTick;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = nextTick;
  } else {
    global.subsequent = nextTick;
  }
})(this);
}).call(this,require('_process'))
},{"_process":5}],12:[function(require,module,exports){
module.exports = require('./overtone.js')

},{"./overtone.js":13}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
module.exports = require('./streamlet.js')
},{"./streamlet.js":17}],15:[function(require,module,exports){
module.exports=require(10)
},{"./subsequent.js":16,"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js":10}],16:[function(require,module,exports){
module.exports=require(11)
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js":11,"_process":5}],17:[function(require,module,exports){
(function(global) {
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
    global.Streamlet = Observable;
    nextTick = global.subsequent;
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
      var index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    };
  };
  Observable.prototype.transform = function(transformer) {
    var controller = new Controller(new Observable(this.isSync));
    this.listen(transformer(controller), function(reason) {
      controller.fail(reason);
    }, function() {
      controller.done();
    });
    return controller.stream;
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
        if (test(data)) controller.add(data);
      };
    });
  };
  Observable.prototype.skip = function(count) {
    return this.transform(function(controller) {
      return function(data) {
        if (count-- > 0) {
          controller.done();
        } else {
          controller.add(data);
        }
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
  Observable.prototype.merge = function(streamTwo) {
    return Observable.merge(this, streamTwo);
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
          } else {
            throw e;
          }
        }
      }
    }
  };
  Observable.create = function(fn) {
    return new Observable(fn);
  };
  Observable.createSync = function(fn) {
    var stream = Observable.create(fn);
    stream.isSync = true;
    return stream;
  };
  Observable.control = function() {
    return new Controller(Observable.create());
  };
  Observable.controlSync = function() {
    return new Controller(Observable.createSync());
  };
  Observable.fromEvent = function(element, eventName) {
    return Observable.createSync(function(next) {
      element.addEventListener(eventName, function(e) {
        next(e);
      }, false);
    });
  };
  Observable.merge = function(streams) {
    streams = parse(streams);
    var controller = Observable.control(), listener = function(data) {
      controller.add(data);
    };
    var i = 0;
    while (i < streams.length) {
      streams[i++].listen(listener);
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
})(this);
},{"subsequent":15}],18:[function(require,module,exports){
module.exports=require(14)
},{"./streamlet.js":21,"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/index.js":14}],19:[function(require,module,exports){
module.exports=require(10)
},{"./subsequent.js":20,"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js":10}],20:[function(require,module,exports){
module.exports=require(11)
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js":11,"_process":5}],21:[function(require,module,exports){
module.exports=require(17)
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/streamlet.js":17,"subsequent":19}]},{},[1]);
