import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BruFileParseError,
  InvalidBrunoJsonError,
  InvalidCollectionPathError,
  InvalidJsonError,
} from '../../../src/models/errors.js'
import { BrunoParser } from '../../../src/utils/bruno-parser.js'
import { FileReader } from '../../../src/utils/file-reader.js'

// Get fixture paths
const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures')
const sampleCollectionPath = path.join(fixturesDir, 'sample-bruno-collection')
const collectionWithoutBrunoJsonPath = path.join(fixturesDir, 'collection-without-bruno-json')
const emptyCollectionPath = path.join(fixturesDir, 'empty-collection')
const invalidBrunoJsonPath = path.join(fixturesDir, 'invalid-bruno-json-collection')
const nonObjectBrunoJsonPath = path.join(fixturesDir, 'non-object-bruno-json-collection')
const collectionWithBruFilePath = path.join(fixturesDir, 'collection-with-bru-file')
const authTestCollectionPath = path.join(fixturesDir, 'auth-test-collection')
const emptyBruFilePath = path.join(fixturesDir, 'empty-bru-file', 'empty.bru')
const minimalBruFilePath = path.join(fixturesDir, 'minimal-bru-file', 'minimal.bru')

describe('BrunoParser', () => {
  describe('parseCollection', () => {
    it('should parse a Bruno collection successfully', async () => {
      const result = await BrunoParser.parseCollection(sampleCollectionPath)

      expect(result.name).toBe('Test API Collection')
      expect(result.version).toBe('1')
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should handle collection without bruno.json', async () => {
      const result = await BrunoParser.parseCollection(collectionWithoutBrunoJsonPath)

      expect(result.name).toBe('collection-without-bruno-json') // Should use directory name
      expect(result.version).toBe('1')
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should throw InvalidCollectionPathError for invalid collection path', async () => {
      await expect(
        BrunoParser.parseCollection('/invalid/path/that/does/not/exist'),
      ).rejects.toBeInstanceOf(InvalidCollectionPathError)
    })

    it('should throw InvalidJsonError for invalid JSON in bruno.json', async () => {
      await expect(BrunoParser.parseCollection(invalidBrunoJsonPath)).rejects.toBeInstanceOf(
        InvalidJsonError,
      )
    })

    it('should throw InvalidBrunoJsonError when bruno.json is not an object', async () => {
      await expect(BrunoParser.parseCollection(nonObjectBrunoJsonPath)).rejects.toBeInstanceOf(
        InvalidBrunoJsonError,
      )
    })

    it('should handle collection with collection.bru file', async () => {
      const result = await BrunoParser.parseCollection(collectionWithBruFilePath)

      expect(result.name).toBe('Collection with .bru file')
      expect(result.root).toBeDefined()
      expect(result.root?.type).toBe('collection')
      expect(result.items.length).toBeGreaterThan(0)
    })
  })

  describe('parseBruFiles', () => {
    it('should parse multiple .bru files', async () => {
      const bruFiles = await FileReader.getBruFiles(sampleCollectionPath)
      const result = await BrunoParser.parseBruFiles(bruFiles, sampleCollectionPath)

      expect(result.length).toBeGreaterThan(1)
      expect(result.every(item => item.type === 'http-request')).toBe(true)
    })

    it('should throw BruFileParseError when a .bru file fails to parse', async () => {
      const invalidBruFiles = ['/nonexistent/file.bru']
      await expect(
        BrunoParser.parseBruFiles(invalidBruFiles, sampleCollectionPath),
      ).rejects.toBeInstanceOf(BruFileParseError)
    })
  })

  describe('isValidCollection', () => {
    it('should return true for a collection with bruno.json', async () => {
      const result = await BrunoParser.isValidCollection(sampleCollectionPath)

      expect(result).toBe(true)
    })

    it('should return true for a collection with .bru files', async () => {
      const result = await BrunoParser.isValidCollection(collectionWithoutBrunoJsonPath)

      expect(result).toBe(true)
    })

    it('should return false for a collection without bruno.json and no .bru files', async () => {
      // Create empty directory if it doesn't exist
      const result = await BrunoParser.isValidCollection(emptyCollectionPath)

      expect(result).toBe(false)
    })
  })

  describe('parseBruContent', () => {
    it('should parse a basic .bru file content correctly', async () => {
      const bruFilePath = path.join(sampleCollectionPath, 'get-users.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'get-users.bru')

      expect(result.name).toBe('Get Users')
      expect(result.type).toBe('http-request')
      expect(result.request?.method).toBe('GET')
      expect(result.request?.url).toBe('https://api.example.com/users')
      expect(result.request?.headers).toHaveLength(2)
      expect(result.request?.headers?.[0]).toMatchObject({
        name: 'Content-Type',
        value: 'application/json',
        enabled: true,
      })
      expect(result.request?.headers?.[1]).toMatchObject({
        name: 'Authorization',
        value: 'Bearer {{token}}',
        enabled: true,
      })
    })

    it('should parse a .bru file with params section', async () => {
      const bruFilePath = path.join(sampleCollectionPath, 'search-users.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'search-users.bru')

      expect(result.request?.params).toHaveLength(4)
      expect(result.request?.params?.[0]).toMatchObject({
        name: 'q',
        value: 'john',
        enabled: true,
      })
      expect(result.request?.params?.[1]).toMatchObject({
        name: 'status',
        value: 'active',
        enabled: true,
      })
      expect(result.request?.params?.[2]).toMatchObject({
        name: 'sort',
        value: 'name',
        enabled: true,
      })
      expect(result.request?.params?.[3]).toMatchObject({
        name: 'order',
        value: 'asc',
        enabled: true,
      })
    })

    it('should parse a .bru file with JSON body', async () => {
      const bruFilePath = path.join(sampleCollectionPath, 'create-user.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'create-user.bru')

      expect(result.name).toBe('Create User')
      expect(result.request?.method).toBe('POST')
      expect(result.request?.body).toBeDefined()
      expect(result.request?.body?.mode).toBe('json')
      expect(result.request?.body?.json).toBeDefined()
    })

    it('should parse different HTTP methods correctly', async () => {
      // Test PUT
      const putFilePath = path.join(sampleCollectionPath, 'update-user.bru')
      const putContent = await FileReader.readFile(putFilePath)
      const putResult = await BrunoParser.parseBruContent(putContent, 'update-user.bru')
      expect(putResult.request?.method).toBe('PUT')

      // Test PATCH
      const patchFilePath = path.join(sampleCollectionPath, 'patch-user.bru')
      const patchContent = await FileReader.readFile(patchFilePath)
      const patchResult = await BrunoParser.parseBruContent(patchContent, 'patch-user.bru')
      expect(patchResult.request?.method).toBe('PATCH')

      // Test DELETE
      const deleteFilePath = path.join(sampleCollectionPath, 'delete-user.bru')
      const deleteContent = await FileReader.readFile(deleteFilePath)
      const deleteResult = await BrunoParser.parseBruContent(deleteContent, 'delete-user.bru')
      expect(deleteResult.request?.method).toBe('DELETE')

      // Test HEAD
      const headFilePath = path.join(sampleCollectionPath, 'head-user.bru')
      const headContent = await FileReader.readFile(headFilePath)
      const headResult = await BrunoParser.parseBruContent(headContent, 'head-user.bru')
      expect(headResult.request?.method).toBe('HEAD')

      // Test OPTIONS
      const optionsFilePath = path.join(sampleCollectionPath, 'options-user.bru')
      const optionsContent = await FileReader.readFile(optionsFilePath)
      const optionsResult = await BrunoParser.parseBruContent(optionsContent, 'options-user.bru')
      expect(optionsResult.request?.method).toBe('OPTIONS')
    })

    it('should parse a .bru file with form-urlencoded body', async () => {
      const bruFilePath = path.join(sampleCollectionPath, 'create-user-form.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'create-user-form.bru')

      expect(result.request?.body).toBeDefined()
      expect(result.request?.body?.mode).toBe('formUrlEncoded')
    })

    it('should parse a .bru file with text body', async () => {
      const bruFilePath = path.join(sampleCollectionPath, 'send-message.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'send-message.bru')

      expect(result.request?.body).toBeDefined()
      expect(result.request?.body?.mode).toBe('text')
      expect(result.request?.body?.text).toBeDefined()
    })

    it('should parse a .bru file with XML body', async () => {
      const bruFilePath = path.join(sampleCollectionPath, 'create-xml-data.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'create-xml-data.bru')

      expect(result.request?.body).toBeDefined()
      expect(result.request?.body?.mode).toBe('xml')
      expect(result.request?.body?.xml).toBeDefined()
    })

    it('should parse a .bru file with basic auth', async () => {
      const bruFilePath = path.join(authTestCollectionPath, 'request-with-basic-auth.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'request-with-basic-auth.bru')

      expect(result.request?.auth).toBeDefined()
      expect(result.request?.auth?.mode).toBe('basic')
      expect(result.request?.auth?.basic).toBeDefined()
      expect(result.request?.auth?.basic?.username).toBe('admin')
      expect(result.request?.auth?.basic?.password).toBe('secret123')
    })

    it('should parse a .bru file with bearer auth', async () => {
      const bruFilePath = path.join(authTestCollectionPath, 'request-with-bearer-auth.bru')
      const content = await FileReader.readFile(bruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'request-with-bearer-auth.bru')

      expect(result.request?.auth).toBeDefined()
      expect(result.request?.auth?.mode).toBe('bearer')
      expect(result.request?.auth?.bearer).toBeDefined()
      expect(result.request?.auth?.bearer?.token).toBe('{{bearerToken}}')
    })

    it('should handle empty .bru file', async () => {
      const content = await FileReader.readFile(emptyBruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'empty.bru')

      expect(result.name).toBe('empty')
      expect(result.type).toBe('http-request')
    })

    it('should handle minimal .bru file with only meta section', async () => {
      const content = await FileReader.readFile(minimalBruFilePath)

      const result = await BrunoParser.parseBruContent(content, 'minimal.bru')

      expect(result.name).toBe('Minimal Request')
      expect(result.type).toBe('http-request')
    })
  })

  describe('parseCollectionSync', () => {
    it('should parse a Bruno collection synchronously', () => {
      const result = BrunoParser.parseCollectionSync(sampleCollectionPath)

      expect(result.name).toBe('Test API Collection')
      expect(result.version).toBe('1')
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should throw InvalidCollectionPathError for invalid collection path synchronously', () => {
      expect(() => BrunoParser.parseCollectionSync('/invalid/path/that/does/not/exist')).toThrow(
        InvalidCollectionPathError,
      )
    })
  })

  describe('parseBruFilesSync', () => {
    it('should parse multiple .bru files synchronously', () => {
      const bruFiles = FileReader.getBruFilesSync(sampleCollectionPath)
      const result = BrunoParser.parseBruFilesSync(bruFiles, sampleCollectionPath)

      expect(result.length).toBeGreaterThan(1)
    })
  })

  describe('parseBruContentSync', () => {
    it('should parse .bru file content synchronously', () => {
      const bruFilePath = path.join(sampleCollectionPath, 'get-users.bru')
      const content = FileReader.readFileSync(bruFilePath)

      const result = BrunoParser.parseBruContentSync(content, 'get-users.bru')

      expect(result.name).toBe('Get Users')
      expect(result.request?.method).toBe('GET')
    })
  })

  describe('isValidCollectionSync', () => {
    it('should return true for a valid collection synchronously', () => {
      const result = BrunoParser.isValidCollectionSync(sampleCollectionPath)

      expect(result).toBe(true)
    })

    it('should return false for an invalid collection synchronously', () => {
      const result = BrunoParser.isValidCollectionSync(emptyCollectionPath)

      expect(result).toBe(false)
    })
  })
})
