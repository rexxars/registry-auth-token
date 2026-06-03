import npmConf from '@pnpm/npm-conf'

const tokenKey = ':_authToken'
const legacyTokenKey = ':_auth'
const userKey = ':username'
const passwordKey = ':_password'

function getAuthInfoForUrl(regUrl, npmrc) {
  const bearerAuth = getBearerToken(
    npmrc.get(regUrl + tokenKey) || npmrc.get(regUrl + '/' + tokenKey),
  )
  if (bearerAuth) {
    return bearerAuth
  }

  const username = npmrc.get(regUrl + userKey) || npmrc.get(regUrl + '/' + userKey)
  const password =
    npmrc.get(regUrl + passwordKey) || npmrc.get(regUrl + '/' + passwordKey)
  const basicAuth = getTokenForUsernameAndPassword(username, password)
  if (basicAuth) {
    return basicAuth
  }

  const basicAuthWithToken = getLegacyAuthToken(
    npmrc.get(regUrl + legacyTokenKey) || npmrc.get(regUrl + '/' + legacyTokenKey),
  )
  if (basicAuthWithToken) {
    return basicAuthWithToken
  }

  return
}

function getBearerToken(tok) {
  if (!tok) {
    return
  }

  const token = replaceEnvironmentVariable(tok)
  return {token, type: 'Bearer'}
}

function getLegacyAuthInfo(npmrc) {
  if (!npmrc.get('_auth')) {
    return
  }

  const token = replaceEnvironmentVariable(npmrc.get('_auth'))
  return {token, type: 'Basic'}
}

function getLegacyAuthToken(tok) {
  if (!tok) {
    return
  }

  const token = replaceEnvironmentVariable(tok)
  return {token, type: 'Basic'}
}

function getRegistryAuthInfo(checkUrl, options) {
  let parsed =
    checkUrl instanceof URL
      ? checkUrl
      : new URL(checkUrl.startsWith('//') ? `http:${checkUrl}` : checkUrl)
  let pathname

  while (pathname !== '/' && parsed.pathname !== pathname) {
    pathname = parsed.pathname || '/'

    const regUrl = '//' + parsed.host + pathname.replace(/\/$/, '')
    const authInfo = getAuthInfoForUrl(regUrl, options.npmrc)
    if (authInfo) {
      return authInfo
    }

    if (!options.recursive) {
      return String(checkUrl).endsWith('/')
        ? undefined
        : getRegistryAuthInfo(new URL('./', parsed), options)
    }

    parsed.pathname = urlResolve(normalizePath(pathname), '..') || '/'
  }

  return
}

function getRegistryAuthToken(checkUrl, options) {
  if (typeof checkUrl === 'object' && checkUrl !== null && !(checkUrl instanceof URL)) {
    options = {...checkUrl}
    checkUrl = undefined
  } else {
    options = options ? {...options} : {}
  }

  const providedNpmrc = options.npmrc
  options.npmrc = (
    providedNpmrc ? {config: {get: (key) => providedNpmrc[key]}} : npmConf()
  ).config

  checkUrl = checkUrl || options.npmrc.get('registry') || npmConf.defaults.registry
  return getRegistryAuthInfo(checkUrl, options) || getLegacyAuthInfo(options.npmrc)
}

function getRegistryUrl(scope, npmrc) {
  const rc = npmrc ? {config: {get: (key) => npmrc[key]}} : npmConf()
  const url =
    rc.config.get(scope + ':registry') ||
    rc.config.get('registry') ||
    npmConf.defaults.registry
  return url.endsWith('/') ? url : url + '/'
}

function getTokenForUsernameAndPassword(username, password) {
  if (!username || !password) {
    return
  }

  const pass = Buffer.from(replaceEnvironmentVariable(password), 'base64').toString(
    'utf8',
  )
  const token = Buffer.from(username + ':' + pass, 'utf8').toString('base64')

  return {password: pass, token, type: 'Basic', username}
}

function normalizePath(path) {
  return path.endsWith('/') ? path : path + '/'
}

function replaceEnvironmentVariable(token) {
  return token.replace(/^\$\{?([^}]*)\}?$/, (fullMatch, envVar) => process.env[envVar])
}

function urlResolve(from, to) {
  const resolvedUrl = new URL(
    to,
    new URL(from.startsWith('//') ? `./${from}` : from, 'resolve://'),
  )
  if (resolvedUrl.protocol === 'resolve:') {
    const {hash, pathname, search} = resolvedUrl
    return pathname + search + hash
  }
  return resolvedUrl.toString()
}

export {getRegistryAuthToken, getRegistryUrl}
