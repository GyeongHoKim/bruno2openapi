import path from 'node:path'
import type {
  BrunoAuth,
  BrunoBody,
  BrunoCollection,
  BrunoEnvironment,
  BrunoHeader,
  BrunoItem,
  BrunoKeyValue,
  BrunoParam,
  BrunoRequest,
  BrunoVariable,
  FolderRoot,
} from '../types/bruno.js'
import { FileReader } from './file-reader.js'

/**
 * Utility functions for parsing Bruno collection structures
 */
export class BrunoParser {
  /**
   * Parses a Bruno collection from a directory path
   */
  static async parseCollection(collectionPath: string): Promise<BrunoCollection> {
    // Check if the path exists and is a directory
    const isDir = await FileReader.isDirectory(collectionPath)
    if (!isDir) {
      throw new Error(`Collection path does not exist or is not a directory: ${collectionPath}`)
    }

    // Look for the required collection files
    const brunoJsonPath = path.join(collectionPath, 'bruno.json')
    const collectionBruPath = path.join(collectionPath, 'collection.bru')

    let collection: BrunoCollection = {
      version: '1',
      uid: BrunoParser.generateUid(), // We'll generate a UID if not provided
      name: path.basename(collectionPath), // Default to directory name
      items: [],
      pathname: collectionPath,
      brunoConfig: undefined,
    }

    // Try to read bruno.json if it exists
    if (await FileReader.fileExists(brunoJsonPath)) {
      try {
        const brunoJsonContent = await FileReader.readFile(brunoJsonPath)
        let brunoJson: unknown

        try {
          brunoJson = JSON.parse(brunoJsonContent)
        } catch (parseError) {
          throw new Error(
            `Invalid JSON in bruno.json: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          )
        }

        // Validate that brunoJson is an object
        if (typeof brunoJson !== 'object' || brunoJson === null) {
          throw new Error('bruno.json must contain a valid JSON object')
        }

        // Type guard to check if it has the required properties
        if (
          typeof (brunoJson as { name?: unknown }).name === 'string' &&
          (brunoJson as { name?: unknown }).name
        ) {
          collection = { ...collection, name: (brunoJson as { name: string }).name }
        }

        // Validate version
        if (
          typeof (brunoJson as { version?: unknown }).version === 'string' &&
          ['1'].includes((brunoJson as { version: string }).version)
        ) {
          collection = { ...collection, version: '1' as const }
        }

        // Store bruno config
        if (typeof brunoJson === 'object' && brunoJson !== null) {
          collection = { ...collection, brunoConfig: brunoJson as Record<string, unknown> }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid JSON')) {
          throw error // Re-throw specific JSON errors
        }
        throw new Error(`Failed to parse bruno.json: ${(error as Error).message}`)
      }
    }

    // Try to read collection.bru if it exists
    if (await FileReader.fileExists(collectionBruPath)) {
      try {
        const collectionBruContent = await FileReader.readFile(collectionBruPath)
        // TODO: Parse collection.bru content properly using bruno-lang if needed
        // For now, we'll just acknowledge its existence
        collection.root = { type: 'collection', name: collection.name }
      } catch (error) {
        throw new Error(`Failed to parse collection.bru: ${(error as Error).message}`)
      }
    }

    // Parse all .bru files in the collection directory
    const bruFiles = await FileReader.getBruFiles(collectionPath)

    if (bruFiles.length === 0) {
      console.warn(`No .bru files found in collection directory: ${collectionPath}`)
    }

    const collectionItems = await BrunoParser.parseBruFiles(bruFiles, collectionPath)

    collection = { ...collection, items: collectionItems }

    return collection
  }

  /**
   * Parses individual .bru files into BrunoItem structures
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
        throw new Error(`Failed to parse .bru file ${bruPath}: ${(error as Error).message}`)
      }
    }

    return items
  }

  /**
   * Parses the content of a single .bru file into a BrunoItem
   */
  static async parseBruContent(content: string, relativePath: string): Promise<BrunoItem> {
    // This is a more comprehensive parser for .bru files
    const lines = content.split('\n')
    const item: Partial<BrunoItem> = {
      name: path.basename(relativePath, '.bru'),
      pathname: relativePath,
      type: 'http-request', // Default type
      depth: relativePath.split('/').length - 1 || 0,
      request: {} as BrunoRequest, // Initialize with empty request
    }

    // Parse the .bru content into sections
    const sections: { [key: string]: string[] } = {}
    let currentSection: string | null = null
    let currentSectionContent: string[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Check if this is a section header like [sectionName]
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        // Save previous section if exists
        if (currentSection) {
          sections[currentSection] = currentSectionContent
        }

        // Start new section
        currentSection = trimmedLine.substring(1, trimmedLine.length - 1)
        currentSectionContent = []
      } else {
        // Add line to current section
        currentSectionContent.push(line)
      }
    }

    // Save the last section
    if (currentSection) {
      sections[currentSection] = currentSectionContent
    }

    // Process each section
    for (const [sectionName, sectionLines] of Object.entries(sections)) {
      switch (sectionName) {
        case 'meta':
          BrunoParser.parseMetaSection(sectionLines, item)
          break
        case 'request':
          BrunoParser.parseRequestSection(sectionLines, item)
          break
        case 'headers':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.headers = BrunoParser.parseHeadersSection(sectionLines)
          break
        case 'params':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.params = BrunoParser.parseParamsSection(sectionLines)
          break
        case 'body':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.body = BrunoParser.parseBodySection(sectionLines)
          break
        case 'auth':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.auth = BrunoParser.parseAuthSection(sectionLines)
          break
        default:
          // Process general properties not in sections
          for (const line of sectionLines) {
            if (line.includes('=')) {
              const parts = line.split('=', 2)
              const key = parts[0]
              const value = parts[1]
              const trimmedKey = key?.trim()
              const trimmedValue = value ? value.trim() : ''

              if (trimmedKey === 'name') {
                item.name = trimmedValue
              } else if (trimmedKey === 'type' && trimmedValue) {
                item.type = trimmedValue as
                  | 'folder'
                  | 'http-request'
                  | 'graphql-request'
                  | 'js'
                  | 'grpc-request'
                  | 'ws-request'
              }
            }
          }
      }
    }

    // If no name was extracted, use the filename
    if (!item.name) {
      item.name = path.basename(relativePath, '.bru')
    }

    return item as BrunoItem
  }

  /**
   * Parses the meta section of a .bru file
   */
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
          item.depth = Number.parseInt(trimmedValue, 10) || 0
        }
      }
    }
  }

  /**
   * Parses the request section of a .bru file
   */
  private static parseRequestSection(lines: string[], item: Partial<BrunoItem>): void {
    if (!item.request) item.request = {} as BrunoRequest

    for (const line of lines) {
      if (line.includes('=')) {
        const parts = line.split('=', 2)
        const key = parts[0]
        const value = parts[1]
        const trimmedKey = key?.trim()
        const trimmedValue = value ? value.trim() : ''

        if (trimmedKey === 'method') {
          item.request.method = trimmedValue
        } else if (trimmedKey === 'url') {
          item.request.url = trimmedValue
        }
      }
    }
  }

  /**
   * Parses the headers section of a .bru file
   */
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
          // Skip the 'enabled' line if it's not part of a header
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

  /**
   * Parses the params section of a .bru file
   */
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
          // Skip the 'enabled' line if it's not part of a param
          params.push({
            uid: BrunoParser.generateUid(),
            name: trimmedKey,
            value: trimmedValue,
            type: 'query', // default type
            enabled: true,
          })
        }
      }
    }

    return params
  }

  /**
   * Parses the body section of a .bru file
   */
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
          body.mode = trimmedValue as
            | 'none'
            | 'json'
            | 'text'
            | 'xml'
            | 'formUrlEncoded'
            | 'multipartForm'
            | 'graphql'
            | 'sparql'
            | 'file'
        } else if (trimmedKey === 'json') {
          body.json = trimmedValue
        } else if (trimmedKey === 'xml') {
          body.xml = trimmedValue
        } else if (trimmedKey === 'text') {
          body.text = trimmedValue
        }
      }
    }

    return body as BrunoBody
  }

  /**
   * Parses the auth section of a .bru file
   */
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
          auth.mode = trimmedValue as
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
        } else if (trimmedKey === 'username') {
          if (auth.mode === 'basic' || auth.mode === 'digest') {
            if (!auth.basic) auth.basic = { username: '', password: '' }
            auth.basic.username = trimmedValue
          } else if (auth.mode === 'oauth2') {
            if (!auth.oauth2) auth.oauth2 = { grantType: 'password', accessTokenUrl: '' }
            // Note: OAuth2 has more complex structure that needs to be handled properly
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

    return auth as BrunoAuth
  }

  /**
   * Validates if a given path contains a valid Bruno collection
   */
  static async isValidCollection(collectionPath: string): Promise<boolean> {
    try {
      // A Bruno collection should have either:
      // 1. A bruno.json file, OR
      // 2. At least one .bru file
      const brunoJsonPath = path.join(collectionPath, 'bruno.json')
      const hasBrunoJson = await FileReader.fileExists(brunoJsonPath)

      if (hasBrunoJson) {
        return true
      }

      // Check for .bru files in the directory
      const bruFiles = await FileReader.getBruFiles(collectionPath)
      return bruFiles.length > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Generates a unique identifier
   */
  private static generateUid(): string {
    // In a real implementation, you might want to use nanoid or similar
    // For now, we'll create a simple UID based on timestamp and random number
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  /**
   * Parses a Bruno collection from a directory path synchronously
   */
  static parseCollectionSync(collectionPath: string): BrunoCollection {
    // Check if the path exists and is a directory
    const isDir = FileReader.isDirectorySync(collectionPath)
    if (!isDir) {
      throw new Error(`Collection path does not exist or is not a directory: ${collectionPath}`)
    }

    // Look for the required collection files
    const brunoJsonPath = path.join(collectionPath, 'bruno.json')
    const collectionBruPath = path.join(collectionPath, 'collection.bru')

    let collection: BrunoCollection = {
      version: '1',
      uid: BrunoParser.generateUid(), // We'll generate a UID if not provided
      name: path.basename(collectionPath), // Default to directory name
      items: [],
      pathname: collectionPath,
      brunoConfig: undefined,
    }

    // Try to read bruno.json if it exists
    if (FileReader.fileExistsSync(brunoJsonPath)) {
      try {
        const brunoJsonContent = FileReader.readFileSync(brunoJsonPath)
        let brunoJson: unknown

        try {
          brunoJson = JSON.parse(brunoJsonContent)
        } catch (parseError) {
          throw new Error(
            `Invalid JSON in bruno.json: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          )
        }

        // Validate that brunoJson is an object
        if (typeof brunoJson !== 'object' || brunoJson === null) {
          throw new Error('bruno.json must contain a valid JSON object')
        }

        // Type guard to check if it has the required properties
        if (
          typeof (brunoJson as { name?: unknown }).name === 'string' &&
          (brunoJson as { name?: unknown }).name
        ) {
          collection = { ...collection, name: (brunoJson as { name: string }).name }
        }

        // Validate version
        if (
          typeof (brunoJson as { version?: unknown }).version === 'string' &&
          ['1'].includes((brunoJson as { version: string }).version)
        ) {
          collection = { ...collection, version: '1' as const }
        }

        // Store bruno config
        if (typeof brunoJson === 'object' && brunoJson !== null) {
          collection = { ...collection, brunoConfig: brunoJson as Record<string, unknown> }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid JSON')) {
          throw error // Re-throw specific JSON errors
        }
        throw new Error(`Failed to parse bruno.json: ${(error as Error).message}`)
      }
    }

    // Try to read collection.bru if it exists
    if (FileReader.fileExistsSync(collectionBruPath)) {
      try {
        const collectionBruContent = FileReader.readFileSync(collectionBruPath)
        // TODO: Parse collection.bru content properly using bruno-lang if needed
        // For now, we'll just acknowledge its existence
        collection.root = { type: 'collection', name: collection.name }
      } catch (error) {
        throw new Error(`Failed to parse collection.bru: ${(error as Error).message}`)
      }
    }

    // Parse all .bru files in the collection directory
    const bruFiles = FileReader.getBruFilesSync(collectionPath)

    if (bruFiles.length === 0) {
      console.warn(`No .bru files found in collection directory: ${collectionPath}`)
    }

    const collectionItems = BrunoParser.parseBruFilesSync(bruFiles, collectionPath)

    collection = { ...collection, items: collectionItems }

    return collection
  }

