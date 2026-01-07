import { join } from 'node:path'
import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPI } from 'openapi-types'
import { describe, expect, it } from 'vitest'
import {
  convertBrunoCollectionToOpenAPI,
  convertBrunoCollectionToOpenAPISync,
} from '../../src/index.js'
import type { OpenAPIObject } from '../../src/types/openapi.js'
import type { ConvertResult } from '../../src/types/result.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isArrayOfUnknown(value: unknown): value is Array<unknown> {
  return Array.isArray(value)
}

function isError(error: unknown): error is Error {
  return error instanceof Error
}

function hasProperty<T extends string>(obj: unknown, prop: T): obj is Record<T, unknown> {
  return isRecord(obj) && prop in obj
}

function hasNameProperty(obj: unknown): obj is Record<string, unknown> & { name: unknown } {
  return hasProperty(obj, 'name')
}

function toOpenAPIDocument(spec: OpenAPIObject): OpenAPI.Document {
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
  return spec
}

function validateOpenAPIStructure(spec: OpenAPIObject): void {
  expect(spec).toBeDefined()
  expect(typeof spec).toBe('object')
  expect(spec).not.toBeNull()

  expect(spec.openapi).toBe('3.0.0')
  expect(spec.info).toBeDefined()
  expect(typeof spec.info).toBe('object')
  expect(spec.info.title).toBeDefined()
  expect(typeof spec.info.title).toBe('string')
  expect(spec.info.version).toBeDefined()
  expect(typeof spec.info.version).toBe('string')

  expect(spec.paths).toBeDefined()
  expect(typeof spec.paths).toBe('object')
}

function validateParameter(param: unknown, expectedName: string): void {
  expect(param).toBeDefined()
  expect(param).not.toBeNull()
  expect(typeof param).toBe('object')

  expect(isRecord(param)).toBe(true)
  if (!isRecord(param)) return

  expect(param).toHaveProperty('name', expectedName)
  expect(typeof param.name).toBe('string')
  expect(param).toHaveProperty('in')
  expect(['query', 'header', 'path', 'cookie']).toContain(param.in)
}

function validateOperation(operation: unknown): void {
  expect(operation).toBeDefined()
  expect(operation).not.toBeNull()
  expect(typeof operation).toBe('object')

  expect(isRecord(operation)).toBe(true)
  if (!isRecord(operation)) return

  expect(operation).toHaveProperty('summary')
  expect(typeof operation.summary).toBe('string')
  expect(operation).toHaveProperty('description')
  expect(typeof operation.description).toBe('string')
  expect(operation).toHaveProperty('responses')
  expect(typeof operation.responses).toBe('object')

  expect(isRecord(operation.responses)).toBe(true)
  if (!isRecord(operation.responses)) return

  const responses = operation.responses
  expect(responses).toHaveProperty('200')
  expect(responses).toHaveProperty('400')
  expect(responses).toHaveProperty('401')
  expect(responses).toHaveProperty('404')
  expect(responses).toHaveProperty('500')

  for (const code of ['200', '400', '401', '404', '500']) {
    const responseValue = responses[code]
    expect(isRecord(responseValue)).toBe(true)
    if (!isRecord(responseValue)) continue

    expect(responseValue).toHaveProperty('description')
    expect(typeof responseValue.description).toBe('string')
  }
}

function validateWarnings(result: ConvertResult): void {
  expect(result).toBeDefined()
  expect(result.spec).toBeDefined()
  expect(result.warnings).toBeDefined()
  expect(Array.isArray(result.warnings)).toBe(true)

  for (const warning of result.warnings) {
    expect(warning).toBeDefined()
    expect(typeof warning).toBe('object')
    expect(warning.message).toBeDefined()
    expect(typeof warning.message).toBe('string')
    expect(warning.itemName).toBeDefined()
    expect(typeof warning.itemName).toBe('string')
  }
}

async function validateWithSwaggerParser(spec: OpenAPIObject): Promise<void> {
  let validationError: Error | null = null
  try {
    const result = await SwaggerParser.validate(toOpenAPIDocument(spec))
    expect(result).toBeDefined()
  } catch (error) {
    if (isError(error)) {
      validationError = error
    }
  }

  expect(validationError).toBeNull()
}

