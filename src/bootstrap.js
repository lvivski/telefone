module.exports = function $(selector, context) {
  const result = (context || document).querySelectorAll(selector)
  return result.length > 1 ? result : result[0]
}


NodeList.prototype.forEach = [].forEach

NodeList.prototype.filter = [].filter
