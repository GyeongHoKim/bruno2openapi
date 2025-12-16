// Type definitions for OpenAPI entities
// Based on the OpenAPI 3.0 specification

export interface OpenAPIObject {
  openapi: '3.0.0'
  info: InfoObject
  paths: { [path: string]: PathItemObject }
  servers?: ServerObject[]
  components?: ComponentsObject
  security?: SecurityRequirementObject[]
  tags?: TagObject[]
  externalDocs?: ExternalDocumentationObject
}

export interface InfoObject {
  title: string
  description?: string
  termsOfService?: string
  contact?: ContactObject
  license?: LicenseObject
  version: string
}

export interface ContactObject {
  name?: string
  url?: string
  email?: string
}

export interface LicenseObject {
  name: string
  url?: string
}

export interface ServerObject {
  url: string
  description?: string
  variables?: { [name: string]: ServerVariableObject }
}

export interface ServerVariableObject {
  enum?: string[]
  default: string
  description?: string
}

export interface PathItemObject {
  $ref?: string
  summary?: string
  description?: string
  get?: OperationObject
  put?: OperationObject
  post?: OperationObject
  delete?: OperationObject
  options?: OperationObject
  head?: OperationObject
  patch?: OperationObject
  trace?: OperationObject
  servers?: ServerObject[]
  parameters?: (ParameterObject | ReferenceObject)[]
}

export interface OperationObject {
  tags?: string[]
  summary?: string
  description?: string
  externalDocs?: ExternalDocumentationObject
  operationId?: string
  parameters?: (ParameterObject | ReferenceObject)[]
  requestBody?: RequestBodyObject | ReferenceObject
  responses: ResponsesObject
  callbacks?: { [name: string]: CallbackObject | ReferenceObject }
  deprecated?: boolean
  security?: SecurityRequirementObject[]
  servers?: ServerObject[]
}

export interface ExternalDocumentationObject {
  description?: string
  url: string
}

export interface ParameterObject {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: string
  explode?: boolean
  allowReserved?: boolean
  schema?: SchemaObject | ReferenceObject
  example?: string | number | boolean | object | null
  examples?: { [name: string]: ExampleObject | ReferenceObject }
}

export interface RequestBodyObject {
  description?: string
  content: { [contentType: string]: MediaTypeObject }
  required?: boolean
}

export interface MediaTypeObject {
  schema?: SchemaObject | ReferenceObject
  example?: string | number | boolean | object | null
  examples?: { [name: string]: ExampleObject | ReferenceObject }
  encoding?: { [name: string]: EncodingObject }
}

export interface EncodingObject {
  contentType?: string
  headers?: { [name: string]: HeaderObject | ReferenceObject }
  style?: string
  explode?: boolean
  allowReserved?: boolean
}

export interface HeaderObject {
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: string
  explode?: boolean
  allowReserved?: boolean
  schema?: SchemaObject | ReferenceObject
  example?: string | number | boolean | object | null
  examples?: { [name: string]: ExampleObject | ReferenceObject }
}

export interface ResponsesObject {
  [status: string]: ResponseObject | ReferenceObject
}

export interface ResponseObject {
  description: string
  headers?: { [name: string]: HeaderObject | ReferenceObject }
  content?: { [contentType: string]: MediaTypeObject }
  links?: { [name: string]: LinkObject | ReferenceObject }
}

export interface CallbackObject {
  [name: string]: PathItemObject
}

export interface ExampleObject {
  summary?: string
  description?: string
  value?: string | number | boolean | object | null
  externalValue?: string
}

export interface LinkObject {
  operationRef?: string
  operationId?: string
  parameters?: { [name: string]: string | number | boolean | object | null }
  requestBody?: string | number | boolean | object | null
  description?: string
  server?: ServerObject
}

export interface SchemaObject {
  type?: string
  properties?: { [name: string]: SchemaObject | ReferenceObject }
  items?: SchemaObject | ReferenceObject
  required?: string[]
  description?: string
  format?: string
  default?: string | number | boolean | object | null
  nullable?: boolean
  enum?: (string | number | boolean | object | null)[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  [property: string]: unknown
}

export interface ReferenceObject {
  $ref: string
}

export interface ComponentsObject {
  schemas?: { [name: string]: SchemaObject | ReferenceObject }
  responses?: { [name: string]: ResponseObject | ReferenceObject }
  parameters?: { [name: string]: ParameterObject | ReferenceObject }
  examples?: { [name: string]: ExampleObject | ReferenceObject }
  requestBodies?: { [name: string]: RequestBodyObject | ReferenceObject }
  headers?: { [name: string]: HeaderObject | ReferenceObject }
  securitySchemes?: { [name: string]: SecuritySchemeObject | ReferenceObject }
  links?: { [name: string]: LinkObject | ReferenceObject }
  callbacks?: { [name: string]: CallbackObject | ReferenceObject }
  [key: string]: unknown // Index signature to allow additional properties
}

export interface SecuritySchemeObject {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  description?: string
  name?: string
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
  flows?: OAuthFlowsObject
  openIdConnectUrl?: string
}

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject
  password?: OAuthFlowObject
  clientCredentials?: OAuthFlowObject
  authorizationCode?: OAuthFlowObject
}

export interface OAuthFlowObject {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: { [scope: string]: string }
}

export interface SecurityRequirementObject {
  [name: string]: string[]
}

export interface TagObject {
  name: string
  description?: string
  externalDocs?: ExternalDocumentationObject
}
