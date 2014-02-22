define(['streamlet'], function (Stream) {
	return function (element) {
		var stream = new Stream

		element.on('dragenter').listen(function (e) {
			e.preventDefault()
			e.target.className = 'over'
		})

		element.on('dragover').listen(function (e) {
			e.preventDefault()
		})

		element.on('dragleave').listen(function (e) {
			e.target.className = ''
		})

		element.on('drop').listen(function (e) {
			e.stopPropagation()
			e.preventDefault()
			e.target.className = ''

			var files = e.dataTransfer.files,
			    f = files[0],
			    reader = new FileReader()

			reader.onload = function(e) {
				stream.add(e.target.result)
			}
			reader.readAsArrayBuffer(f)
		})

		return stream
	}
})
