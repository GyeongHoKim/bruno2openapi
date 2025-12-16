// Type definitions specifically for Bruno collection schema
// Based on the actual Bruno repository types

export interface BrunoCollection {
  version: '1'
  uid: string
  name: string
  items: BrunoItem[]
  activeEnvironmentUid?: string | null
  environments?: BrunoEnvironments | null
  pathname?: string | null
  runnerResult?: RunnerResult | null
  runtimeVariables?: Record<string, unknown> | null
  brunoConfig?: Record<string, unknown> | null
  root?: FolderRoot | null
}

export interface BrunoEnvironments {
  [key: string]: BrunoEnvironment
}

export interface BrunoEnvironment {
  uid: string
  name: string
  variables: BrunoVariable[]
}

export interface BrunoVariable {
  uid: string
  name: string
  value: string | number | boolean | object | null
  type: 'text'
  enabled: boolean
  secret?: boolean
}

export interface RunnerResult {
  items?: unknown[] | null
}

export interface FolderRoot {
  type?: string
  name?: string
  request?: FolderRequest | null
  docs?: string | null
  meta?: { name?: string; seq?: number } | null
}

export interface FolderRequest {
  headers?: BrunoHeader[] | null
  auth?: BrunoAuth | null
  script?: Script | null
  vars?: { req: Variable[]; res: Variable[] } | null
  tests?: string | null
}

export interface Variable {
  uid: string
  name: string
  value: string
  type: 'text'
  enabled: boolean
  secret?: boolean
}

export interface Script {
  req?: string
  res?: string
}

export interface BrunoRoot {
  name?: string
  seq?: number
  type?: string
  request?: BrunoRequest
  meta?: { [key: string]: string | number | boolean | object | null }
}

export interface BrunoItem {
  uid: string
  type: 'folder' | 'http-request' | 'graphql-request' | 'js' | 'grpc-request' | 'ws-request'
  seq?: number | null
  name: string
  tags?: string[] | null
  request?: BrunoRequest | null
  settings?: ItemSettings | null
  fileContent?: string | null
  root?: FolderRoot | null
  items?: BrunoItem[] | null
  examples?: BrunoExample[] | null
  filename?: string | null
  pathname?: string | null
  depth?: number
}

export type ItemSettings = HttpItemSettings | WebSocketItemSettings | null

export interface HttpItemSettings {
  encodeUrl?: boolean | null
  followRedirects?: boolean | null
  maxRedirects?: number | null
  timeout?: number | 'inherit' | null
}

export interface WebSocketItemSettings {
  settings?: {
    timeout?: number | null
    keepAliveInterval?: number | null
  } | null
}

export interface BrunoRequest {
  url: string
  method: string
  headers: BrunoHeader[]
  params: BrunoParam[]
  auth?: BrunoAuth | null
  body?: BrunoBody
  script?: Script
  vars?: Vars | null
  assertions?: BrunoKeyValue[] | null
  tests?: string | null
  docs?: string | null
  tags?: string[] | null
}

export interface BrunoHeader {
  uid: string
  name?: string
  value?: string
  description?: string
  enabled: boolean
}

export interface BrunoParam {
  uid: string
  name?: string
  value?: string
  description?: string
  type: 'query' | 'path'
  enabled: boolean
}

export interface BrunoBody {
  mode:
    | 'none'
    | 'json'
    | 'text'
    | 'xml'
    | 'formUrlEncoded'
    | 'multipartForm'
    | 'graphql'
    | 'sparql'
    | 'file'
  json?: string
  text?: string
  xml?: string
  sparql?: string
  formUrlEncoded?: BrunoKeyValue[]
  multipartForm?: MultipartFormEntry[]
  graphql?: BrunoGraphqlBody
  file?: BrunoFileEntry[]
}

export interface BrunoKeyValue {
  uid: string
  name?: string
  value?: string
  description?: string
  enabled: boolean
}

export interface MultipartFormEntry {
  uid: string
  type: 'file' | 'text'
  name?: string
  value: string | string[] | null
  description?: string
  contentType?: string
  enabled: boolean
}

export interface BrunoGraphqlBody {
  query?: string
  variables?: string
}

export interface BrunoFileEntry {
  uid: string
  filePath?: string
  contentType?: string
  selected: boolean
}

export interface Vars {
  req?: BrunoKeyValue[]
  res?: BrunoKeyValue[]
}

export interface BrunoAuth {
  mode:
    | 'inherit'
    | 'none'
    | 'awsv4'
    | 'basic'
    | 'bearer'
    | 'digest'
    | 'ntlm'
    | 'oauth2'
    | 'wsse'
    | 'apikey'
  awsv4?: BrunoAuthAwsV4
  basic?: BrunoAuthBasic
  bearer?: BrunoAuthBearer
  ntlm?: BrunoAuthNTLM
  digest?: BrunoAuthDigest
  oauth2?: BrunoOAuth2
  wsse?: BrunoAuthWsse
  apikey?: BrunoAuthApiKey
}

export interface BrunoAuthAwsV4 {
  accessKeyId?: string
  secretAccessKey?: string
  sessionToken?: string
  service?: string
  region?: string
  profileName?: string
}

export interface BrunoAuthBasic {
  username?: string
  password?: string
}

export interface BrunoAuthBearer {
  token?: string
}

export interface BrunoAuthNTLM {
  username?: string
  password?: string
  domain?: string
}

export interface BrunoAuthDigest {
  username?: string
  password?: string
}

export interface BrunoOAuth2 {
  grantType: 'client_credentials' | 'password' | 'authorization_code' | 'implicit'
  username?: string
  password?: string
  callbackUrl?: string
  authorizationUrl?: string
  accessTokenUrl?: string
  clientId?: string
  clientSecret?: string
  scope?: string
  state?: string
  pkce?: boolean
  credentialsPlacement?: string
  credentialsId?: string
  tokenPlacement?: string
  tokenHeaderPrefix?: string
  tokenQueryKey?: string
  refreshTokenUrl?: string
  autoRefreshToken?: boolean
  autoFetchToken?: boolean
  additionalParameters?: {
    authorization?: OAuthAdditionalParameter[]
    token?: OAuthAdditionalParameter[]
    refresh?: OAuthAdditionalParameter[]
  }
}

export interface OAuthAdditionalParameter {
  name?: string
  value?: string
  sendIn: 'headers' | 'queryparams' | 'body'
  enabled: boolean
}

export interface BrunoAuthWsse {
  username?: string
  password?: string
}

export interface BrunoAuthApiKey {
  key?: string
  value?: string
  placement?: 'header' | 'queryparams'
}

export interface BrunoExample {
  uid: string
  itemUid: string
  name: string
  description?: string
  type: 'http-request' | 'graphql-request' | 'grpc-request'
  request?: BrunoRequest
  response?: BrunoResponse
}

export interface BrunoResponse {
  status?: string
  statusText?: string
  headers?: BrunoKeyValue[]
  body?: {
    type?: 'json' | 'text' | 'xml' | 'html' | 'binary'
    content?: string | object | unknown
  }
}
