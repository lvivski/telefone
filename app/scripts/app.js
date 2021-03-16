import './layout.js'

import { Dialup } from './vendor.js'
import Player from './player.js'
import Controls from './controls.js'
import drop from './drop.js'
import { $, $$ } from './select.js'

let room

if (location.pathname === '/') {
	room = fancyName()

	history.pushState(null, '', room)
	window.onpopstate = function (e) {
		location = location
	}
} else {
	room = location.pathname.slice(1)
}

const dialup = new Dialup(location.origin.replace(/^http/, 'ws'), room)

dialup.onpeers = function ({data: {connections}}) {
	if (connections.length === 0) {
		prompt('You are alone here, send this URL to your friends', location)
	}

	dialup.getUserStream(true, true).then(function (stream) {
		const controls = new Controls(stream, dialup)
		$('#conference').appendChild(controls)

		const player = new Player(stream, {
			local: true
		})

		$('#cameras').insertBefore(player, $('#cameras').firstChild)
	})
}

$('#input').onchange = function (e) {
	if (!e.target.value) return
	dialup.broadcast(e.target.value)
	var entry = document.createElement('li')
	entry.innerHTML = e.target.value
	$('#log').appendChild(entry)
	e.target.value = ''
}

dialup.onadd = function ({data: {id, stream}}) {
	const streamId = stream.id.replace('{', '').replace('}', '')
	if (!$('[data-stream="' + streamId + '"]')) {
		if (!$('[data-client="' + id + '"]')) {
			const player = new Player(stream, {
				props: {
					'data-client': id,
					'data-stream': streamId
				}
			})
			drop(player).listen(function (data) {
				dialup.send(id, data)
			})
			$('#cameras').appendChild(player)
		} else {
			const player = new Player(stream, {
				props: {
					'data-client': id,
					'data-stream': streamId
				}
			})
			$('#screen').appendChild(player)
		}

	}
}

dialup.onleave = function ({data: {id}}) {
	$$('[data-client="' + id + '"]').forEach(video => {
		URL.revokeObjectURL(video.src)
		const player = video.parentNode
		player.parentNode.removeChild(player)
	})
}

dialup.ondata = function ({data: {data}}) {
	if (typeof data === 'string') {
		const entry = document.createElement('li')
		entry.innerHTML = '<b>' + data + '</b>'
		$('#log').insertBefore(entry, $('#log').firstChild)
	} else {
		const entry = document.createElement('li')``
		const url = URL.createObjectURL(new Blob([data]))
		entry.innerHTML = '<a href="' + url + '" target="_blank">Download File</a>'
		$('#log').insertBefore(entry, $('#log').firstChild)
	}
}

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
