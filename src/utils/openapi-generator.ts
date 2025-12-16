import type {
  BrunoAuth,
  BrunoBody,
  BrunoCollection,
  BrunoHeader,
  BrunoItem,
  BrunoParam,
  BrunoRequest,
} from '../types/bruno'
import type {
  InfoObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from '../types/openapi'
import type { ConvertResult, ConvertWarning } from '../types/result'

/**
 * Utility functions for generating OpenAPI specifications
 */
export class OpenApiGenerator {
  /**
   * Generates an OpenAPI specification from a Bruno collection
   */
  static generateOpenApiSpec(collection: BrunoCollection): ConvertResult {
    const warnings: ConvertWarning[] = []

    const info: InfoObject = {
      title: collection.name || 'Bruno Collection',
      version:
        collection.brunoConfig &&
        typeof collection.brunoConfig === 'object' &&
        'version' in collection.brunoConfig
          ? String(collection.brunoConfig.version) || '1.0.0'
          : '1.0.0',
      description:
        collection.brunoConfig &&
        typeof collection.brunoConfig === 'object' &&
        'description' in collection.brunoConfig
          ? String(collection.brunoConfig.description) ||
            `OpenAPI specification generated from Bruno collection: ${collection.name}`
          : `OpenAPI specification generated from Bruno collection: ${collection.name}`,
    }

    const paths: { [path: string]: PathItemObject } = {}

    // Process collection items to build paths
    OpenApiGenerator.processCollectionItems(collection.items, paths, warnings)

    const openApiSpec: OpenAPIObject = {
      openapi: '3.0.0',
      info,
      paths,
    }

    // Add servers if base URL is defined in collection
    if (
      collection.brunoConfig &&
      typeof collection.brunoConfig === 'object' &&
      'baseUrl' in collection.brunoConfig
    ) {
      const baseUrl = collection.brunoConfig.baseUrl
      if (typeof baseUrl === 'string' && baseUrl) {
        openApiSpec.servers = [
          {
            url: baseUrl,
          },
        ]
      }
    }

    return {
      spec: openApiSpec,
      warnings,
      content: JSON.stringify(openApiSpec, null, 2), // Optional JSON content
    }
  }

  /**
   * Processes collection items to build OpenAPI paths
   */
  private static processCollectionItems(
    items: BrunoItem[],
    paths: { [path: string]: PathItemObject },
    warnings: ConvertWarning[],
  ): void {
    for (const item of items) {
      if (item.type === 'folder') {
        // Process folder items recursively
        if (item.items && item.items.length > 0) {
          OpenApiGenerator.processCollectionItems(item.items, paths, warnings)
        }
      } else if (item.type === 'http-request' && item.request) {
        OpenApiGenerator.processHttpRequest(item, paths, warnings)
      }
    }
  }

  /**
   * Processes an HTTP request item to add to OpenAPI paths
   */
  private static processHttpRequest(
    item: BrunoItem,
    paths: { [path: string]: PathItemObject },
    warnings: ConvertWarning[],
  ): void {
    const request = item.request
    if (!(request?.method && request.url)) {
      warnings.push({
        message: `Skipping item '${item.name}' - missing method or URL`,
        itemName: item.name,
      })
      return
    }

    // Normalize the URL to extract path
    let normalizedPath = request.url || ''

    // Remove the base URL part if it exists
    if (request.url?.includes('://')) {
      try {
        const urlObj = new URL(request.url)
        normalizedPath = urlObj.pathname + urlObj.search
      } catch (e) {
        // If URL parsing fails, use the original URL
        warnings.push({
          message: `Could not parse URL for item '${item.name}': ${request.url}`,
          itemName: item.name,
        })
        // Fallback to using the original URL as the path
        normalizedPath = request.url
      }
    }

    // Ensure path starts with /
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`
    }

    // Initialize the path object if it doesn't exist
    if (!paths[normalizedPath]) {
      paths[normalizedPath] = {}
    }

    // Create operation based on the request
    const operation = OpenApiGenerator.createOperationFromRequest(item, request)

    // Add the operation to the appropriate method in the path
    const pathObject = paths[normalizedPath]
    if (pathObject) {
      switch (request.method?.toUpperCase()) {
        case 'GET':
          pathObject.get = operation
          break
        case 'POST':
          pathObject.post = operation
          break
        case 'PUT':
          pathObject.put = operation
          break
        case 'DELETE':
          pathObject.delete = operation
          break
        case 'PATCH':
          pathObject.patch = operation
          break
        case 'HEAD':
          pathObject.head = operation
          break
        case 'OPTIONS':
          pathObject.options = operation
          break
        case 'TRACE':
          pathObject.trace = operation
          break
        default:
          warnings.push({
            message: `Unsupported HTTP method '${request.method}' for item '${item.name}'`,
            itemName: item.name,
          })
      }
    }
  }

  /**
   * Creates an OpenAPI operation from a Bruno request
   */
  private static createOperationFromRequest(
    item: BrunoItem,
    request: BrunoRequest,
  ): OperationObject {
    const operation: OperationObject = {
      summary: item.name,
      description: request?.docs || `Operation for ${item.name}`,
      responses: OpenApiGenerator.createDefaultResponses(),
    }

    // Add tags if available in Bruno config
    if (request?.tags && Array.isArray(request.tags)) {
      operation.tags = request.tags as string[]
    } else {
      // Default to using the folder path as tags
      if (item.pathname) {
        const folderPath = item.pathname.substring(0, item.pathname.lastIndexOf('/'))
        if (folderPath) {
          operation.tags = [folderPath.split('/').pop() || 'default']
        }
      }
    }

    // Add parameters from Bruno request
    if (request?.params && request.params.length > 0) {
      const pathParams = request.params.filter(
        param => param.enabled !== false && param.type === 'path',
      )
      const queryParams = request.params.filter(
        param => param.enabled !== false && param.type === 'query',
      )

      if (pathParams.length > 0) {
        const pathParamObjs = OpenApiGenerator.createParametersFromBrunoParams(pathParams)
        operation.parameters = [...(operation.parameters || []), ...pathParamObjs]
      }

      if (queryParams.length > 0) {
        const queryParamObjs = OpenApiGenerator.createParametersFromBrunoParams(queryParams)
        operation.parameters = [...(operation.parameters || []), ...queryParamObjs]
      }
    }

    // Add headers as parameters if needed
    if (request?.headers && request.headers.length > 0) {
      const headerParams = OpenApiGenerator.createParametersFromBrunoHeaders(request.headers)
      if (headerParams.length > 0) {
        operation.parameters = [...(operation.parameters || []), ...headerParams]
      }
    }

    // Add request body if present
    if (request?.body) {
      operation.requestBody = OpenApiGenerator.createRequestBodyFromBrunoBody(request.body)
    }

    // Add authentication information to operation if needed
    if (request?.auth) {
      operation.security = OpenApiGenerator.createSecurityRequirementsFromAuth(request.auth)
    }

    return operation
  }

  /**
   * Creates OpenAPI parameters from Bruno parameters
   */
  private static createParametersFromBrunoParams(brunoParams: BrunoParam[]): ParameterObject[] {
    return brunoParams
      .filter(param => param.enabled !== false) // Only enabled params
      .map(param => {
        // Determine if parameter is required based on Bruno param content
        const isRequired = param.value !== undefined && param.value !== ''

        const paramObj: ParameterObject = {
          name: param.name || '',
          in: (param.type as 'query' | 'header' | 'path' | 'cookie') || 'query', // Use the Bruno param's type or default to query
          required: isRequired,
          schema: {
            type: 'string',
            example: param.value || undefined,
          },
          description: param.name || '',
        }

        return paramObj
      })
  }

  /**
   * Creates OpenAPI header parameters from Bruno headers
   */
  private static createParametersFromBrunoHeaders(brunoHeaders: BrunoHeader[]): ParameterObject[] {
    return brunoHeaders
      .filter(header => header.enabled !== false) // Only enabled headers
      .map(header => {
        const isRequired = header.value !== undefined && header.value !== ''

        return {
          name: header.name || '',
          in: 'header',
          required: isRequired,
          schema: {
            type: 'string',
            example: header.value || undefined,
          },
          description: header.name || '',
        }
      })
  }

  /**
   * Creates security requirements from Bruno auth configuration
   */
  private static createSecurityRequirementsFromAuth(
    brunoAuth: BrunoAuth,
  ): { [name: string]: string[] }[] | undefined {
    if (brunoAuth.mode === 'none') {
      return undefined
    }

    const securityRequirements: { [name: string]: string[] }[] = []

    switch (brunoAuth.mode) {
      case 'bearer':
        securityRequirements.push({
          bearerAuth: [],
        })
        break
      case 'basic':
        securityRequirements.push({
          basicAuth: [],
        })
        break
      case 'oauth2':
        securityRequirements.push({
          oauth2: [],
        })
        break
      case 'apikey':
        securityRequirements.push({
          apiKey: [],
        })
        break
      default:
        // For other auth types, we create a generic security requirement
        securityRequirements.push({
          [`${brunoAuth.mode}Auth`]: [],
        })
    }

    return securityRequirements
  }

  /**
   * Creates an OpenAPI request body from Bruno body
   */
  private static createRequestBodyFromBrunoBody(
    brunoBody: BrunoBody,
  ): RequestBodyObject | undefined {
    if (!brunoBody.mode) {
      return undefined
    }

    const requestBody: RequestBodyObject = {
      content: {},
    }

    switch (brunoBody.mode) {
      case 'json':
        if (brunoBody.json) {
          try {
            // Attempt to parse JSON to create a proper schema
            const parsedJson = JSON.parse(brunoBody.json)
            const schema = OpenApiGenerator.inferSchemaFromValue(parsedJson)
            requestBody.content['application/json'] = {
              schema,
              example: parsedJson,
            }
          } catch (e) {
            // If JSON parsing fails, use string schema
            requestBody.content['application/json'] = {
              schema: { type: 'string' },
              example: brunoBody.json,
            }
          }
        } else {
          // If no JSON content provided, use an empty object schema as default
          requestBody.content['application/json'] = {
            schema: { type: 'object', properties: {} },
          }
        }
        break
      case 'xml':
        if (brunoBody.xml) {
          requestBody.content['application/xml'] = {
            schema: { type: 'string' },
            example: brunoBody.xml,
          }
        }
        break
      case 'formUrlEncoded':
        if (brunoBody.formUrlEncoded && brunoBody.formUrlEncoded.length > 0) {
          const schema: SchemaObject = {
            type: 'object',
            properties: {},
          }

          for (const param of brunoBody.formUrlEncoded) {
            const paramName = param.name || 'defaultParam'
            ;(schema.properties as { [name: string]: SchemaObject | ReferenceObject })[paramName] =
              {
                type: 'string',
                example: param.value || undefined,
              }
          }

          requestBody.content['application/x-www-form-urlencoded'] = {
            schema,
          }
        } else {
          // Default to empty object if no form parameters
          requestBody.content['application/x-www-form-urlencoded'] = {
            schema: {
              type: 'object',
              properties: {},
            },
          }
        }
        break
      case 'multipartForm':
        if (brunoBody.multipartForm && brunoBody.multipartForm.length > 0) {
          const schema: SchemaObject = {
            type: 'object',
            properties: {},
          }

          for (const param of brunoBody.multipartForm) {
            const paramName = param.name || 'defaultParam'
            ;(schema.properties as { [name: string]: SchemaObject | ReferenceObject })[paramName] =
              {
                type: param.type === 'file' ? 'string' : 'string',
                format: param.type === 'file' ? 'binary' : undefined,
                example: param.value || undefined,
              }
          }

          requestBody.content['multipart/form-data'] = {
            schema,
          }
        } else {
          // Default to empty object if no multipart form parameters
          requestBody.content['multipart/form-data'] = {
            schema: {
              type: 'object',
              properties: {},
            },
          }
        }
        break
      case 'text':
        if (brunoBody.text) {
          requestBody.content['text/plain'] = {
            schema: { type: 'string' },
            example: brunoBody.text,
          }
        } else {
          requestBody.content['text/plain'] = {
            schema: { type: 'string' },
          }
        }
        break
      default:
        // For unknown modes, add a generic application/json content type
        requestBody.content['application/json'] = {
          schema: { type: 'object' },
        }
    }

    return requestBody
  }

  /**
   * Infers a schema from JSON content
   */
  private static inferSchemaFromJson(jsonStr: string): SchemaObject {
    try {
      const parsed = JSON.parse(jsonStr)
      return OpenApiGenerator.inferSchemaFromValue(parsed)
    } catch (e) {
      // If JSON parsing fails, return a generic string schema
      return { type: 'string', description: 'Could not parse JSON content, treating as string' }
    }
  }

  /**
   * Infers a schema from a JavaScript value
   */
  static inferSchemaFromValue(value: unknown): SchemaObject {
    const schema: SchemaObject = {
      type: typeof value as
        | 'string'
        | 'number'
        | 'boolean'
        | 'object'
        | 'null'
        | 'undefined'
        | 'symbol'
        | 'function',
    }

    if (value === null) {
      schema.type = 'null'
      return schema
    }

    if (Array.isArray(value)) {
      schema.type = 'array'
      if (value.length > 0) {
        // Use the first element to infer item schema
        schema.items = OpenApiGenerator.inferSchemaFromValue(value[0])
      } else {
        // For empty arrays, provide a generic item schema
        schema.items = { type: 'object' }
      }
      return schema
    }

    if (typeof value === 'object' && value !== null) {
      schema.type = 'object'
      schema.properties = {}

      // Use for...of to avoid forEach and non-null assertion
      for (const [key, propertyValue] of Object.entries(value)) {
        const propertySchema = OpenApiGenerator.inferSchemaFromValue(propertyValue)
        if (schema.properties) {
          schema.properties[key] = propertySchema
        }
      }

      return schema
    }

    // For primitive types, just return the basic schema
    return schema
  }

  /**
   * Creates default responses for an operation
   */
  static createDefaultResponses(): ResponsesObject {
    const responses: ResponsesObject = {}

    // Add a default 200 OK response
    responses['200'] = {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            description: 'Default response schema',
          },
        },
      },
    }

    // Add 400 Bad Request response
    responses['400'] = {
      description: 'Bad Request - The request was invalid',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
            },
          },
        },
      },
    }

    // Add 401 Unauthorized response
    responses['401'] = {
      description: 'Unauthorized - Authentication required',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
            },
          },
        },
      },
    }

    // Add 404 Not Found response
    responses['404'] = {
      description: 'Not Found - The requested resource does not exist',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
            },
          },
        },
      },
    }

    // Add 500 Internal Server Error response
    responses['500'] = {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
            },
          },
        },
      },
    }

    return responses
  }
}
