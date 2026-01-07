import path from 'node:path'
import {
  BruFileParseError,
  InvalidBrunoJsonError,
  InvalidCollectionPathError,
  InvalidJsonError,
} from '../models/errors.js'
import type {
  BrunoAuth,
  BrunoBody,
  BrunoCollection,
  BrunoHeader,
  BrunoItem,
  BrunoKeyValue,
  BrunoParam,
  BrunoRequest,
} from '../types/bruno.js'
import { FileReader } from './file-reader.js'

function hasNameProperty(obj: unknown): obj is { name: string } {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  if (!('name' in obj)) {
    return false
  }
  if (!Object.prototype.hasOwnProperty.call(obj, 'name')) {
    return false
  }
  const nameValue = (obj as { name: unknown }).name
  return typeof nameValue === 'string' && nameValue.length > 0
}

function hasVersionProperty(obj: unknown): obj is { version: string } {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  if (!('version' in obj)) {
    return false
  }
  if (!Object.prototype.hasOwnProperty.call(obj, 'version')) {
    return false
  }
  const versionValue = (obj as { version: unknown }).version
  return typeof versionValue === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isError(value: unknown): value is Error {
  return value instanceof Error
}

const VALID_AUTH_MODES = [
  'inherit',
  'none',
  'awsv4',
  'basic',
  'bearer',
  'digest',
  'ntlm',
  'oauth2',
  'wsse',
  'apikey',
] as const

type AuthMode = (typeof VALID_AUTH_MODES)[number]

function isValidAuthMode(value: string): value is AuthMode {
  return VALID_AUTH_MODES.includes(value as AuthMode)
}

const VALID_ITEM_TYPES = [
  'folder',
  'http-request',
  'graphql-request',
  'js',
  'grpc-request',
  'ws-request',
] as const

type ItemType = (typeof VALID_ITEM_TYPES)[number]

function isValidItemType(value: string): value is ItemType {
  return VALID_ITEM_TYPES.includes(value as ItemType)
}

const VALID_HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
  'connect',
] as const

type HttpMethod = (typeof VALID_HTTP_METHODS)[number]

const VALID_BODY_MODES = [
  'none',
  'json',
  'text',
  'xml',
  'formUrlEncoded',
  'multipartForm',
  'graphql',
  'sparql',
  'file',
] as const

type BodyMode = (typeof VALID_BODY_MODES)[number]

function hasRequiredBrunoRequestFields(
  partial: Partial<BrunoRequest>,
): partial is Required<Pick<BrunoRequest, 'url' | 'method' | 'headers' | 'params'>> &
  Partial<BrunoRequest> {
  return (
    typeof partial.url === 'string' &&
    typeof partial.method === 'string' &&
    Array.isArray(partial.headers) &&
    Array.isArray(partial.params)
  )
}

function createBrunoRequest(partial: Partial<BrunoRequest> = {}): BrunoRequest {
  if (!hasRequiredBrunoRequestFields(partial)) {
    throw new Error('BrunoRequest requires url, method, headers, and params fields')
  }
  return {
    url: partial.url,
    method: partial.method,
    headers: partial.headers,
    params: partial.params,
    auth: partial.auth ?? null,
    body: partial.body,
    script: partial.script,
    vars: partial.vars ?? null,
    assertions: partial.assertions ?? null,
    tests: partial.tests ?? null,
    docs: partial.docs ?? null,
    tags: partial.tags ?? null,
  }
}

function hasRequiredBrunoBodyFields(
  partial: Partial<BrunoBody>,
): partial is Required<Pick<BrunoBody, 'mode'>> & Partial<BrunoBody> {
  return typeof partial.mode === 'string'
}

function createBrunoBody(partial: Partial<BrunoBody>): BrunoBody {
  if (!hasRequiredBrunoBodyFields(partial)) {
    throw new Error('BrunoBody requires mode field')
  }
  return {
    mode: partial.mode,
    json: partial.json,
    text: partial.text,
    xml: partial.xml,
    sparql: partial.sparql,
    formUrlEncoded: partial.formUrlEncoded,
    multipartForm: partial.multipartForm,
    graphql: partial.graphql,
    file: partial.file,
  }
}

