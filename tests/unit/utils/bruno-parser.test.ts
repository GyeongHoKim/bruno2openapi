import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrunoParser } from '../../../src/utils/bruno-parser.js'
import { FileReader } from '../../../src/utils/file-reader.js'

// Mock the FileReader
vi.mock('../../../src/utils/file-reader.js', () => ({
  FileReader: {
    isDirectory: vi.fn(),
    fileExists: vi.fn(),
    readFile: vi.fn(),
    getBruFiles: vi.fn(),
  },
}))

describe('BrunoParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseCollection', () => {
    it('should parse a Bruno collection successfully', async () => {
      vi.mocked(FileReader.isDirectory).mockResolvedValue(true)
      vi.mocked(FileReader.fileExists).mockResolvedValue(true)
      vi.mocked(FileReader.readFile).mockResolvedValue(
        JSON.stringify({ name: 'Test Collection', version: '1' }),
      )
      vi.mocked(FileReader.getBruFiles).mockResolvedValue([])

      const result = await BrunoParser.parseCollection('/test/collection')

      expect(result.name).toBe('Test Collection')
      expect(result.version).toBe('1')
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should handle collection without bruno.json', async () => {
      vi.mocked(FileReader.isDirectory).mockResolvedValue(true)
      vi.mocked(FileReader.fileExists).mockResolvedValue(false) // bruno.json doesn't exist
      vi.mocked(FileReader.getBruFiles).mockResolvedValue([])

      const result = await BrunoParser.parseCollection('/test/collection')

      expect(result.name).toBe('collection') // Should use directory name
      expect(result.version).toBe('1')
    })

    it('should throw an error for invalid collection path', async () => {
      vi.mocked(FileReader.isDirectory).mockResolvedValue(false)

      await expect(BrunoParser.parseCollection('/invalid/path')).rejects.toThrow(
        'Collection path does not exist or is not a directory: /invalid/path',
      )
    })
  })

  describe('isValidCollection', () => {
    it('should return true for a collection with bruno.json', async () => {
      vi.mocked(FileReader.fileExists).mockResolvedValue(true)

      const result = await BrunoParser.isValidCollection('/test/collection')

      expect(result).toBe(true)
    })

    it('should return true for a collection with .bru files', async () => {
      vi.mocked(FileReader.fileExists).mockResolvedValue(false) // No bruno.json
      vi.mocked(FileReader.getBruFiles).mockResolvedValue(['/test/file.bru'])

      const result = await BrunoParser.isValidCollection('/test/collection')

      expect(result).toBe(true)
    })

    it('should return false for a collection without bruno.json and no .bru files', async () => {
      vi.mocked(FileReader.fileExists).mockResolvedValue(false) // No bruno.json
      vi.mocked(FileReader.getBruFiles).mockResolvedValue([]) // No .bru files

      const result = await BrunoParser.isValidCollection('/test/collection')

      expect(result).toBe(false)
    })
  })

  describe('parseBruContent', () => {
    it('should parse a basic .bru file content correctly', async () => {
      const content = `[meta]
name=Test Request
seq=0

[request]
method=GET
url=https://api.example.com/users

[headers]
Content-Type=application/json
Authorization=Bearer token123
`

      const result = await BrunoParser.parseBruContent(content, 'test.bru')

      expect(result.name).toBe('Test Request')
      expect(result.type).toBe('http-request')
      expect(result.request?.method).toBe('GET')
      expect(result.request?.url).toBe('https://api.example.com/users')
      expect(result.request?.headers).toHaveLength(2)
      expect(result.request?.headers[0]).toMatchObject({
        name: 'Content-Type',
        value: 'application/json',
        enabled: true,
      })
      expect(result.request?.headers[1]).toMatchObject({
        name: 'Authorization',
        value: 'Bearer token123',
        enabled: true,
      })
    })

    it('should parse a .bru file with params section', async () => {
      const content = `[params]
userId=123
status=active
`

      const result = await BrunoParser.parseBruContent(content, 'test.bru')

      expect(result.request?.params).toHaveLength(2)
      expect(result.request?.params[0]).toMatchObject({
        name: 'userId',
        value: '123',
        enabled: true,
      })
      expect(result.request?.params[1]).toMatchObject({
        name: 'status',
        value: 'active',
        enabled: true,
      })
    })
  })
})
