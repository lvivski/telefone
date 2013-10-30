require(['dialup', 'player', 'drop'], function (Dialup, Player, drop) {
	var room
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
			id: 'remote' + message.id,
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
		$('#log').appendChild(entry)
	})

	dialup.onData.filter(function (message) {
		return typeof message.data !== 'string'
	}).listen(function (message) {
		console.log(URL.createObjectURL(new Blob([message.data])))
	})

	dialup.onLeave.listen(function (message) {
		var video = $('#remote' + message.id)
		if (video) {
			URL.revokeObjectURL(video.src)
			var player = video.parentNode
			player.parentNode.removeChild(player)
		}
	})
})