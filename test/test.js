import assert from 'node:assert/strict'
import {unlink, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, beforeEach, describe, it} from 'node:test'
import {fileURLToPath} from 'node:url'

import {getRegistryAuthToken, getRegistryUrl} from '../src/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const npmRcPath = path.join(__dirname, '..', '.npmrc')

const decodeBase64 = (str) => Buffer.from(str, 'base64').toString('utf8')
const encodeBase64 = (str) => Buffer.from(str, 'utf8').toString('base64')

function cleanNpmConfigEnv() {
  for (const key of Object.keys(process.env)) {
    if (/^npm_config_/i.test(key)) {
      delete process.env[key]
    }
  }
}

async function unlinkSafe(filePath) {
  try {
    await unlink(filePath)
  } catch {
    // ignore
  }
}

describe('auth-token', () => {
  beforeEach(() => cleanNpmConfigEnv())
  afterEach(() => unlinkSafe(npmRcPath))

  it('should read global if no local is found', () => {
    getRegistryAuthToken()
  })

  it('should return undefined if no auth token is given for registry', async () => {
    await writeFile(npmRcPath, 'registry=http://registry.npmjs.eu/')
    assert.equal(getRegistryAuthToken(), undefined)
  })

  describe('legacy auth token', () => {
    it('should return auth token if defined via the _auth key', async () => {
      const content = ['_auth=foobar', 'registry=http://registry.foobar.eu/'].join('\n')
      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {token: 'foobar', type: 'Basic'})
    })

    it('should return legacy auth token from env variable (with curly braces)', async () => {
      const envVar = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        '_auth=${' + envVar + '}',
        'registry=http://registry.foobar.eu/',
      ].join('\n')
      process.env[envVar] = 'foobar'

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {token: 'foobar', type: 'Basic'})
      delete process.env[envVar]
    })

    it('should return legacy auth token from env variable (without curly braces)', async () => {
      const envVar = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = ['_auth=$' + envVar, 'registry=http://registry.foobar.eu/'].join(
        '\n',
      )
      process.env[envVar] = 'foobar'

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {token: 'foobar', type: 'Basic'})
      delete process.env[envVar]
    })
  })

  describe('bearer token', () => {
    it('should return auth token if registry is defined', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=foobar',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {
        token: 'foobar',
        type: 'Bearer',
      })
    })

    it('should use npmrc passed in', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=foobar',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      const npmrc = {
        '//registry.foobar.eu/:_authToken': 'qar',
        registry: 'http://registry.foobar.eu/',
      }
      assert.deepStrictEqual(getRegistryAuthToken({npmrc}), {
        token: 'qar',
        type: 'Bearer',
      })
    })

    it('should return auth token if registry url has port specified', async () => {
      const content = [
        'registry=http://localhost:8770/',
        '//localhost/:_authToken=ohno',
        '//localhost:8770/:_authToken=beepboop',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {
        token: 'beepboop',
        type: 'Bearer',
      })
    })

    it('should return auth token from env variable (with curly braces)', async () => {
      const envVar = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:_authToken=${' + envVar + '}',
        '',
      ].join('\n')
      process.env[envVar] = 'foobar'

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {
        token: 'foobar',
        type: 'Bearer',
      })
      delete process.env[envVar]
    })

    it('should return auth token from env variable (without curly braces)', async () => {
      const envVar = '__REGISTRY_AUTH_TOKEN_NPM_TOKEN__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:_authToken=$' + envVar,
        '',
      ].join('\n')
      process.env[envVar] = 'foobar'

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {
        token: 'foobar',
        type: 'Bearer',
      })
      delete process.env[envVar]
    })

    it('should try with and without a slash at the end of registry url', async () => {
      const content = [
        'registry=http://registry.foobar.eu',
        '//registry.foobar.eu:_authToken=barbaz',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {
        token: 'barbaz',
        type: 'Bearer',
      })
    })

    it('should fetch for the registry given (if defined)', async () => {
      const content = [
        '//registry.foobar.eu:_authToken=barbaz',
        '//registry.blah.foo:_authToken=whatev',
        '//registry.last.thing:_authToken=yep',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken('//registry.blah.foo'), {
        token: 'whatev',
        type: 'Bearer',
      })
    })

    it('recursively finds registries for deep url if option is set', async () => {
      const opts = {recursive: true}
      const content = [
        '//registry.blah.com/foo:_authToken=whatev',
        '//registry.blah.org/foo/bar:_authToken=recurseExactlyOneLevel',
        '//registry.blah.edu/foo/bar/baz:_authToken=recurseNoLevel',
        '//registry.blah.eu:_authToken=yep',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(
        getRegistryAuthToken('https://registry.blah.edu/foo/bar/baz', opts),
        {token: 'recurseNoLevel', type: 'Bearer'},
      )
      assert.deepStrictEqual(
        getRegistryAuthToken('https://registry.blah.org/foo/bar/baz', opts),
        {token: 'recurseExactlyOneLevel', type: 'Bearer'},
      )
      assert.deepStrictEqual(
        getRegistryAuthToken('https://registry.blah.com/foo/bar/baz', opts),
        {token: 'whatev', type: 'Bearer'},
      )
      assert.deepStrictEqual(
        getRegistryAuthToken('http://registry.blah.eu/what/ever', opts),
        {token: 'yep', type: 'Bearer'},
      )
      assert.deepStrictEqual(
        getRegistryAuthToken('http://registry.blah.eu//what/ever', opts),
        undefined,
        'does not hang',
      )
      assert.equal(getRegistryAuthToken('//some.registry', opts), undefined)
    })

    it('should try both with and without trailing slash', async () => {
      await writeFile(npmRcPath, '//registry.blah.com:_authToken=whatev')
      assert.deepStrictEqual(getRegistryAuthToken('https://registry.blah.com'), {
        token: 'whatev',
        type: 'Bearer',
      })
    })

    it('should prefer bearer token over basic token', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=bearerToken',
        '//registry.foobar.eu/:_password=' + encodeBase64('foobar'),
        '//registry.foobar.eu/:username=foobar',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken('//registry.foobar.eu'), {
        token: 'bearerToken',
        type: 'Bearer',
      })
    })

    it('"nerf darts" registry urls', async () => {
      await writeFile(
        npmRcPath,
        '//contoso.pkgs.visualstudio.com/_packaging/MyFeed/npm/:_authToken=heider',
      )
      assert.deepStrictEqual(
        getRegistryAuthToken(
          'https://contoso.pkgs.visualstudio.com/_packaging/MyFeed/npm/registry',
        ),
        {token: 'heider', type: 'Bearer'},
      )
    })
  })

  describe('basic token', () => {
    it('should return undefined if password or username are missing', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_password=' + encodeBase64('foobar'),
        '//registry.foobar.com/:username=foobar',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      assert.equal(getRegistryAuthToken('//registry.foobar.eu'), undefined)
      assert.equal(getRegistryAuthToken('//registry.foobar.com'), undefined)
    })

    it('should return basic token if username and password are defined', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_password=' + encodeBase64('foobar'),
        '//registry.foobar.eu/:username=foobar',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken()
      assert.deepStrictEqual(token, {
        password: 'foobar',
        token: 'Zm9vYmFyOmZvb2Jhcg==',
        type: 'Basic',
        username: 'foobar',
      })
      assert.equal(decodeBase64(token.token), 'foobar:foobar')
    })

    it('should return basic token if _auth is base64 encoded', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_auth=' + encodeBase64('foobar:foobar'),
      ].join('\n')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken()
      assert.deepStrictEqual(token, {
        token: 'Zm9vYmFyOmZvb2Jhcg==',
        type: 'Basic',
      })
      assert.equal(decodeBase64(token.token), 'foobar:foobar')
    })

    it('should return basic token if registry url has port specified', async () => {
      const content = [
        'registry=http://localhost:8770/',
        '//localhost/:_authToken=ohno',
        '//localhost:8770/:_password=' + encodeBase64('foobar'),
        '//localhost:8770/:username=foobar',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken()
      assert.deepStrictEqual(token, {
        password: 'foobar',
        token: 'Zm9vYmFyOmZvb2Jhcg==',
        type: 'Basic',
        username: 'foobar',
      })
      assert.equal(decodeBase64(token.token), 'foobar:foobar')
    })

    it('should return password from env variable (with curly braces)', async () => {
      const envVar = '__REGISTRY_PASSWORD__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:username=username',
        '//registry.foobar.cc/:_password=${' + envVar + '}',
        '',
      ].join('\n')
      process.env[envVar] = encodeBase64('password')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken()
      assert.deepStrictEqual(token, {
        password: 'password',
        token: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
        type: 'Basic',
        username: 'username',
      })
      assert.equal(decodeBase64(token.token), 'username:password')
      delete process.env[envVar]
    })

    it('should return password from env variable (without curly braces)', async () => {
      const envVar = '__REGISTRY_PASSWORD__'
      const content = [
        'registry=http://registry.foobar.cc/',
        '//registry.foobar.cc/:username=username',
        '//registry.foobar.cc/:_password=$' + envVar,
        '',
      ].join('\n')
      process.env[envVar] = encodeBase64('password')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken()
      assert.deepStrictEqual(token, {
        password: 'password',
        token: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
        type: 'Basic',
        username: 'username',
      })
      assert.equal(decodeBase64(token.token), 'username:password')
      delete process.env[envVar]
    })

    it('should try with and without a slash at the end of registry url', async () => {
      const content = [
        'registry=http://registry.foobar.eu',
        '//registry.foobar.eu:_password=' + encodeBase64('barbay'),
        '//registry.foobar.eu:username=barbaz',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken()
      assert.deepStrictEqual(token, {
        password: 'barbay',
        token: 'YmFyYmF6OmJhcmJheQ==',
        type: 'Basic',
        username: 'barbaz',
      })
      assert.equal(decodeBase64(token.token), 'barbaz:barbay')
    })

    it('should fetch for the registry given (if defined)', async () => {
      const content = [
        '//registry.foobar.eu:_authToken=barbaz',
        '//registry.blah.foo:_password=' + encodeBase64('barbay'),
        '//registry.blah.foo:username=barbaz',
        '//registry.last.thing:_authToken=yep',
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      const token = getRegistryAuthToken('//registry.blah.foo')
      assert.deepStrictEqual(token, {
        password: 'barbay',
        token: 'YmFyYmF6OmJhcmJheQ==',
        type: 'Basic',
        username: 'barbaz',
      })
      assert.equal(decodeBase64(token.token), 'barbaz:barbay')
    })

    it('recursively finds registries for deep url if option is set', async () => {
      const opts = {recursive: true}
      const content = [
        '//registry.blah.com/foo:_password=' + encodeBase64('barbay'),
        '//registry.blah.com/foo:username=barbaz',
        '//registry.blah.eu:username=barbaz',
        '//registry.blah.eu:_password=' + encodeBase64('foobaz'),
        '',
      ].join('\n')

      await writeFile(npmRcPath, content)
      let token = getRegistryAuthToken('https://registry.blah.com/foo/bar/baz', opts)
      assert.deepStrictEqual(token, {
        password: 'barbay',
        token: 'YmFyYmF6OmJhcmJheQ==',
        type: 'Basic',
        username: 'barbaz',
      })
      assert.equal(decodeBase64(token.token), 'barbaz:barbay')
      token = getRegistryAuthToken('https://registry.blah.eu/foo/bar/baz', opts)
      assert.deepStrictEqual(token, {
        password: 'foobaz',
        token: 'YmFyYmF6OmZvb2Jheg==',
        type: 'Basic',
        username: 'barbaz',
      })
      assert.equal(decodeBase64(token.token), 'barbaz:foobaz')
      assert.equal(getRegistryAuthToken('//some.registry', opts), undefined)
    })
  })

  describe('npmrc file resolution', () => {
    let envNpmRcPath

    beforeEach(() => {
      cleanNpmConfigEnv()
      process.env.npm_config_userconfig = ''
      process.env.NPM_CONFIG_USERCONFIG = ''
    })

    afterEach(async () => {
      process.env.npm_config_userconfig = ''
      process.env.NPM_CONFIG_USERCONFIG = ''
      if (envNpmRcPath) {
        await unlinkSafe(envNpmRcPath)
      }
    })

    it('should use npmrc from environment npm_config_userconfig', async () => {
      const content = [
        'registry=http://registry.foobar.eu/',
        '//registry.foobar.eu/:_authToken=foobar',
        '',
      ].join('\n')

      envNpmRcPath = path.join(__dirname, '..', '.npmrc.env')
      process.env.NPM_CONFIG_USERCONFIG = envNpmRcPath
      await writeFile(envNpmRcPath, content)
      assert.deepStrictEqual(getRegistryAuthToken(), {
        token: 'foobar',
        type: 'Bearer',
      })
    })
  })
})

describe('registry-url', () => {
  afterEach(() => unlinkSafe(npmRcPath))

  it('should read global if no local is found', () => {
    getRegistryUrl()
  })

  it('should return default registry if no url is given for scope', async () => {
    await writeFile(npmRcPath, 'registry=https://registry.npmjs.org/')
    assert.equal(getRegistryUrl('@somescope'), 'https://registry.npmjs.org/')
  })

  it('should return registry url if url is given for scope', async () => {
    await writeFile(npmRcPath, '@somescope:registry=https://some.registry/')
    assert.equal(getRegistryUrl('@somescope'), 'https://some.registry/')
  })

  it('should append trailing slash if not present', async () => {
    await writeFile(npmRcPath, '@somescope:registry=https://some.registry')
    assert.equal(getRegistryUrl('@somescope'), 'https://some.registry/')
  })

  it('should return configured global registry if given', async () => {
    const content = [
      'registry=http://registry.foobar.eu/',
      '@somescope:registry=https://some.url/',
      '',
    ].join('\n')

    await writeFile(npmRcPath, content)
    assert.equal(getRegistryUrl(), 'http://registry.foobar.eu/')
  })
})
