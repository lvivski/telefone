import { Streamlet } from './vendor.js'

export default function (element) {
	const controller = Streamlet.control()

	element.ondragenter = function (e) {
		e.preventDefault()
		e.target.className = 'over'
	}

	element.ondragover = function (e) {
		e.preventDefault()
	}

	element.ondragleave = function (e) {
		e.target.className = ''
	}

	element.ondrop = function (e) {
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
	}

	return controller.stream
}
