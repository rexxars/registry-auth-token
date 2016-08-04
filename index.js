var url = require('url')
var tokenKey = ':_authToken'
var userKey = ':username'
var passwordKey = ':_password'

module.exports = function (registryUrl, opts) {
  var options = opts || {}
  var npmrc = require('rc')('npm', {registry: 'https://registry.npmjs.org/'})
  var parsed = url.parse(registryUrl || npmrc.registry, false, true)

  var match
  var basicToken
  var pathname

  while (!match && !basicToken && pathname !== '/') {
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

    var username = npmrc[regUrl + userKey] || npmrc[regUrl + '/' + userKey]
    var password = npmrc[regUrl + passwordKey] || npmrc[regUrl + '/' + passwordKey]

    if (username && password) {

      // passwords are base64 encoded, so we need to decode it
      // See https://github.com/npm/npm/blob/v3.10.6/lib/config/set-credentials-by-uri.js#L26
      password = new Buffer(password, 'base64').toString('utf8')

      // a basic auth token is base64 encoded 'username:password'
      // See https://github.com/npm/npm/blob/v3.10.6/lib/config/get-credentials-by-uri.js#L70
      basicToken = new Buffer(username + ':' + password).toString('base64')

      // we found a basicToken token so let's exit the loop
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

  if (basicToken !== undefined) {
    return {token: basicToken, type: 'Basic'}
  }

  return undefined
}
