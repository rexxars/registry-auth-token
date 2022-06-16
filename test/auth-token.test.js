const fs = require('fs')
const path = require('path')
const mocha = require('mocha')
const assert = require('assert')
const requireUncached = require('require-uncached')

const npmRcPath = path.join(__dirname, '..', '.npmrc')
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const describe = mocha.describe
const it = mocha.it

const decodeBase64 = str => Buffer.from(str, 'base64').toString('utf8')
const encodeBase64 = str => Buffer.from(str, 'utf8').toString('base64')

/* eslint max-nested-callbacks: ["error", 4] */

describe('auth-token', function () {
  afterEach(function (done) {
    fs.unlink(npmRcPath, function () {
      done()
    })
  })

  it('should read global if no local is found', function () {
    const getAuthToken = requireUncached('../index')
    getAuthToken()
  })

  it('should return undefined if no auth token is given for registry', function (done) {
    fs.writeFile(npmRcPath, 'registry=http://registry.npmjs.eu/', function (err) {
      const getAuthToken = requireUncached('../index')
      assert(!err, err)
      assert(!getAuthToken())
      done()
    })
  })

  describe('legacy auth token', function () {
    it('should return auth token if it is defined in the legacy way via the `_auth` key', function (done) {
      const content = [
        '_auth=foobar',
        'registry=http://registry.foobar.eu/'
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Basic' })
        done()
      })
    })

    it('should return legacy auth token defined by reference to an environment variable (with curly braces)', function (done) {
      const environmentVariable = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        '_auth=${' + environmentVariable + '}',
        'registry=http://registry.foobar.eu/'
      ].join('\n')

      process.env[environmentVariable] = 'foobar'

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Basic' })
        delete process.env[environmentVariable]
        done()
      })
    })

    it('should return legacy auth token defined by reference to an environment variable (without curly braces)', function (done) {
      const environmentVariable = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        '_auth=$' + environmentVariable,
        'registry=http://registry.foobar.eu/'
      ].join('\n')

      process.env[environmentVariable] = 'foobar'

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Basic' })
        delete process.env[environmentVariable]
        done()
      })
    })
  })

  describe('bearer token', function () {
    it('should return auth token if registry is defined', function (done) {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=foobar', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Bearer' })
        done()
      })
    })

    it('should use npmrc passed in', function (done) {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=foobar', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const npmrc = {
          'registry': 'http://registry.foobar.eu/',
          '//registry.foobar.eu/:_authToken': 'qar'
        }
        assert.deepStrictEqual(getAuthToken({ npmrc: npmrc }), { token: 'qar', type: 'Bearer' })
        done()
      })
    })

    it('should return auth token if registry url has port specified', function (done) {
      const content = [
        'registry=http://localhost:8770/',
        // before the patch this token was selected.
        '//localhost/:_authToken=ohno',
        '//localhost:8770/:_authToken=beepboop', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'beepboop', type: 'Bearer' })
        done()
      })
    })

    it('should return auth token defined by reference to an environment variable (with curly braces)', function (done) {
      const environmentVariable = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:_authToken=${' + environmentVariable + '}', ''
      ].join('\n')
      process.env[environmentVariable] = 'foobar'

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Bearer' })
        delete process.env[environmentVariable]
        done()
      })
    })

    it('should return auth token defined by reference to an environment variable (without curly braces)', function (done) {
      const environmentVariable = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:_authToken=$' + environmentVariable, ''
      ].join('\n')
      process.env[environmentVariable] = 'foobar'

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Bearer' })
        delete process.env[environmentVariable]
        done()
      })
    })

    it('should try with and without a slash at the end of registry url', function (done) {
      const content = [
        'registry=http://registry.foobar.eu',
        '//registry.foobar.eu:_authToken=barbaz', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'barbaz', type: 'Bearer' })
        done()
      })
    })

    it('should fetch for the registry given (if defined)', function (done) {
      const content = [
        '//registry.foobar.eu:_authToken=barbaz',
        '//registry.blah.foo:_authToken=whatev',
        '//registry.last.thing:_authToken=yep', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken('//registry.blah.foo'), { token: 'whatev', type: 'Bearer' })
        done()
      })
    })

    it('recursively finds registries for deep url if option is set', function (done, undef) {
      const opts = { recursive: true }
      const content = [
        '//registry.blah.com/foo:_authToken=whatev',
        '//registry.blah.org/foo/bar:_authToken=recurseExactlyOneLevel',
        '//registry.blah.edu/foo/bar/baz:_authToken=recurseNoLevel',
        '//registry.blah.eu:_authToken=yep', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken('https://registry.blah.edu/foo/bar/baz', opts), { token: 'recurseNoLevel', type: 'Bearer' })
        assert.deepStrictEqual(getAuthToken('https://registry.blah.org/foo/bar/baz', opts), { token: 'recurseExactlyOneLevel', type: 'Bearer' })
        assert.deepStrictEqual(getAuthToken('https://registry.blah.com/foo/bar/baz', opts), { token: 'whatev', type: 'Bearer' })
        assert.deepStrictEqual(getAuthToken('http://registry.blah.eu/what/ever', opts), { token: 'yep', type: 'Bearer' })
        assert.deepStrictEqual(getAuthToken('http://registry.blah.eu//what/ever', opts), undefined, 'does not hang')
        assert.strictEqual(getAuthToken('//some.registry', opts), undef)
        done()
      })
    })

    it('should try both with and without trailing slash', function (done) {
      fs.writeFile(npmRcPath, '//registry.blah.com:_authToken=whatev', function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken('https://registry.blah.com'), { token: 'whatev', type: 'Bearer' })
        done()
      })
    })

    it('should prefer bearer token over basic token', function (done) {
      const content = [
        'registry=http://registry.foobar.eu/',
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=bearerToken',
        '//registry.foobar.eu/:_password=' + encodeBase64('foobar'),
        '//registry.foobar.eu/:username=foobar', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken('//registry.foobar.eu'), { token: 'bearerToken', type: 'Bearer' })
        done()
      })
    })

    it('"nerf darts" registry urls', function (done, undef) {
      fs.writeFile(npmRcPath, '//contoso.pkgs.visualstudio.com/_packaging/MyFeed/npm/:_authToken=heider', function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(
          getAuthToken('https://contoso.pkgs.visualstudio.com/_packaging/MyFeed/npm/registry'),
          { token: 'heider', type: 'Bearer' }
        )
        done()
      })
    })
  })

  describe('basic token', function () {
    it('should return undefined if password or username are missing', function (done, undef) {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_password=' + encodeBase64('foobar'),
        '//registry.foobar.com/:username=foobar', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.strictEqual(getAuthToken('//registry.foobar.eu'), undef)
        assert.strictEqual(getAuthToken('//registry.foobar.com'), undef)
        done()
      })
    })

    it('should return basic token if username and password are defined', function (done) {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_password=' + encodeBase64('foobar'),
        '//registry.foobar.eu/:username=foobar', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken()
        assert.deepStrictEqual(token, {
          token: 'Zm9vYmFyOmZvb2Jhcg==',
          type: 'Basic',
          username: 'foobar',
          password: 'foobar'
        })
        assert.strictEqual(decodeBase64(token.token), 'foobar:foobar')
        done()
      })
    })

    it('should return basic token if _auth is base64 encoded', function (done) {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_auth=' + encodeBase64('foobar:foobar')
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken()
        assert.deepStrictEqual(token, {
          token: 'Zm9vYmFyOmZvb2Jhcg==',
          type: 'Basic'
        })
        assert.strictEqual(decodeBase64(token.token), 'foobar:foobar')
        done()
      })
    })

    it('should return basic token if registry url has port specified', function (done) {
      const content = [
        'registry=http://localhost:8770/',
        // before the patch this token was selected.
        '//localhost/:_authToken=ohno',
        '//localhost:8770/:_password=' + encodeBase64('foobar'),
        '//localhost:8770/:username=foobar', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken()
        assert.deepStrictEqual(token, {
          token: 'Zm9vYmFyOmZvb2Jhcg==',
          type: 'Basic',
          username: 'foobar',
          password: 'foobar'
        })
        assert.strictEqual(decodeBase64(token.token), 'foobar:foobar')
        done()
      })
    })

    it('should return password defined by reference to an environment variable (with curly braces)', function (done) {
      const environmentVariable = '__REGISTRY_PASSWORD__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:username=username',
        '//registry.foobar.cc/:_password=${' + environmentVariable + '}', ''
      ].join('\n')
      process.env[environmentVariable] = encodeBase64('password')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken()
        assert.deepStrictEqual(token, {
          type: 'Basic',
          username: 'username',
          password: 'password',
          token: 'dXNlcm5hbWU6cGFzc3dvcmQ='
        })
        assert.strictEqual(decodeBase64(token.token), 'username:password')
        delete process.env[environmentVariable]
        done()
      })
    })

    it('should return password defined by reference to an environment variable (without curly braces)', function (done) {
      const environmentVariable = '__REGISTRY_PASSWORD__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:username=username',
        '//registry.foobar.cc/:_password=$' + environmentVariable, ''
      ].join('\n')
      process.env[environmentVariable] = encodeBase64('password')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken()
        assert.deepStrictEqual(token, {
          type: 'Basic',
          username: 'username',
          password: 'password',
          token: 'dXNlcm5hbWU6cGFzc3dvcmQ='
        })
        assert.strictEqual(decodeBase64(token.token), 'username:password')
        delete process.env[environmentVariable]
        done()
      })
    })

    it('should try with and without a slash at the end of registry url', function (done) {
      const content = [
        'registry=http://registry.foobar.eu',
        '//registry.foobar.eu:_password=' + encodeBase64('barbay'),
        '//registry.foobar.eu:username=barbaz', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken()
        assert.deepStrictEqual(token, {
          token: 'YmFyYmF6OmJhcmJheQ==',
          type: 'Basic',
          password: 'barbay',
          username: 'barbaz'
        })
        assert.strictEqual(decodeBase64(token.token), 'barbaz:barbay')
        done()
      })
    })

    it('should fetch for the registry given (if defined)', function (done) {
      const content = [
        '//registry.foobar.eu:_authToken=barbaz',
        '//registry.blah.foo:_password=' + encodeBase64('barbay'),
        '//registry.blah.foo:username=barbaz',
        '//registry.last.thing:_authToken=yep', ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        const token = getAuthToken('//registry.blah.foo')
        assert.deepStrictEqual(token, {
          token: 'YmFyYmF6OmJhcmJheQ==',
          type: 'Basic',
          password: 'barbay',
          username: 'barbaz'
        })
        assert.strictEqual(decodeBase64(token.token), 'barbaz:barbay')
        done()
      })
    })

    it('recursively finds registries for deep url if option is set', function (done, undef) {
      const opts = { recursive: true }
      const content = [
        '//registry.blah.com/foo:_password=' + encodeBase64('barbay'),
        '//registry.blah.com/foo:username=barbaz',
        '//registry.blah.eu:username=barbaz',
        '//registry.blah.eu:_password=' + encodeBase64('foobaz'), ''
      ].join('\n')

      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        let token = getAuthToken('https://registry.blah.com/foo/bar/baz', opts)
        assert.deepStrictEqual(token, {
          token: 'YmFyYmF6OmJhcmJheQ==',
          type: 'Basic',
          password: 'barbay',
          username: 'barbaz'
        })
        assert.strictEqual(decodeBase64(token.token), 'barbaz:barbay')
        token = getAuthToken('https://registry.blah.eu/foo/bar/baz', opts)
        assert.deepStrictEqual(token, {
          token: 'YmFyYmF6OmZvb2Jheg==',
          type: 'Basic',
          password: 'foobaz',
          username: 'barbaz'
        })
        assert.strictEqual(decodeBase64(token.token), 'barbaz:foobaz')
        assert.strictEqual(getAuthToken('//some.registry', opts), undef)
        done()
      })
    })
  })

  describe('npmrc file resolution', function () {
    let npmRcPath
    beforeEach(function () {
      process.env.npm_config_userconfig = ''
      process.env.NPM_CONFIG_USERCONFIG = ''
    })

    afterEach(function (done) {
      process.env.npm_config_userconfig = ''
      process.env.NPM_CONFIG_USERCONFIG = ''
      fs.unlink(npmRcPath, function () {
        done()
      })
    })

    it('should use npmrc from environment npm_config_userconfig', function (done) {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=foobar', ''
      ].join('\n')

      npmRcPath = path.join(__dirname, '..', '.npmrc.env')
      process.env.NPM_CONFIG_USERCONFIG = npmRcPath
      fs.writeFile(npmRcPath, content, function (err) {
        const getAuthToken = requireUncached('../index')
        assert(!err, err)
        assert.deepStrictEqual(getAuthToken(), { token: 'foobar', type: 'Bearer' })
        done()
      })
    })
  })
})
