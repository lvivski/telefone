(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/app.js":[function(require,module,exports){
var Dialup = require('dialup/client'),
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
	window.on('popstate').listen(function (e) {
		location = location
	})
} else {
	room = location.pathname.slice(1)
}

var dialup = new Dialup(location.origin.replace(/^https?/, 'ws'), room),
    alone = false

$('#chat').on('change')
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

},{"./bootstrap":"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/bootstrap.js","./drop":"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/drop.js","./player":"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/player.js","dialup/client":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/client.js"}],"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/bootstrap.js":[function(require,module,exports){
module.exports = function $(selector, context) {
  var result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}


NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter

},{}],"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/drop.js":[function(require,module,exports){
var Stream = require('streamlet');

module.exports = function (element) {
	var stream = new Stream

	element.on('dragenter').listen(function (e) {
		e.preventDefault()
		e.target.className = 'over'
	})

	element.on('dragover').listen(function (e) {
		e.preventDefault()
	})

	element.on('dragleave').listen(function (e) {
		e.target.className = ''
	})

	element.on('drop').listen(function (e) {
		e.stopPropagation()
		e.preventDefault()
		e.target.className = ''

		var files = e.dataTransfer.files,
			f = files[0],
			reader = new FileReader()

		reader.onload = function (e) {
			stream.add(e.target.result)
		}
		reader.readAsArrayBuffer(f)
	})

	return stream
}

},{"streamlet":"/Users/lvivski/Projects/webrtc/telefone/node_modules/streamlet/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/player.js":[function(require,module,exports){
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
	mute.on('click').listen(function() {
		audio.enabled = !audio.enabled
		mute.classList.toggle('off')
	})
	controls.appendChild(mute)

	var video = stream.getVideoTracks()[0]
	var black = document.createElement('button')
	black.textContent = 'V'
	black.on('click').listen(function() {
		video.enabled = !video.enabled
		black.classList.toggle('off')
	})
	controls.appendChild(black)

	return controls
}

module.exports = Player

},{}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/client.js":[function(require,module,exports){
module.exports = require('./dialup.js');

},{"./dialup.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/dialup.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/dialup.js":[function(require,module,exports){
(function(global) {
  "use strict";
  if (typeof global !== "Window") {
    global = window;
  }
  var navigator = global.navigator, RTCPeerConnection = global.mozRTCPeerConnection || global.webkitRTCPeerConnection || global.PeerConnection, getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia).bind(navigator), RTCIceCandidate = global.mozRTCIceCandidate || global.RTCIceCandidate, RTCSessionDescription = global.mozRTCSessionDescription || global.RTCSessionDescription, AudioContext = global.webkitAudioContext || global.mozAudioContext || global.AudioContext, MediaStream = global.webkitMediaStream || global.mozMediaStream || global.MediaStream;
  global.URL = global.URL || global.webkitURL || global.msURL;
  var Stream, Promise;
  if (typeof define === "function" && define.amd) {
    define([ "streamlet", "davy" ], function(Streamlet, Davy) {
      Stream = Streamlet;
      Promise = Davy;
      return Dialup;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Dialup;
    Stream = require("streamlet");
    Promise = require("davy");
  } else {
    global.Dialup = Dialup;
    Stream = global.Stream;
    Promise = global.Davy;
  }
  function Dialup(url, room) {
    var me = null, sockets = [], connections = {}, data = {}, streams = [], stream = new Stream(), socket = new WebSocket(url);
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
      stream.add(JSON.parse(e.data));
    };
    this.onOffer = stream.filter(function(message) {
      return message.type === "offer";
    });
    this.onAnswer = stream.filter(function(message) {
      return message.type === "answer";
    });
    this.onCandidate = stream.filter(function(message) {
      return message.type === "candidate";
    });
    this.onNew = stream.filter(function(message) {
      return message.type === "new";
    });
    this.onPeers = stream.filter(function(message) {
      return message.type === "peers";
    });
    this.onLeave = stream.filter(function(message) {
      return message.type === "leave";
    });
    this.onAdd = stream.filter(function(message) {
      return message.type === "add";
    });
    this.onRemove = stream.filter(function(message) {
      return message.type === "remove";
    });
    this.onData = stream.filter(function(message) {
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
        streams.push(stream);
        for (var i = 0; i < sockets.length; ++i) {
          var socket = sockets[i];
          connections[socket] = createPeerConnection(socket);
        }
        for (i = 0; i < streams.length; ++i) {
          var stream = streams[i];
          for (var socket in connections) {
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
        stream.add({
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
        stream.add({
          type: "add",
          id: id,
          stream: e.stream
        });
      };
      pc.onremovestream = function(e) {
        stream.add({
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
},{"davy":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/index.js","streamlet":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/davy.js":[function(require,module,exports){
(function(global) {
  "use strict";
  var next;
  if (typeof define === "function" && define.amd) {
    define([ "subsequent" ], function(subsequent) {
      next = subsequent;
      return Promise;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Promise;
    next = require("subsequent");
  } else {
    global.Davy = Promise;
    next = global.subsequent;
  }
  function Promise(fn) {
    this.value = undefined;
    this.__deferreds = [];
    if (arguments.length > 0) {
      var resolver = new Resolver(this);
      if (typeof fn == "function") {
        try {
          fn(function(val) {
            resolver.fulfill(val);
          }, function(err) {
            resolver.reject(err);
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
  Promise.prototype.then = function(onFulfill, onReject) {
    var resolver = new Resolver(new Promise()), deferred = defer(resolver, onFulfill, onReject);
    if (this.isFulfilled || this.isRejected) {
      resolve(deferred, this.isFulfilled ? Promise.SUCCESS : Promise.FAILURE, this.value);
    } else {
      this.__deferreds.push(deferred);
    }
    return resolver.promise;
  };
  Promise.SUCCESS = "fulfill";
  Promise.FAILURE = "reject";
  function defer(resolver, fulfill, reject) {
    return {
      resolver: resolver,
      fulfill: fulfill,
      reject: reject
    };
  }
  function Resolver(promise) {
    this.promise = promise;
  }
  Resolver.prototype.fulfill = function(value) {
    var promise = this.promise;
    if (promise.isFulfilled || promise.isRejected) return;
    if (value === promise) throw new TypeError("Can't resolve a promise with itself.");
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
  Resolver.prototype.complete = function(value) {
    var promise = this.promise, deferreds = promise.__deferreds, type = promise.isFulfilled ? Promise.SUCCESS : Promise.FAILURE;
    promise.value = value;
    for (var i = 0; i < deferreds.length; ++i) {
      resolve(deferreds[i], type, value);
    }
    promise.__deferreds = undefined;
  };
  function resolve(deferred, type, value) {
    var fn = deferred[type], resolver = deferred.resolver;
    if (isFunction(fn)) {
      next(function() {
        try {
          value = fn(value);
          resolver.fulfill(value);
        } catch (e) {
          resolver.reject(e);
        }
      });
    } else {
      resolver[type](value);
    }
  }
  Promise.prototype["catch"] = function(onRejected) {
    return this.then(null, onRejected);
  };
  Promise.prototype["throw"] = function() {
    return this["catch"](function(error) {
      next(function() {
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
    for (var i = 0; i < len; ++i) {
      iterator(list[i], i);
    }
    return resolver;
  };
  Promise.all = function() {
    var list = parse(arguments), length = list.length, resolver = Promise.each(list, resolve);
    return resolver.promise;
    function reject(err) {
      resolver.reject(err);
    }
    function resolve(value, i) {
      if (isObject(value) && isFunction(value.then)) {
        value.then(function(val) {
          resolve(val, i);
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
},{"subsequent":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/index.js":[function(require,module,exports){
module.exports = require('./davy.js')
},{"./davy.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/davy.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js":[function(require,module,exports){
module.exports = require('./subsequent.js')
},{"./subsequent.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js":[function(require,module,exports){
(function (process){
(function(global) {
  "use strict";
  var next = function(next, buffer, length, tick) {
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
      next = function(fn) {
        enqueue(fn) && setImmediate(execute);
      };
    } else if (typeof process === "object" && process.nextTick) {
      next = function(fn) {
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
      next = function(fn) {
        enqueue(fn) && global.postMessage(message, "*");
      };
    } else {
      next = function(fn) {
        enqueue(fn) && setTimeout(execute, 0);
      };
    }
    return next;
  }();
  if (typeof define === "function" && define.amd) {
    define(function() {
      return next;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = next;
  } else {
    global.subsequent = next;
  }
})(this);
}).call(this,require('_process'))
},{"_process":"/Users/lvivski/Projects/webrtc/telefone/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/index.js":[function(require,module,exports){
module.exports = require('./streamlet.js')
},{"./streamlet.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/streamlet.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/node_modules/subsequent/index.js":[function(require,module,exports){
module.exports=require("/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js")
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/node_modules/subsequent/subsequent.js":[function(require,module,exports){
module.exports=require("/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js")
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/streamlet.js":[function(require,module,exports){
(function(global) {
  "use strict";
  var next;
  if (typeof define === "function" && define.amd) {
    define([ "subsequent" ], function(subsequent) {
      next = subsequent;
      return Stream;
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = Stream;
    next = require("subsequent");
  } else {
    global.Streamlet = Stream;
    next = global.subsequent;
  }
  function Stream() {
    this.listeners = [];
  }
  function handle(listener, data) {
    next(function() {
      listener(data);
    });
  }
  Stream.prototype.add = function(data) {
    for (var i = 0; i < this.listeners.length; ++i) {
      handle(this.listeners[i], data);
    }
  };
  Stream.prototype.listen = function(listener) {
    this.listeners.push(listener);
  };
  Stream.prototype.transform = function(transformer) {
    var stream = new this.constructor();
    this.listen(transformer(stream));
    return stream;
  };
  Stream.prototype.map = function(convert) {
    return this.transform(function(stream) {
      return function(data) {
        data = convert(data);
        stream.add(data);
      };
    });
  };
  Stream.prototype.filter = function(test) {
    return this.transform(function(stream) {
      return function(data) {
        if (test(data)) stream.add(data);
      };
    });
  };
  Stream.prototype.skip = function(count) {
    return this.transform(function(stream) {
      return function(data) {
        if (count-- > 0) return;
        stream.add(data);
      };
    });
  };
  Stream.prototype.take = function(count) {
    return this.transform(function(stream) {
      return function(data) {
        if (count-- > 0) {
          stream.add(data);
        }
      };
    });
  };
  Stream.prototype.expand = function(expand) {
    return this.transform(function(stream) {
      return function(data) {
        data = expand(data);
        for (var i in data) {
          stream.add(data[i]);
        }
      };
    });
  };
  function SyncStream() {
    Stream.call(this);
  }
  SyncStream.prototype = Object.create(Stream.prototype);
  SyncStream.prototype.constructor = SyncStream;
  SyncStream.prototype.add = function(data) {
    for (var i = 0; i < this.listeners.length; ++i) {
      this.listeners[i].call(null, data);
    }
  };
  function EventStream(element, event) {
    var stream = new SyncStream();
    element.addEventListener(event, function(e) {
      stream.add(e);
    }, false);
    return stream;
  }
  if (typeof window !== "undefined") {
    window.on = Node.prototype.on = function(event) {
      return new EventStream(this, event);
    };
  }
})(this);
},{"subsequent":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/node_modules/subsequent/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/streamlet/index.js":[function(require,module,exports){
module.exports=require("/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/index.js")
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/index.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/streamlet/node_modules/subsequent/index.js":[function(require,module,exports){
module.exports=require("/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js")
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/index.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/streamlet/node_modules/subsequent/subsequent.js":[function(require,module,exports){
module.exports=require("/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js")
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/davy/node_modules/subsequent/subsequent.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/streamlet/streamlet.js":[function(require,module,exports){
module.exports=require("/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/streamlet.js")
},{"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/streamlet.js":"/Users/lvivski/Projects/webrtc/telefone/node_modules/dialup/node_modules/streamlet/streamlet.js"}],"/Users/lvivski/Projects/webrtc/telefone/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
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

},{}]},{},["/Users/lvivski/Projects/webrtc/telefone/app/scripts/src/app.js"]);
