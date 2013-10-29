require(['dialup', 'drop', 'player'], function (Dialup, drop, Player) {
	var dialup = new Dialup(location.origin.replace(/^https?/, 'ws'), 'room')

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
	});

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