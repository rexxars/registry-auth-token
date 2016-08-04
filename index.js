var url = require('url')
var tokenKey = ':_authToken'

module.exports = function (registryUrl, opts) {
  var options = opts || {}
  var npmrc = require('rc')('npm', {registry: 'https://registry.npmjs.org/'})
  var parsed = url.parse(registryUrl || npmrc.registry, false, true)

  var match
  var pathname

  while (!match && pathname !== '/') {
    pathname = parsed.pathname || '/'
    var regUrl = '//' + parsed.host + pathname.replace(/\/$/, '')

    // try to get bearer token
    match = npmrc[regUrl + tokenKey] || npmrc[regUrl + '/' + tokenKey]

    if (match) {
      // check if bearer token
      match = match.replace(/^\$\{?([^}]*)\}?$/, function (fullMatch, envVar) {
        return process.env[envVar]
      })
      // we found a bearer token so let's exit the loop
      break
    }

    if (!options.recursive) {
      break
    }

    parsed.pathname = url.resolve(pathname, '..')
  }

  if (match !== undefined) {
    return {token: match, type: 'Bearer'}
  }


  return undefined
}
