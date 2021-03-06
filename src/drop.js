const Observable = require('streamlet')

module.exports = function (element) {
	const controller = Observable.control()

	Observable.fromEvent(element, 'dragenter').listen(function (e) {
		e.preventDefault()
		e.target.className = 'over'
	})

	Observable.fromEvent(element, 'dragover').listen(function (e) {
		e.preventDefault()
	})

	Observable.fromEvent(element, 'dragleave').listen(function (e) {
		e.target.className = ''
	})

	Observable.fromEvent(element, 'drop').listen(function (e) {
		e.stopPropagation()
		e.preventDefault()
		e.target.className = ''

		var files = e.dataTransfer.files,
			f = files[0],
			reader = new FileReader()

		reader.onload = function (e) {
			controller.add(e.target.result)
		}
		reader.readAsArrayBuffer(f)
	})

	return controller.stream
}