const fixturesDir = join(__dirname, '../fixtures')

const fixtureDirs = [
  'auth-test-collection',
  'collection-with-bru-file',
  'collection-without-bruno-json',
  'empty-bru-file',
  'empty-collection',
  'minimal-bru-file',
  'sample-bruno-collection',
]

describe('convertBrunoCollectionToOpenAPI - Snapshot Tests', () => {
  for (const fixtureDir of fixtureDirs) {
    describe(fixtureDir, () => {
      it('should generate a valid OpenAPI specification', async () => {
        const fixturePath = join(fixturesDir, fixtureDir)
        const result = await convertBrunoCollectionToOpenAPI(fixturePath)

        validateWarnings(result)
        validateOpenAPIStructure(result.spec)
        await validateWithSwaggerParser(result.spec)
      })

      it('should match expected OpenAPI specification snapshot', async () => {
        const fixturePath = join(fixturesDir, fixtureDir)
        const result = await convertBrunoCollectionToOpenAPI(fixturePath)

        validateWarnings(result)
        expect(JSON.stringify(result.spec, null, 2)).toMatchSnapshot()
      })
    })
  }

  describe('invalid-bruno-json-collection', () => {
    it('should throw an error for invalid JSON', async () => {
      const fixturePath = join(fixturesDir, 'invalid-bruno-json-collection')
      await expect(convertBrunoCollectionToOpenAPI(fixturePath)).rejects.toThrow()
    })
  })

  describe('non-object-bruno-json-collection', () => {
    it('should throw an error when bruno.json is not an object', async () => {
      const fixturePath = join(fixturesDir, 'non-object-bruno-json-collection')
      await expect(convertBrunoCollectionToOpenAPI(fixturePath)).rejects.toThrow()
    })
  })
})

describe('convertBrunoCollectionToOpenAPISync - Snapshot Tests', () => {
  for (const fixtureDir of fixtureDirs) {
    describe(fixtureDir, () => {
      it('should generate a valid OpenAPI specification', async () => {
        const fixturePath = join(fixturesDir, fixtureDir)
        const result = convertBrunoCollectionToOpenAPISync(fixturePath)

        validateWarnings(result)
        validateOpenAPIStructure(result.spec)
        await validateWithSwaggerParser(result.spec)
      })

      it('should match expected OpenAPI specification snapshot', () => {
        const fixturePath = join(fixturesDir, fixtureDir)
        const result = convertBrunoCollectionToOpenAPISync(fixturePath)

        validateWarnings(result)
        expect(JSON.stringify(result.spec, null, 2)).toMatchSnapshot()
      })
    })
  }

  describe('invalid-bruno-json-collection', () => {
    it('should throw an error for invalid JSON', () => {
      const fixturePath = join(fixturesDir, 'invalid-bruno-json-collection')
      expect(() => {
        convertBrunoCollectionToOpenAPISync(fixturePath)
      }).toThrow()
    })
  })

  describe('non-object-bruno-json-collection', () => {
    it('should throw an error when bruno.json is not an object', () => {
      const fixturePath = join(fixturesDir, 'non-object-bruno-json-collection')
      expect(() => {
        convertBrunoCollectionToOpenAPISync(fixturePath)
      }).toThrow()
    })
  })
})

