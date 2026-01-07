import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPI } from 'openapi-types'
import { describe, expect, it } from 'vitest'
import { ConversionService } from '../../../src/services/conversion-service.js'
import type { BrunoCollection } from '../../../src/types/bruno.js'
import type { OpenAPIObject } from '../../../src/types/openapi.js'

/**
 * Converts OpenAPIObject to OpenAPI.Document format for SwaggerParser
 * Since OpenAPIObject is now a type alias for OpenAPIV3.Document,
 * and OpenAPI.Document is a union type that includes OpenAPIV3.Document,
 * we can safely return the spec directly after validation
 */
function toOpenAPIDocument(spec: OpenAPIObject): OpenAPI.Document {
  // Validate basic structure
  if (
    typeof spec !== 'object' ||
    spec === null ||
    !('openapi' in spec) ||
    !('info' in spec) ||
    !('paths' in spec) ||
    typeof spec.openapi !== 'string' ||
    typeof spec.info !== 'object' ||
    spec.info === null ||
    typeof spec.paths !== 'object' ||
    spec.paths === null
  ) {
    throw new Error('Invalid OpenAPI specification structure')
  }
  // OpenAPIObject is OpenAPIV3.Document, which is compatible with OpenAPI.Document
  return spec
}

describe('ConversionService', () => {
  const service = new ConversionService()

  describe('convertCollection', () => {
    it('should generate a valid OpenAPI 3.0 specification', async () => {
      const collection: BrunoCollection = {
        name: 'Test API',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          name: 'Test API',
        },
        pathname: '/test/collection',
      }

      const result = service.convertCollection(collection)

      // Check that the result has the expected structure
      expect(result).toHaveProperty('spec')
      expect(result).toHaveProperty('warnings')
      expect(Array.isArray(result.warnings)).toBe(true)

      const openApiSpec = result.spec

      // Verify basic OpenAPI structure
      expect(openApiSpec).toHaveProperty('openapi')
      expect(openApiSpec.openapi).toBe('3.0.0')
      expect(openApiSpec).toHaveProperty('info')
      expect(openApiSpec.info).toHaveProperty('title')
      expect(openApiSpec.info).toHaveProperty('version')
      expect(openApiSpec).toHaveProperty('paths')

      // Validate the spec with external library
      try {
        await SwaggerParser.validate(toOpenAPIDocument(result.spec))
        expect(true).toBe(true) // If validation doesn't throw, it's valid
      } catch (error) {
        console.error('OpenAPI validation failed:', error)
        expect(false).toBe(true) // Fail the test if validation throws
      }
    })

    it('should generate a valid OpenAPI spec with sample endpoints', async () => {
      const collection: BrunoCollection = {
        name: 'Sample API',
        version: '1' as const,
        items: [
          {
            uid: 'item-1',
            name: 'Get Users',
            type: 'http-request',
            pathname: '/users.bru',
            request: {
              url: '/users',
              method: 'GET',
              headers: [],
              params: [],
              auth: { mode: 'inherit' },
              script: {},
            },
            items: [],
          },
          {
            uid: 'item-2',
            name: 'Create User',
            type: 'http-request',
            pathname: '/create-user.bru',
            request: {
              url: '/users',
              method: 'POST',
              headers: [
                {
                  uid: 'header-1',
                  name: 'Content-Type',
                  value: 'application/json',
                  enabled: true,
                },
              ],
              params: [],
              auth: { mode: 'inherit' },
              script: {},
              body: {
                mode: 'json' as const,
                json: JSON.stringify({ name: 'John', email: 'john@example.com' }),
              },
            },
            items: [],
          },
        ],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          name: 'Sample API',
        },
        pathname: '/test/collection',
      }

      const result = service.convertCollection(collection)

      // Validate with external library
      try {
        // biome-ignore lint/suspicious/noExplicitAny: External library type incompatibility
        await SwaggerParser.validate(result.spec as any)
        expect(true).toBe(true) // If validation doesn't throw, it's valid
      } catch (error) {
        // If validation fails, provide more detailed error info
        console.error('OpenAPI validation failed:', error)
        expect(false).toBe(true) // Fail the test if validation throws
      }

      // Additional manual checks
      expect(result.spec.openapi).toBe('3.0.0')
      expect(result.spec.info.title).toBe('Sample API')
      expect(result.spec.paths).toBeDefined()
      expect(result.spec.paths['/users']).toBeDefined()
      expect(result.spec.paths['/users']?.get).toBeDefined()
      expect(result.spec.paths['/users']?.post).toBeDefined()
    })

    it('should handle collection with brunoConfig containing description', async () => {
      const collection: BrunoCollection = {
        name: 'API with Description',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          name: 'API with Description',
          description: 'This is a test API with a description',
        },
        pathname: '/test/collection',
      }

      const result = service.convertCollection(collection)

      // Validate the spec
      try {
        // biome-ignore lint/suspicious/noExplicitAny: External library type incompatibility
        await SwaggerParser.validate(result.spec as any)
        expect(true).toBe(true) // If validation doesn't throw, it's valid
      } catch (error) {
        console.error('OpenAPI validation failed:', error)
        expect(false).toBe(true) // Fail the test if validation throws
      }

      // Check that the description was properly transferred
      expect(result.spec.info.description).toBe('This is a test API with a description')
    })

    it('should handle collection with baseUrl', async () => {
      const collection: BrunoCollection = {
        name: 'API with Base URL',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          name: 'API with Base URL',
          baseUrl: 'https://api.example.com',
        },
        pathname: '/test/collection',
      }

      const result = service.convertCollection(collection)

      // Validate the spec
      try {
        // biome-ignore lint/suspicious/noExplicitAny: External library type incompatibility
        await SwaggerParser.validate(result.spec as any)
        expect(true).toBe(true) // If validation doesn't throw, it's valid
      } catch (error) {
        console.error('OpenAPI validation failed:', error)
        expect(false).toBe(true) // Fail the test if validation throws
      }

      // Check that the server was properly added
      expect(result.spec.servers).toBeDefined()
      expect(result.spec.servers).toEqual([{ url: 'https://api.example.com' }])
    })

    it('should produce a valid OpenAPI spec even with complex nested items', async () => {
      const collection: BrunoCollection = {
        name: 'Complex API',
        version: '1' as const,
        items: [
          {
            uid: 'folder-1',
            name: 'User Management',
            type: 'folder',
            items: [
              {
                uid: 'item-1',
                name: 'Get User by ID',
                type: 'http-request',
                pathname: '/get-user.bru',
                request: {
                  url: '/users/{id}',
                  method: 'GET',
                  headers: [],
                  params: [
                    {
                      uid: 'param-1',
                      name: 'id',
                      value: '123',
                      description: 'User ID',
                      type: 'path' as const,
                      enabled: true,
                    },
                  ],
                  auth: { mode: 'inherit' },
                  script: {},
                },
                items: [],
              },
            ],
            request: {
              url: '',
              method: 'GET',
              headers: [],
              params: [],
              auth: { mode: 'inherit' },
              script: {},
            },
            pathname: '/user-management/folder.bru',
          },
        ],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          name: 'Complex API',
        },
        pathname: '/test/collection',
      }

      const result = service.convertCollection(collection)

      // Validate the spec
      try {
        // biome-ignore lint/suspicious/noExplicitAny: External library type incompatibility
        await SwaggerParser.validate(result.spec as any)
        expect(true).toBe(true) // If validation doesn't throw, it's valid
      } catch (error) {
        console.error('OpenAPI validation failed:', error)
        expect(false).toBe(true) // Fail the test if validation throws
      }

      // Check specific aspects
      expect(result.spec.paths['/users/{id}']).toBeDefined()
      expect(result.spec.paths['/users/{id}']?.get).toBeDefined()
    })
  })

  describe('convertCollectionAsync', () => {
    it('should generate a valid OpenAPI spec asynchronously', async () => {
      const collection: BrunoCollection = {
        name: 'Async Test API',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          name: 'Async Test API',
        },
        pathname: '/test/collection',
      }

      const result = await service.convertCollectionAsync(collection)

      // Validate the spec
      try {
        // biome-ignore lint/suspicious/noExplicitAny: External library type incompatibility
        await SwaggerParser.validate(result.spec as any)
        expect(true).toBe(true) // If validation doesn't throw, it's valid
      } catch (error) {
        console.error('Async OpenAPI validation failed:', error)
        expect(false).toBe(true) // Fail the test if validation throws
      }

      expect(result.spec.openapi).toBe('3.0.0')
      expect(result.spec.info.title).toBe('Async Test API')
    })
  })
})