function hasRequiredBrunoAuthFields(
  partial: Partial<BrunoAuth>,
): partial is Required<Pick<BrunoAuth, 'mode'>> & Partial<BrunoAuth> {
  return typeof partial.mode === 'string'
}

function createBrunoAuth(partial: Partial<BrunoAuth>): BrunoAuth {
  if (!hasRequiredBrunoAuthFields(partial)) {
    throw new Error('BrunoAuth requires mode field')
  }
  return {
    mode: partial.mode,
    awsv4: partial.awsv4,
    basic: partial.basic,
    bearer: partial.bearer,
    ntlm: partial.ntlm,
    digest: partial.digest,
    oauth2: partial.oauth2,
    wsse: partial.wsse,
    apikey: partial.apikey,
  }
}

function hasRequiredBrunoItemFields(
  partial: Partial<BrunoItem>,
  relativePath: string,
): partial is Required<Pick<BrunoItem, 'uid' | 'type' | 'name'>> & Partial<BrunoItem> {
  return (
    typeof partial.uid === 'string' &&
    typeof partial.type === 'string' &&
    typeof partial.name === 'string'
  )
}

function createBrunoItem(partial: Partial<BrunoItem>, relativePath: string): BrunoItem {
  const uid = partial.uid ?? BrunoParser.generateUid()
  const type = partial.type ?? 'http-request'
  const name = partial.name ?? path.basename(relativePath, '.bru')
  const pathname = partial.pathname ?? relativePath

  if (!hasRequiredBrunoItemFields({ ...partial, uid, type, name }, relativePath)) {
    throw new Error('BrunoItem requires uid, type, and name fields')
  }

  return {
    uid,
    type,
    name,
    pathname,
    depth: partial.depth ?? relativePath.split('/').length - 1,
    request: partial.request ?? null,
    seq: partial.seq ?? null,
    tags: partial.tags ?? null,
    settings: partial.settings ?? null,
    fileContent: partial.fileContent ?? null,
    root: partial.root ?? null,
    items: partial.items ?? null,
    examples: partial.examples ?? null,
    filename: partial.filename ?? null,
  }
}

export class BrunoParser {
  /**
   * Parses a Bruno collection from a directory path.
   *
   * @param collectionPath - Path to the Bruno collection directory
   * @returns Parsed Bruno collection
   * @throws {InvalidCollectionPathError} If the path is not a valid directory
   * @throws {InvalidJsonError} If bruno.json is invalid
   * @throws {InvalidBrunoJsonError} If bruno.json is not a valid object
   * @throws {BruFileParseError} If any .bru file fails to parse
   */
  static async parseCollection(collectionPath: string): Promise<BrunoCollection> {
    const isDir = await FileReader.isDirectory(collectionPath)
    if (!isDir) {
      throw new InvalidCollectionPathError(collectionPath)
    }

    // Look for the required collection files
    const brunoJsonPath = path.join(collectionPath, 'bruno.json')

    let collection: BrunoCollection = {
      version: '1',
      uid: BrunoParser.generateUid(),
      name: path.basename(collectionPath),
      items: [],
      pathname: collectionPath,
      brunoConfig: undefined,
    }

    if (await FileReader.fileExists(brunoJsonPath)) {
      try {
        const brunoJsonContent = await FileReader.readFile(brunoJsonPath)
        let brunoJson: unknown

        try {
          brunoJson = JSON.parse(brunoJsonContent)
        } catch (parseError) {
          throw new InvalidJsonError('bruno.json', parseError)
        }

        // Validate that brunoJson is an object (not an array or null)
        if (typeof brunoJson !== 'object' || brunoJson === null || Array.isArray(brunoJson)) {
          throw new InvalidBrunoJsonError(brunoJsonPath)
        }

        // Type guard to check if it has the required properties
        if (hasNameProperty(brunoJson)) {
          collection = { ...collection, name: brunoJson.name }
        }

        // Validate version
        if (hasVersionProperty(brunoJson) && brunoJson.version === '1') {
          collection = { ...collection, version: '1' }
        }

        // Store bruno config
        if (isRecord(brunoJson)) {
          collection = { ...collection, brunoConfig: brunoJson }
        }
      } catch (error) {
        if (error instanceof InvalidJsonError || error instanceof InvalidBrunoJsonError) {
          throw error // Re-throw specific JSON errors
        }
        throw new InvalidJsonError(brunoJsonPath, error)
      }
    }

    const bruFiles = await FileReader.getBruFiles(collectionPath)

    if (bruFiles.length === 0) {
      console.warn(`No .bru files found in collection directory: ${collectionPath}`)
    }

    const collectionItems = await BrunoParser.parseBruFiles(bruFiles, collectionPath)

    collection = { ...collection, items: collectionItems }

    return collection
  }

