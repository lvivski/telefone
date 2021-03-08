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
