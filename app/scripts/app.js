require.config({
	baseUrl: '/components',
	paths: {
		'subsequent': 'subsequent/subsequent',
		'streamlet': 'streamlet/streamlet',
		'davy': 'davy/davy',
		'dialup': 'dialup/dialup'
	}
})

function $(selector, context) {
  var result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}

NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter

define('dnd', ['streamlet'], function (Stream) {
	return function (element) {
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

			reader.onload = function(e) {
				stream.add(e.target.result)
			}
			reader.readAsArrayBuffer(f)
		})

		return stream
	}
})

require(['dialup', 'dnd'], function (Dialup, dnd) {
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
		var video = document.createElement('video')
		video.autoplay = true
		video.muted = true
		video.src = URL.createObjectURL(stream)
		$('#local').appendChild(video)
	});

	dialup.onAdd.listen(function (message) {
		var video = document.createElement('video')
		video.id = 'remote' + message.id
		video.autoplay = true
		video.src = URL.createObjectURL(message.stream)
		dnd(video).listen(function (data) {
			dialup.send(message.id, data)
		})
		$('#remote').appendChild(video)
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
			video.parentNode.removeChild(video)
		}
	})
})