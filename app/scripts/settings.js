function Settings(dialup) {
	const settings = document.createElement('div')
	settings.id = 'settings'
	dialup.getMediaDevices().then(devices => {
		settings.appendChild(createSetting('audio', devices.audio))
		settings.appendChild(createSetting('video', devices.video))
	})

	return settings
}


function createSetting(type, devices) {
	const setting = document.createElement('div')
	const select = document.createElement('select')
	for (const device of devices) {
		const option = document.createElement('option')
		option.value = device.id
		const textNode = document.createTextNode(device.label)
		option.appendChild(textNode)
		select.appendChild(option)
	}
	setting.appendChild(select)

	return setting
}


export default Settings
