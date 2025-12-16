import { describe, expect, it } from 'vitest'
import { OpenApiGenerator } from '../../../src/utils/openapi-generator'

describe('OpenApiGenerator', () => {
  describe('generateOpenApiSpec', () => {
    it('should generate a basic OpenAPI spec from a Bruno collection', () => {
      const collection = {
        name: 'Test Collection',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        brunoConfig: {
          version: '1',
          description: 'Test description',
        },
        pathname: '/test/collection',
      }

      const result = OpenApiGenerator.generateOpenApiSpec(collection)

      expect(result.spec.openapi).toBe('3.0.0')
      expect(result.spec.info.title).toBe('Test Collection')
      expect(result.spec.info.version).toBe('1')
      expect(result.spec.info.description).toBe('Test description')
      expect(result.spec.paths).toEqual({})
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('should handle collection without brunoConfig', () => {
      const collection = {
        name: 'Test Collection',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        pathname: '/test/collection',
      }

      const result = OpenApiGenerator.generateOpenApiSpec(collection)

      expect(result.spec.openapi).toBe('3.0.0')
      expect(result.spec.info.title).toBe('Test Collection')
      expect(result.spec.info.version).toBe('1.0.0')
      expect(result.spec.info.description).toContain(
        'OpenAPI specification generated from Bruno collection: Test Collection',
      )
    })
  })

  describe('inferSchemaFromValue', () => {
    it('should infer schema for string value', () => {
      const value = 'test string'
      const schema = OpenApiGenerator.inferSchemaFromValue(value)

      expect(schema.type).toBe('string')
    })

    it('should infer schema for number value', () => {
      const value = 42
      const schema = OpenApiGenerator.inferSchemaFromValue(value)

      expect(schema.type).toBe('number')
    })

    it('should infer schema for boolean value', () => {
      const value = true
      const schema = OpenApiGenerator.inferSchemaFromValue(value)

      expect(schema.type).toBe('boolean')
    })

    it('should infer schema for null value', () => {
      const value = null
      const schema = OpenApiGenerator.inferSchemaFromValue(value)

      expect(schema.type).toBe('null')
    })

    it('should infer schema for array value', () => {
      const value = [1, 2, 3]
      const schema = OpenApiGenerator.inferSchemaFromValue(value)

      expect(schema.type).toBe('array')
      expect(schema.items).toBeDefined()
      expect((schema.items as { type: string }).type).toBe('number')
    })

    it('should infer schema for object value', () => {
      const value = { name: 'test', count: 42 }
      const schema = OpenApiGenerator.inferSchemaFromValue(value)

      expect(schema.type).toBe('object')
      expect(schema.properties).toBeDefined()
      const properties = schema.properties as { [key: string]: { type: string } } | undefined
      expect(properties?.name?.type).toBe('string')
      expect(properties?.count?.type).toBe('number')
    })
  })

  describe('createDefaultResponses', () => {
    it('should create default responses with expected structure', () => {
      const responses = OpenApiGenerator.createDefaultResponses()

      expect(responses['200']).toBeDefined()
      expect(responses['400']).toBeDefined()
      expect(responses['401']).toBeDefined()
      expect(responses['404']).toBeDefined()
      expect(responses['500']).toBeDefined()

      const response200 = responses['200']
      expect(response200).toBeDefined()
      if (response200 && typeof response200 === 'object' && 'description' in response200) {
        expect((response200 as { description?: string }).description).toBe('Successful response')
      }
    })
  })
})
