function Controls(stream, options) {
	const controls = document.createElement('div')
	controls.id = 'controls'

	controls.appendChild(createTrackControl('mic', stream.getAudioTracks()[0]))
	controls.appendChild(createTrackControl('camera', stream.getVideoTracks()[0]))
	controls.appendChild(createScreenShareControl())
	controls.appendChild(createControl('chat', false))

	return controls
}

function createTrackControl(id, track) {
	return createControl(id, track.enabled, () => track.enabled = !track.enabled)
}

function createScreenShareControl() {
	return createControl('screen', false, () => {})
}

function createControl(id, checked, onChange) {
	const container = document.createElement('span')
	const checkbox = document.createElement('input')
	checkbox.id = id + '_input'
	checkbox.type = 'checkbox'
	checkbox.checked = checked
	checkbox.onchange = onChange

	const label = document.createElement('label')
	label.htmlFor = id + '_input'
	label.className = 'icon'

	container.appendChild(checkbox)
	container.appendChild(label)

	return container
}

export default Controls
