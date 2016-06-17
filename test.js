var fs = require('fs')
var path = require('path')
var mocha = require('mocha')
var assert = require('assert')
var requireUncached = require('require-uncached')

var npmRcPath = path.join(__dirname, '.npmrc')
var afterEach = mocha.afterEach
var describe = mocha.describe
var it = mocha.it

describe('registry-auth-token', function () {
  afterEach(function (done) {
    fs.unlink(npmRcPath, function () {
      done()
    })
  })

  it('should read global if no local is found', function () {
    var getAuthToken = requireUncached('./index')
    getAuthToken()
  })

  it('should return undefined if no auth token is given for registry', function (done) {
    fs.writeFile(npmRcPath, 'registry=http://registry.npmjs.eu/', function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert(!getAuthToken())
      done()
    })
  })

  it('should return auth token if registry is defined', function (done) {
    var content = [
      'registry=http://registry.foobar.eu/',
      '//registry.foobar.eu/:_authToken=foobar', ''
    ].join('\n')

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken(), 'foobar')
      done()
    })
  })

  it('should return auth token if registry url has port specified', function (done) {
    var content = [
      'registry=http://localhost:8770/',
      // before the patch this token was selected.
      '//localhost/:_authToken=ohno',
      '//localhost:8770/:_authToken=beepboop', ''
    ].join('\n')

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken(), 'beepboop')
      done()
    })
  })

  it('should return auth token defined by reference to an environment variable (with curly braces)', function (done) {
    var environmentVariable = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
    var content = [
      'registry=http://registry.foobar.cc/',
      '//registry.foobar.cc/:_authToken=${' + environmentVariable + '}', ''
    ].join('\n')
    process.env[environmentVariable] = 'foobar'

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken(), 'foobar')
      delete process.env[environmentVariable]
      done()
    })
  })

  it('should return auth token defined by reference to an environment variable (without curly braces)', function (done) {
    var environmentVariable = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
    var content = [
      'registry=http://registry.foobar.cc/',
      '//registry.foobar.cc/:_authToken=$' + environmentVariable, ''
    ].join('\n')
    process.env[environmentVariable] = 'foobar'

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken(), 'foobar')
      delete process.env[environmentVariable]
      done()
    })
  })

  it('should try with and without a slash at the end of registry url', function (done) {
    var content = [
      'registry=http://registry.foobar.eu',
      '//registry.foobar.eu:_authToken=barbaz', ''
    ].join('\n')

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken(), 'barbaz')
      done()
    })
  })

  it('should fetch for the registry given (if defined)', function (done) {
    var content = [
      '//registry.foobar.eu:_authToken=barbaz',
      '//registry.blah.foo:_authToken=whatev',
      '//registry.last.thing:_authToken=yep', ''
    ].join('\n')

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken('//registry.blah.foo'), 'whatev')
      done()
    })
  })

  it('recursively finds registries for deep url if option is set', function (done, undef) {
    var opts = {recursive: true}
    var content = [
      '//registry.blah.com/foo:_authToken=whatev',
      '//registry.blah.eu:_authToken=yep', ''
    ].join('\n')

    fs.writeFile(npmRcPath, content, function (err) {
      var getAuthToken = requireUncached('./index')
      assert(!err, err)
      assert.equal(getAuthToken('https://registry.blah.com/foo/bar/baz', opts), 'whatev')
      assert.equal(getAuthToken('http://registry.blah.eu/what/ever', opts), 'yep')
      assert.equal(getAuthToken('//some.registry', opts), undef)
      done()
    })
  })
})