describe('sample-bruno-collection - Field Validation', () => {
  const fixturePath = join(fixturesDir, 'sample-bruno-collection')

  it('should contain all expected fields in the parsed OpenAPI spec', async () => {
    const result = await convertBrunoCollectionToOpenAPI(fixturePath)

    validateWarnings(result)
    await validateWithSwaggerParser(result.spec)

    const spec = result.spec
    validateOpenAPIStructure(spec)

    const paths = spec.paths
    expect(paths).toHaveProperty('/users')
    expect(typeof paths['/users']).toBe('object')
    const usersPath = paths['/users']
    expect(usersPath).toBeDefined()
    expect(usersPath).not.toBeNull()
    if (!usersPath) return

    expect(usersPath).toHaveProperty('get')
    expect(usersPath).toHaveProperty('post')

    const getUsers = usersPath.get
    expect(getUsers).toBeDefined()
    expect(getUsers).not.toBeNull()
    if (!getUsers) return

    validateOperation(getUsers)

    expect(getUsers).toHaveProperty('parameters')
    expect(Array.isArray(getUsers.parameters)).toBe(true)
    expect(isArrayOfUnknown(getUsers.parameters)).toBe(true)

    if (!isArrayOfUnknown(getUsers.parameters)) return
    const getUsersParams = getUsers.parameters

    const limitParam = getUsersParams.find(p => hasNameProperty(p) && p.name === 'limit')
    const offsetParam = getUsersParams.find(p => hasNameProperty(p) && p.name === 'offset')

    expect(limitParam).toBeDefined()
    expect(offsetParam).toBeDefined()
    validateParameter(limitParam, 'limit')
    validateParameter(offsetParam, 'offset')

    const postUsers = usersPath.post
    expect(postUsers).toBeDefined()
    expect(postUsers).not.toBeNull()
    if (!postUsers) return

    validateOperation(postUsers)
    expect(postUsers).toHaveProperty('requestBody')

    expect(paths).toHaveProperty('/users/123')
    expect(typeof paths['/users/123']).toBe('object')
    const users123Path = paths['/users/123']
    expect(users123Path).toBeDefined()
    expect(users123Path).not.toBeNull()
    if (!users123Path) return

    expect(users123Path).toHaveProperty('put')
    expect(users123Path).toHaveProperty('patch')
    expect(users123Path).toHaveProperty('delete')
    expect(users123Path).toHaveProperty('head')
    expect(users123Path).toHaveProperty('options')

    const putUser = users123Path.put
    expect(putUser).toBeDefined()
    expect(putUser).not.toBeNull()
    if (!putUser) return

    expect(putUser).toHaveProperty('requestBody')
    expect(putUser).toHaveProperty('responses')

    const userByIdPathKey = '/users/%7B%7BuserId%7D%7D'
    expect(paths).toHaveProperty(userByIdPathKey)
    expect(typeof paths[userByIdPathKey]).toBe('object')
    const userByIdPath = paths[userByIdPathKey]
    expect(userByIdPath).toBeDefined()
    expect(userByIdPath).not.toBeNull()
    if (!userByIdPath) return

    expect(userByIdPath).toHaveProperty('get')
    const getUserById = userByIdPath.get
    expect(getUserById).toBeDefined()
    expect(getUserById).not.toBeNull()
    if (!getUserById) return

    validateOperation(getUserById)

    expect(paths).toHaveProperty('/users/search')
    expect(typeof paths['/users/search']).toBe('object')
    const searchPath = paths['/users/search']
    expect(searchPath).toBeDefined()
    expect(searchPath).not.toBeNull()
    if (!searchPath) return

    expect(searchPath).toHaveProperty('get')
    const searchUsers = searchPath.get
    expect(searchUsers).toBeDefined()
    expect(searchUsers).not.toBeNull()
    if (!searchUsers) return

    validateOperation(searchUsers)

    expect(searchUsers).toHaveProperty('parameters')
    expect(Array.isArray(searchUsers.parameters)).toBe(true)
    expect(isArrayOfUnknown(searchUsers.parameters)).toBe(true)

    if (!isArrayOfUnknown(searchUsers.parameters)) return
    const searchParams = searchUsers.parameters

    const qParam = searchParams.find(p => hasNameProperty(p) && p.name === 'q')
    const statusParam = searchParams.find(p => hasNameProperty(p) && p.name === 'status')
    const sortParam = searchParams.find(p => hasNameProperty(p) && p.name === 'sort')
    const orderParam = searchParams.find(p => hasNameProperty(p) && p.name === 'order')

    expect(qParam).toBeDefined()
    expect(statusParam).toBeDefined()
    expect(sortParam).toBeDefined()
    expect(orderParam).toBeDefined()
    validateParameter(qParam, 'q')
    validateParameter(statusParam, 'status')
    validateParameter(sortParam, 'sort')
    validateParameter(orderParam, 'order')

    expect(paths).toHaveProperty('/users/form')
    expect(typeof paths['/users/form']).toBe('object')
    const formPath = paths['/users/form']
    expect(formPath).toBeDefined()
    expect(formPath).not.toBeNull()
    if (!formPath) return

    expect(formPath).toHaveProperty('post')
    const postForm = formPath.post
    expect(postForm).toBeDefined()
    expect(postForm).not.toBeNull()
    if (!postForm) return

    validateOperation(postForm)
    expect(postForm).toHaveProperty('requestBody')

    expect(paths).toHaveProperty('/messages')
    expect(typeof paths['/messages']).toBe('object')
    const messagesPath = paths['/messages']
    expect(messagesPath).toBeDefined()
    expect(messagesPath).not.toBeNull()
    if (!messagesPath) return

    expect(messagesPath).toHaveProperty('post')
    const postMessage = messagesPath.post
    expect(postMessage).toBeDefined()
    expect(postMessage).not.toBeNull()
    if (!postMessage) return

    validateOperation(postMessage)
    expect(postMessage).toHaveProperty('requestBody')

    expect(paths).toHaveProperty('/data')
    expect(typeof paths['/data']).toBe('object')
    const dataPath = paths['/data']
    expect(dataPath).toBeDefined()
    expect(dataPath).not.toBeNull()
    if (!dataPath) return

    expect(dataPath).toHaveProperty('post')
    const postData = dataPath.post
    expect(postData).toBeDefined()
    expect(postData).not.toBeNull()
    if (!postData) return

    validateOperation(postData)
    expect(postData).toHaveProperty('requestBody')

    expect(paths).toHaveProperty('/upload')
    expect(typeof paths['/upload']).toBe('object')
    const uploadPath = paths['/upload']
    expect(uploadPath).toBeDefined()
    expect(uploadPath).not.toBeNull()

    expect(uploadPath).toHaveProperty('post')
  })

  it('should have proper content types for different body types', async () => {
    const result = await convertBrunoCollectionToOpenAPI(fixturePath)

    validateWarnings(result)

    const spec = result.spec
    const paths = spec.paths

    const formPath = paths['/users/form']
    expect(formPath).toBeDefined()
    expect(formPath).toHaveProperty('post')

    if (formPath?.post?.requestBody && typeof formPath.post.requestBody === 'object') {
      const requestBody = formPath.post.requestBody
      expect(isRecord(requestBody)).toBe(true)
      if (!isRecord(requestBody)) return

      expect(requestBody).toHaveProperty('content')
      expect(typeof requestBody.content).toBe('object')
      expect(isRecord(requestBody.content)).toBe(true)
      if (!isRecord(requestBody.content)) return

      expect(requestBody.content).toHaveProperty('application/x-www-form-urlencoded')
    }

    const dataPath = paths['/data']
    expect(dataPath).toBeDefined()
    expect(dataPath).toHaveProperty('post')

    if (dataPath?.post?.requestBody && typeof dataPath.post.requestBody === 'object') {
      const requestBody = dataPath.post.requestBody
      expect(isRecord(requestBody)).toBe(true)
      if (!isRecord(requestBody)) return

      expect(requestBody).toHaveProperty('content')
      expect(typeof requestBody.content).toBe('object')
      expect(isRecord(requestBody.content)).toBe(true)
      if (!isRecord(requestBody.content)) return

      expect(requestBody.content).toHaveProperty('application/xml')
    }

    const messagesPath = paths['/messages']
    expect(messagesPath).toBeDefined()
    expect(messagesPath).toHaveProperty('post')

    if (messagesPath?.post?.requestBody && typeof messagesPath.post.requestBody === 'object') {
      const requestBody = messagesPath.post.requestBody
      expect(isRecord(requestBody)).toBe(true)
      if (!isRecord(requestBody)) return

      expect(requestBody).toHaveProperty('content')
      expect(typeof requestBody.content).toBe('object')
      expect(isRecord(requestBody.content)).toBe(true)
      if (!isRecord(requestBody.content)) return

      expect(requestBody.content).toHaveProperty('text/plain')
    }
  })
})
