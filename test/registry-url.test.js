const fs = require('fs')
const path = require('path')
const mocha = require('mocha')
const assert = require('assert')
const requireUncached = require('require-uncached')

const npmRcPath = path.join(__dirname, '..', '.npmrc')
const afterEach = mocha.afterEach
const describe = mocha.describe
const it = mocha.it

describe('registry-url', function () {
  afterEach(function (done) {
    fs.unlink(npmRcPath, function () {
      done()
    })
  })

  it('should read global if no local is found', function () {
    const getRegistryUrl = requireUncached('../registry-url')
    getRegistryUrl()
  })

  it('should return default registry if no url is given for scope', function (done) {
    fs.writeFile(npmRcPath, 'registry=https://registry.npmjs.org/', function (err) {
      const getRegistryUrl = requireUncached('../registry-url')
      assert(!err, err)
      assert.strictEqual(getRegistryUrl('@somescope'), 'https://registry.npmjs.org/')
      done()
    })
  })

  it('should return registry url if url is given for scope ', function (done) {
    fs.writeFile(npmRcPath, '@somescope:registry=https://some.registry/', function (err) {
      const getRegistryUrl = requireUncached('../registry-url')
      assert(!err, err)
      assert.strictEqual(getRegistryUrl('@somescope'), 'https://some.registry/')
      done()
    })
  })

  it('should append trailing slash if not present', function (done) {
    fs.writeFile(npmRcPath, '@somescope:registry=https://some.registry', function (err) {
      const getRegistryUrl = requireUncached('../registry-url')
      assert(!err, err)
      assert.strictEqual(getRegistryUrl('@somescope'), 'https://some.registry/')
      done()
    })
  })

  it('should return configured global registry if given', function (done) {
    const content = [
      'registry=http://registry.foobar.eu/',
      '@somescope:registry=https://some.url/', ''
    ].join('\n')

    fs.writeFile(npmRcPath, content, function (err) {
      const getRegistryUrl = requireUncached('../registry-url')
      assert(!err, err)
      assert.strictEqual(getRegistryUrl(), 'http://registry.foobar.eu/')
      done()
    })
  })
})
