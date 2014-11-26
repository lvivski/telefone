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