  /**
   * Parses individual .bru files into BrunoItem structures.
   *
   * @param bruFilePaths - Array of paths to .bru files
   * @param collectionPath - Base path of the collection
   * @returns Array of parsed Bruno items
   * @throws {BruFileParseError} If any file fails to parse
   */
  static async parseBruFiles(bruFilePaths: string[], collectionPath: string): Promise<BrunoItem[]> {
    const items: BrunoItem[] = []

    for (const bruPath of bruFilePaths) {
      try {
        const content = await FileReader.readFile(bruPath)
        const relativePath = path.relative(collectionPath, bruPath)
        const parsedItem = await BrunoParser.parseBruContent(content, relativePath)
        items.push(parsedItem)
      } catch (error) {
        throw new BruFileParseError(bruPath, error)
      }
    }

    return items
  }

  /**
   * Parses the content of a single .bru file into a BrunoItem.
   * Supports bru-lang format: meta { ... }, get { ... }, headers { ... }, etc.
   *
   * @param content - Content of the .bru file
   * @param relativePath - Relative path of the file within the collection
   * @returns Parsed Bruno item
   */
  static async parseBruContent(content: string, relativePath: string): Promise<BrunoItem> {
    const item: Partial<BrunoItem> = {
      name: path.basename(relativePath, '.bru'),
      pathname: relativePath,
      type: 'http-request',
      depth: relativePath.split('/').length - 1,
    }

    const blocks = BrunoParser.parseBruLangBlocks(content)

    for (const block of blocks) {
      switch (block.type) {
        case 'meta':
          BrunoParser.parseMetaBlock(block.content, item)
          break
        case 'http-method':
          BrunoParser.parseHttpMethodBlock(block.name, block.content, item)
          break
        case 'headers':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: BrunoParser.parseHeadersBlock(block.content),
              params: [],
            })
          } else {
            item.request.headers = BrunoParser.parseHeadersBlock(block.content)
          }
          break
        case 'params':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: [],
              params: BrunoParser.parseParamsBlock(block.content),
            })
          } else {
            item.request.params = BrunoParser.parseParamsBlock(block.content)
          }
          break
        case 'body':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: [],
              params: [],
            })
          }
          item.request.body = BrunoParser.parseBodyBlock(block.name, block.content)
          break
        case 'auth':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: [],
              params: [],
            })
          }
          item.request.auth = BrunoParser.parseAuthBlock(block.content)
          break
      }
    }

    // If no name was extracted, use the filename
    if (!item.name) {
      item.name = path.basename(relativePath, '.bru')
    }

    return createBrunoItem(item, relativePath)
  }

  private static parseBruLangBlocks(content: string): Array<{
    type: 'meta' | 'http-method' | 'headers' | 'params' | 'body' | 'auth'
    name: string
    content: string
  }> {
    const blocks: Array<{
      type: 'meta' | 'http-method' | 'headers' | 'params' | 'body' | 'auth'
      name: string
      content: string
    }> = []

    const lines = content.split('\n')
    let i = 0

    while (i < lines.length) {
      const line = lines[i]?.trim()
      if (!line || line.startsWith('//')) {
        i++
        continue
      }

      const blockMatch = line.match(/^(\w+)(?::([\w-]+))?\s*\{$/)
      if (blockMatch?.[1]) {
        const blockName = blockMatch[1]
        const subtype = blockMatch[2]

        let blockType: 'meta' | 'http-method' | 'headers' | 'params' | 'body' | 'auth'
        if (blockName === 'meta') {
          blockType = 'meta'
        } else if (blockName === 'headers') {
          blockType = 'headers'
        } else if (blockName === 'params') {
          blockType = 'params'
        } else if (blockName === 'auth') {
          blockType = 'auth'
        } else if (blockName === 'body') {
          blockType = 'body'
        } else if (VALID_HTTP_METHODS.includes(blockName as HttpMethod)) {
          blockType = 'http-method'
        } else {
          i++
          continue
        }

        i++
        const blockContent: string[] = []
        let braceDepth = 1

        while (i < lines.length && braceDepth > 0) {
          const currentLine = lines[i]
          if (!currentLine) {
            i++
            continue
          }

          for (const char of currentLine) {
            if (char === '{') braceDepth++
            if (char === '}') braceDepth--
          }

          if (braceDepth > 0) {
            blockContent.push(currentLine)
          }
          i++
        }

        const blockNameValue = subtype ?? blockName ?? ''
        blocks.push({
          type: blockType,
          name: blockNameValue,
          content: blockContent.join('\n'),
        })
      } else {
        i++
      }
    }

    return blocks
  }

  private static parseMetaBlock(content: string, item: Partial<BrunoItem>): void {
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('//')) continue

      const colonIndex = trimmedLine.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim()
        const value = trimmedLine.substring(colonIndex + 1).trim()

        if (key === 'name') {
          item.name = value
        } else if (key === 'seq') {
          const parsedSeq = Number.parseInt(value, 10)
          item.depth = Number.isNaN(parsedSeq) ? undefined : parsedSeq
        } else if (key === 'type') {
          if (value === 'http') {
            item.type = 'http-request'
          } else if (isValidItemType(value)) {
            item.type = value
          }
        }
      }
    }
  }

  private static parseHttpMethodBlock(
    method: string,
    content: string,
    item: Partial<BrunoItem>,
  ): void {
    const httpMethod = method.toUpperCase()
    let url = ''

    const lines = content.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('//')) continue

      const colonIndex = trimmedLine.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim()
        const value = trimmedLine.substring(colonIndex + 1).trim()

        if (key === 'url') {
          url = value
        }
      }
    }

    // Create request with required fields
    item.request = createBrunoRequest({
      method: httpMethod,
      url,
      headers: [],
      params: [],
    })
  }

  private static parseHeadersBlock(content: string): BrunoHeader[] {
    const headers: BrunoHeader[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('//')) continue

      const colonIndex = trimmedLine.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim()
        const value = trimmedLine.substring(colonIndex + 1).trim()

        headers.push({
          uid: BrunoParser.generateUid(),
          name: key,
          value,
          enabled: true,
        })
      }
    }

    return headers
  }

  private static parseParamsBlock(content: string): BrunoParam[] {
    const params: BrunoParam[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('//')) continue

      const colonIndex = trimmedLine.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim()
        const value = trimmedLine.substring(colonIndex + 1).trim()

        params.push({
          uid: BrunoParser.generateUid(),
          name: key,
          value,
          type: 'query',
          enabled: true,
        })
      }
    }

    return params
  }

  private static parseBodyBlock(subtype: string, content: string): BrunoBody {
    const body: Partial<BrunoBody> = {}

    if (subtype === 'json') {
      body.mode = 'json'
      body.json = content.trim()
    } else if (subtype === 'text') {
      body.mode = 'text'
      body.text = content.trim()
    } else if (subtype === 'xml') {
      body.mode = 'xml'
      body.xml = content.trim()
    } else if (subtype === 'form-urlencoded') {
      body.mode = 'formUrlEncoded'
      const formData: BrunoKeyValue[] = []
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine.startsWith('//')) continue
        const colonIndex = trimmedLine.indexOf(':')
        if (colonIndex > 0) {
          const key = trimmedLine.substring(0, colonIndex).trim()
          const value = trimmedLine.substring(colonIndex + 1).trim()
          formData.push({
            uid: BrunoParser.generateUid(),
            name: key,
            value,
            enabled: true,
          })
        }
      }
      body.formUrlEncoded = formData
    } else if (subtype === 'multipart-form') {
      body.mode = 'multipartForm'
      const formData: BrunoKeyValue[] = []
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine.startsWith('//')) continue
        const colonIndex = trimmedLine.indexOf(':')
        if (colonIndex > 0) {
          const key = trimmedLine.substring(0, colonIndex).trim()
          const value = trimmedLine.substring(colonIndex + 1).trim()
          formData.push({
            uid: BrunoParser.generateUid(),
            name: key,
            value,
            enabled: true,
          })
        }
      }
    } else {
      body.mode = 'none'
    }

    return createBrunoBody(body)
  }

  private static parseAuthBlock(content: string): BrunoAuth {
    const auth: Partial<BrunoAuth> = { mode: 'none' }
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('//')) continue

      const colonIndex = trimmedLine.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim()
        const value = trimmedLine.substring(colonIndex + 1).trim()

        if (key === 'mode') {
          if (isValidAuthMode(value)) {
            auth.mode = value
          } else {
            auth.mode = 'none'
          }
        } else if (key === 'username') {
          if (auth.mode === 'basic' || auth.mode === 'digest') {
            if (!auth.basic) auth.basic = { username: '', password: '' }
            auth.basic.username = value
          } else if (auth.mode === 'oauth2') {
            if (!auth.oauth2) auth.oauth2 = { grantType: 'password', accessTokenUrl: '' }
          }
        } else if (key === 'password') {
          if (auth.mode === 'basic' || auth.mode === 'digest') {
            if (!auth.basic) auth.basic = { username: '', password: '' }
            auth.basic.password = value
          }
        } else if (key === 'token') {
          if (auth.mode === 'bearer') {
            if (!auth.bearer) auth.bearer = { token: '' }
            auth.bearer.token = value
          }
        }
      }
    }

    return createBrunoAuth(auth)
  }

  private static parseMetaSection(lines: string[], item: Partial<BrunoItem>): void {
    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey === 'name') {
          item.name = trimmedValue
        } else if (trimmedKey === 'seq') {
          const parsedSeq = Number.parseInt(trimmedValue, 10)
          item.depth = Number.isNaN(parsedSeq) ? undefined : parsedSeq
        }
      }
    }
  }

  private static parseRequestSection(lines: string[], item: Partial<BrunoItem>): void {
    let method = 'GET'
    let url = ''

    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey === 'method') {
          method = trimmedValue
        } else if (trimmedKey === 'url') {
          url = trimmedValue
        }
      }
    }

    item.request = createBrunoRequest({
      method,
      url,
      headers: [],
      params: [],
    })
  }

  private static parseHeadersSection(lines: string[]): BrunoHeader[] {
    const headers: BrunoHeader[] = []

    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey && trimmedKey !== 'enabled') {
          headers.push({
            uid: BrunoParser.generateUid(),
            name: trimmedKey,
            value: trimmedValue,
            enabled: true,
          })
        }
      }
    }

    return headers
  }

  private static parseParamsSection(lines: string[]): BrunoParam[] {
    const params: BrunoParam[] = []

    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey && trimmedKey !== 'enabled') {
          params.push({
            uid: BrunoParser.generateUid(),
            name: trimmedKey,
            value: trimmedValue,
            type: 'query',
            enabled: true,
          })
        }
      }
    }

    return params
  }

  private static parseBodySection(lines: string[]): BrunoBody {
    const body: Partial<BrunoBody> = {}

    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey === 'mode') {
          body.mode = trimmedValue as BodyMode
        } else if (trimmedKey === 'json') {
          body.json = trimmedValue
        } else if (trimmedKey === 'xml') {
          body.xml = trimmedValue
        } else if (trimmedKey === 'text') {
          body.text = trimmedValue
        }
      }
    }

    return createBrunoBody(body)
  }

  private static parseAuthSection(lines: string[]): BrunoAuth {
    const auth: Partial<BrunoAuth> = { mode: 'none' }

    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey === 'mode') {
          auth.mode = trimmedValue as AuthMode
        } else if (trimmedKey === 'username') {
          if (auth.mode === 'basic' || auth.mode === 'digest') {
            if (!auth.basic) auth.basic = { username: '', password: '' }
            auth.basic.username = trimmedValue
          } else if (auth.mode === 'oauth2') {
            if (!auth.oauth2) auth.oauth2 = { grantType: 'password', accessTokenUrl: '' }
          }
        } else if (trimmedKey === 'password') {
          if (auth.mode === 'basic' || auth.mode === 'digest') {
            if (!auth.basic) auth.basic = { username: '', password: '' }
            auth.basic.password = trimmedValue
          }
        } else if (trimmedKey === 'token') {
          if (auth.mode === 'bearer') {
            if (!auth.bearer) auth.bearer = { token: '' }
            auth.bearer.token = trimmedValue
          }
        }
      }
    }

    return createBrunoAuth(auth)
  }

  /**
   * Validates if a given path contains a valid Bruno collection.
   *
   * @param collectionPath - Path to check
   * @returns True if the path contains a valid Bruno collection
   */
  static async isValidCollection(collectionPath: string): Promise<boolean> {
    try {
      const brunoJsonPath = path.join(collectionPath, 'bruno.json')
      const hasBrunoJson = await FileReader.fileExists(brunoJsonPath)

      if (hasBrunoJson) {
        return true
      }

      const bruFiles = await FileReader.getBruFiles(collectionPath)
      return bruFiles.length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Generates a unique identifier.
   *
   * @returns A unique string identifier
   */
  static generateUid(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  /**
   * Parses a Bruno collection from a directory path synchronously.
   *
   * @param collectionPath - Path to the Bruno collection directory
   * @returns Parsed Bruno collection
   * @throws {InvalidCollectionPathError} If the path is not a valid directory
   * @throws {InvalidJsonError} If bruno.json is invalid
   * @throws {InvalidBrunoJsonError} If bruno.json is not a valid object
   * @throws {BruFileParseError} If any .bru file fails to parse
   */
  static parseCollectionSync(collectionPath: string): BrunoCollection {
    const isDir = FileReader.isDirectorySync(collectionPath)
    if (!isDir) {
      throw new InvalidCollectionPathError(collectionPath)
    }

    const brunoJsonPath = path.join(collectionPath, 'bruno.json')

    let collection: BrunoCollection = {
      version: '1',
      uid: BrunoParser.generateUid(),
      name: path.basename(collectionPath),
      items: [],
      pathname: collectionPath,
      brunoConfig: undefined,
    }

    if (FileReader.fileExistsSync(brunoJsonPath)) {
      try {
        const brunoJsonContent = FileReader.readFileSync(brunoJsonPath)
        let brunoJson: unknown

        try {
          brunoJson = JSON.parse(brunoJsonContent)
        } catch (parseError) {
          throw new InvalidJsonError('bruno.json', parseError)
        }

        // Validate that brunoJson is an object (not an array or null)
        if (typeof brunoJson !== 'object' || brunoJson === null || Array.isArray(brunoJson)) {
          throw new InvalidBrunoJsonError(brunoJsonPath)
        }

        // Type guard to check if it has the required properties
        if (hasNameProperty(brunoJson)) {
          collection = { ...collection, name: brunoJson.name }
        }

        // Validate version
        if (hasVersionProperty(brunoJson) && brunoJson.version === '1') {
          collection = { ...collection, version: '1' }
        }

        // Store bruno config
        if (isRecord(brunoJson)) {
          collection = { ...collection, brunoConfig: brunoJson }
        }
      } catch (error) {
        if (error instanceof InvalidJsonError || error instanceof InvalidBrunoJsonError) {
          throw error // Re-throw specific JSON errors
        }
        throw new InvalidJsonError(brunoJsonPath, error)
      }
    }

    const bruFiles = FileReader.getBruFilesSync(collectionPath)

    if (bruFiles.length === 0) {
      console.warn(`No .bru files found in collection directory: ${collectionPath}`)
    }

    const collectionItems = BrunoParser.parseBruFilesSync(bruFiles, collectionPath)

    collection = { ...collection, items: collectionItems }

    return collection
  }

  /**
   * Parses individual .bru files into BrunoItem structures synchronously.
   *
   * @param bruFilePaths - Array of paths to .bru files
   * @param collectionPath - Base path of the collection
   * @returns Array of parsed Bruno items
   * @throws {BruFileParseError} If any file fails to parse
   */
  static parseBruFilesSync(bruFilePaths: string[], collectionPath: string): BrunoItem[] {
    const items: BrunoItem[] = []

    for (const bruPath of bruFilePaths) {
      try {
        const content = FileReader.readFileSync(bruPath)
        const relativePath = path.relative(collectionPath, bruPath)
        const parsedItem = BrunoParser.parseBruContentSync(content, relativePath)
        items.push(parsedItem)
      } catch (error) {
        throw new BruFileParseError(bruPath, error)
      }
    }

    return items
  }

  /**
   * Parses the content of a single .bru file into a BrunoItem synchronously.
   * Supports bru-lang format: meta { ... }, get { ... }, headers { ... }, etc.
   *
   * @param content - Content of the .bru file
   * @param relativePath - Relative path of the file within the collection
   * @returns Parsed Bruno item
   */
  static parseBruContentSync(content: string, relativePath: string): BrunoItem {
    const item: Partial<BrunoItem> = {
      name: path.basename(relativePath, '.bru'),
      pathname: relativePath,
      type: 'http-request',
      depth: relativePath.split('/').length - 1,
    }

    const blocks = BrunoParser.parseBruLangBlocks(content)

    for (const block of blocks) {
      switch (block.type) {
        case 'meta':
          BrunoParser.parseMetaBlock(block.content, item)
          break
        case 'http-method':
          BrunoParser.parseHttpMethodBlock(block.name, block.content, item)
          break
        case 'headers':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: BrunoParser.parseHeadersBlock(block.content),
              params: [],
            })
          } else {
            item.request.headers = BrunoParser.parseHeadersBlock(block.content)
          }
          break
        case 'params':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: [],
              params: BrunoParser.parseParamsBlock(block.content),
            })
          } else {
            item.request.params = BrunoParser.parseParamsBlock(block.content)
          }
          break
        case 'body':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: [],
              params: [],
            })
          }
          item.request.body = BrunoParser.parseBodyBlock(block.name, block.content)
          break
        case 'auth':
          if (!item.request) {
            // Create request with required fields if it doesn't exist
            item.request = createBrunoRequest({
              method: 'GET',
              url: '',
              headers: [],
              params: [],
            })
          }
          item.request.auth = BrunoParser.parseAuthBlock(block.content)
          break
      }
    }

    // If no name was extracted, use the filename
    if (!item.name) {
      item.name = path.basename(relativePath, '.bru')
    }

    return createBrunoItem(item, relativePath)
  }

  /**
   * Validates if a given path contains a valid Bruno collection synchronously.
   *
   * @param collectionPath - Path to check
   * @returns True if the path contains a valid Bruno collection
   */
  static isValidCollectionSync(collectionPath: string): boolean {
    try {
      const brunoJsonPath = path.join(collectionPath, 'bruno.json')
      const hasBrunoJson = FileReader.fileExistsSync(brunoJsonPath)

      if (hasBrunoJson) {
        return true
      }

      const bruFiles = FileReader.getBruFilesSync(collectionPath)
      return bruFiles.length > 0
    } catch (error) {
      return false
    }
  }
}
