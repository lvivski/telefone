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
