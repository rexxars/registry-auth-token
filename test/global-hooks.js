exports.mochaHooks = {
  beforeEach () {
    Object.keys(process.env)
      .filter(envKey => /^npm_config_/i.test(envKey))
      .forEach(envKey => delete process.env[envKey])
  }
}
