const Observable = require('streamlet')

function Player(stream, options) {
	const player = document.createElement('div')
	player.className = 'player'
	player.appendChild(this.video(stream, options))
	player.appendChild(this.controls(stream, options))
	return player
}

Player.prototype.video = function (stream, options) {
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
	return video
}

Player.prototype.controls = function (stream, options) {
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
