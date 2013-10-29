function $(selector, context) {
  var result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}

NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter

require.config({
	baseUrl: '/scripts',
	paths: {
		'subsequent': '../components/subsequent/subsequent',
		'streamlet': '../components/streamlet/streamlet',
		'davy': '../components/davy/davy',
		'dialup': '../components/dialup/dialup'
	}
})

require(['app'])