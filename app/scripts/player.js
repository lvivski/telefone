function Player(stream, options) {
	const player = document.createElement('div')
	player.className = 'player'
	player.appendChild(createVideo(stream, options))
	return player
}

function createVideo(stream, options) {
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

	stream.onremovetrack = function (e) {
		if (stream.getTracks().length === 0) {
			URL.revokeObjectURL(video.src)
			const player = video.parentNode
			player.parentNode.removeChild(player)
		}
	}

	return video
}

export default Player
