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