  /**
   * Parses individual .bru files into BrunoItem structures synchronously
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
        throw new Error(`Failed to parse .bru file ${bruPath}: ${(error as Error).message}`)
      }
    }

    return items
  }

  /**
   * Parses the content of a single .bru file into a BrunoItem synchronously
   */
  static parseBruContentSync(content: string, relativePath: string): BrunoItem {
    // This is a more comprehensive parser for .bru files
    const lines = content.split('\n')
    const item: Partial<BrunoItem> = {
      name: path.basename(relativePath, '.bru'),
      pathname: relativePath,
      type: 'http-request', // Default type
      depth: relativePath.split('/').length - 1 || 0,
      request: {} as BrunoRequest, // Initialize with empty request
    }

    // Parse the .bru content into sections
    const sections: { [key: string]: string[] } = {}
    let currentSection: string | null = null
    let currentSectionContent: string[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Check if this is a section header like [sectionName]
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        // Save previous section if exists
        if (currentSection) {
          sections[currentSection] = currentSectionContent
        }

        // Start new section
        currentSection = trimmedLine.substring(1, trimmedLine.length - 1)
        currentSectionContent = []
      } else {
        // Add line to current section
        currentSectionContent.push(line)
      }
    }

    // Save the last section
    if (currentSection) {
      sections[currentSection] = currentSectionContent
    }

