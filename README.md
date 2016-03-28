# registry-auth-token

[![npm version](http://img.shields.io/npm/v/registry-auth-token.svg?style=flat-square)](http://browsenpm.org/package/registry-auth-token)[![Build Status](http://img.shields.io/travis/rexxars/registry-auth-token/master.svg?style=flat-square)](https://travis-ci.org/rexxars/registry-auth-token)

Get the auth token set for an npm registry from `.npmrc`

## Installing

```
npm install --save registry-auth-token
```

## Usage

```js
var getAuthToken = require('registry-auth-token')

// Get auth token for default `registry` set in `.npmrc`
console.log(getAuthToken())

// Get auth token for a specific registry URL
console.log(getAuthToken('//registry.foo.bar'))

// Find the registry auth token for a given URL (with deep path):
// If registry is at `//some.host/registry`
// URL passed is `//some.host/registry/deep/path`
// Will find token the closest matching path; `//some.host/registry`
console.log(getAuthToken('//some.host/registry/deep/path', {recursive: true}))
```

## Security

Please be careful when using this. Leaking your auth token is dangerous.

## License

MIT-licensed. See LICENSE.
