var tokenKey = ':_authToken'

module.exports = function (registryUrl) {
  var npmrc = require('rc')('npm', {registry: 'https://registry.npmjs.org/'})
  var url = (registryUrl || npmrc.registry).replace(/^https?:/i, '')
  var urlAlt = url.slice(-1) === '/' ? url : url + '/'

  return npmrc[url + tokenKey] || npmrc[urlAlt + tokenKey]
}