    // Process each section
    for (const [sectionName, sectionLines] of Object.entries(sections)) {
      switch (sectionName) {
        case 'meta':
          BrunoParser.parseMetaSection(sectionLines, item)
          break
        case 'request':
          BrunoParser.parseRequestSection(sectionLines, item)
          break
        case 'headers':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.headers = BrunoParser.parseHeadersSection(sectionLines)
          break
        case 'params':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.params = BrunoParser.parseParamsSection(sectionLines)
          break
        case 'body':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.body = BrunoParser.parseBodySection(sectionLines)
          break
        case 'auth':
          if (!item.request) item.request = {} as BrunoRequest
          item.request.auth = BrunoParser.parseAuthSection(sectionLines)
          break
        default:
          // Process general properties not in sections
          for (const line of sectionLines) {
            if (line.includes('=')) {
              const parts = line.split('=', 2)
              const key = parts[0]
              const value = parts[1]
              const trimmedKey = key?.trim()
              const trimmedValue = value ? value.trim() : ''

              if (trimmedKey === 'name') {
                item.name = trimmedValue
              } else if (trimmedKey === 'type' && trimmedValue) {
                item.type = trimmedValue as
                  | 'folder'
                  | 'http-request'
                  | 'graphql-request'
                  | 'js'
                  | 'grpc-request'
                  | 'ws-request'
              }
            }
          }
      }
    }

    // If no name was extracted, use the filename
    if (!item.name) {
      item.name = path.basename(relativePath, '.bru')
    }

    return item as BrunoItem
  }

  /**
   * Validates if a given path contains a valid Bruno collection synchronously
   */
  static isValidCollectionSync(collectionPath: string): boolean {
    try {
      // A Bruno collection should have either:
      // 1. A bruno.json file, OR
      // 2. At least one .bru file
      const brunoJsonPath = path.join(collectionPath, 'bruno.json')
      const hasBrunoJson = FileReader.fileExistsSync(brunoJsonPath)

      if (hasBrunoJson) {
        return true
      }

      // Check for .bru files in the directory
      const bruFiles = FileReader.getBruFilesSync(collectionPath)
      return bruFiles.length > 0
    } catch (error) {
      return false
    }
  }
}
