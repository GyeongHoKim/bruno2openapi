import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  convertBrunoCollectionToOpenAPI,
  convertBrunoCollectionToOpenAPISync,
  isValidBrunoCollection,
} from '../../src/index.js'
import { BrunoParser } from '../../src/utils/bruno-parser.js'
import { OpenApiGenerator } from '../../src/utils/openapi-generator.js'

// Mock the utility classes
vi.mock('../../src/utils/bruno-parser.js', () => ({
  BrunoParser: {
    parseCollection: vi.fn(),
    isValidCollection: vi.fn(),
  },
}))

vi.mock('../../src/utils/openapi-generator.js', () => ({
  OpenApiGenerator: {
    generateOpenApiSpec: vi.fn(),
  },
}))

describe('index.ts functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('convertBrunoCollectionToOpenAPI', () => {
    it('should convert a Bruno collection to OpenAPI successfully', async () => {
      const mockCollection = {
        name: 'Test Collection',
        version: '1' as const,
        items: [],
        uid: 'test-uid',
        pathname: '/test/path',
      }

      const mockResult = {
        spec: {
          openapi: '3.0.0' as const,
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
        },
        warnings: [],
        content: JSON.stringify({
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
        }),
      }

      vi.mocked(BrunoParser.parseCollection).mockResolvedValue(mockCollection)
      vi.mocked(OpenApiGenerator.generateOpenApiSpec).mockReturnValue(mockResult)

      const result = await convertBrunoCollectionToOpenAPI('/test/collection')

      expect(BrunoParser.parseCollection).toHaveBeenCalledWith('/test/collection')
      expect(OpenApiGenerator.generateOpenApiSpec).toHaveBeenCalledWith(mockCollection)
      expect(result).toEqual(mockResult)
    })

    it('should throw an error when collection parsing fails', async () => {
      vi.mocked(BrunoParser.parseCollection).mockRejectedValue(new Error('Parse error'))

      await expect(convertBrunoCollectionToOpenAPI('/test/collection')).rejects.toThrow(
        'Failed to convert Bruno collection to OpenAPI: Parse error',
      )
    })
  })

  describe('isValidBrunoCollection', () => {
    it('should return true for a valid Bruno collection', async () => {
      vi.mocked(BrunoParser.isValidCollection).mockResolvedValue(true)

      const result = await isValidBrunoCollection('/test/collection')

      expect(BrunoParser.isValidCollection).toHaveBeenCalledWith('/test/collection')
      expect(result).toBe(true)
    })

    it('should return false for an invalid Bruno collection', async () => {
      vi.mocked(BrunoParser.isValidCollection).mockResolvedValue(false)

      const result = await isValidBrunoCollection('/test/collection')

      expect(BrunoParser.isValidCollection).toHaveBeenCalledWith('/test/collection')
      expect(result).toBe(false)
    })

    it('should return false when validation throws an error', async () => {
      vi.mocked(BrunoParser.isValidCollection).mockRejectedValue(new Error('Validation error'))

      const result = await isValidBrunoCollection('/test/collection')

      expect(result).toBe(false) // Should return false on error, not throw
    })
  })

  describe('convertBrunoCollectionToOpenAPISync', () => {
    it('should throw an error for sync conversion', () => {
      expect(() => convertBrunoCollectionToOpenAPISync('/test/collection')).toThrow(
        'Collection path does not exist or is not a directory: /test/collection',
      )
    })
  })
})
