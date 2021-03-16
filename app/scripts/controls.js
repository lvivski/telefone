import Settings from './settings.js'

function Controls(stream, dialup) {
	const controls = document.createElement('div')
	controls.id = 'controls'

	controls.appendChild(createTrackControl('mic', stream.getAudioTracks()[0]))
	controls.appendChild(createTrackControl('camera', stream.getVideoTracks()[0]))
	controls.appendChild(createScreenShareControl(dialup))
	// controls.appendChild(createSettingsControl(new Settings(dialup)))
	controls.appendChild(createControl('chat', false))

	return controls
}

function createTrackControl(id, track) {
	return createControl(id, track.enabled, () => track.enabled = !track.enabled)
}

function createSettingsControl(settings) {
	const fragment = document.createDocumentFragment()
	fragment.appendChild(settings)
	fragment.appendChild(createControl('settings', false, () => {}))
	return fragment
}

async function toggle(dialup) {
	if (toggle.stream) {
		const stream = toggle.stream
		toggle.stream = null
		dialup.removeStream(stream)
		throw new Error('sharing disabled')
	}
	return toggle.stream = await dialup.getDisplayStream()
}

function createScreenShareControl(dialup) {
	return createControl('screen', false, function () {
		toggle(dialup).then(
			() => this.checked = true,
			(e) => {
				console.error(e)
				this.checked = false
			},
		)
	})
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
