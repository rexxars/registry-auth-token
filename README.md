# registry-auth-token

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
```

## Security

Please be careful when using this. Leaking your auth token is dangerous.

## License

MIT-licensed. See LICENSE.
