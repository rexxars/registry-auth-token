export interface AuthOptions {
  readonly recursive?: boolean
  readonly npmrc?: {
    readonly registry?: string
    readonly [registryUrls: string]: string | undefined
  }
}

export interface NpmCredentials {
  token: string
  type: 'Basic' | 'Bearer'
  username?: string
  password?: string
}

declare function getRegistryAuthToken(
  registryUrl?: string | AuthOptions,
  options?: AuthOptions,
): NpmCredentials | undefined

declare function getRegistryUrl(scope?: string, npmrc?: AuthOptions['npmrc']): string

export {getRegistryAuthToken, getRegistryUrl}
