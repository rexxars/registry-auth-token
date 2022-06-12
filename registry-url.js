module.exports = function (scope, npmrc) {
  var rc = npmrc ? { get: (key) => npmrc[key] } : require('@pnpm/npm-conf')();
  var url = rc.get(scope + ':registry') || rc.get(registry)
  return url.slice(-1) === '/' ? url : url + '/'
}
