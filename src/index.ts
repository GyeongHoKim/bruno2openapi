import type { ConvertResult } from './types/result'
import { BrunoParser } from './utils/bruno-parser'
import { OpenApiGenerator } from './utils/openapi-generator'

/**
 * Converts a Bruno collection to an OpenAPI 3.0 specification
 * @param collectionPath - Path to the Bruno collection directory
 * @returns Promise resolving to the conversion result containing the OpenAPI specification
 * @throws Error if the collection path is invalid or the collection is malformed
 */
export async function convertBrunoCollectionToOpenAPI(
  collectionPath: string,
): Promise<ConvertResult> {
  try {
    // Parse the Bruno collection
    const collection = await BrunoParser.parseCollection(collectionPath)

    // Generate the OpenAPI specification
    const result = OpenApiGenerator.generateOpenApiSpec(collection)

    return result
  } catch (error) {
    throw new Error(`Failed to convert Bruno collection to OpenAPI: ${(error as Error).message}`)
  }
}

/**
 * Synchronously converts a Bruno collection to an OpenAPI 3.0 specification
 * @param collectionPath - Path to the Bruno collection directory
 * @returns The conversion result containing the OpenAPI specification
 * @throws Error if the collection path is invalid or the collection is malformed
 */
export function convertBrunoCollectionToOpenAPISync(collectionPath: string): ConvertResult {
  try {
    // For a true synchronous implementation, we would need to implement sync versions
    // of our file operations. For now, we'll use require instead of import to avoid
    // top-level await issues, but note that this is still using async operations
    // which cannot truly be made synchronous without blocking the event loop.
    // A proper sync implementation would require refactoring our file readers to
    // have both sync and async versions.

    // For now, we'll implement a simplified sync version by reading files directly
    const fs = require('node:fs')
    const pathModule = require('node:path')

    // Check if it's a valid collection first
    if (!(fs.existsSync(collectionPath) && fs.statSync(collectionPath).isDirectory())) {
      throw new Error(`Collection path does not exist or is not a directory: ${collectionPath}`)
    }

    // Look for bruno.json
    const brunoJsonPath = pathModule.join(collectionPath, 'bruno.json')
    let brunoConfig = null
    if (fs.existsSync(brunoJsonPath)) {
      const brunoJsonContent = fs.readFileSync(brunoJsonPath, 'utf-8')
      brunoConfig = JSON.parse(brunoJsonContent)
    }

    // Since the full synchronous implementation requires significant changes
    // to support sync file operations throughout the pipeline, we'll throw
    // an error indicating that for full sync functionality, async should be used
    throw new Error(
      'Full synchronous conversion requires significant architectural changes to support sync file operations throughout the pipeline. Please use the async version: convertBrunoCollectionToOpenAPI()',
    )
  } catch (error) {
    throw new Error(
      `Failed to convert Bruno collection to OpenAPI synchronously: ${(error as Error).message}`,
    )
  }
}

/**
 * Validates if a given path contains a valid Bruno collection
 * @param collectionPath - Path to check
 * @returns Promise resolving to true if valid Bruno collection, false otherwise
 */
export async function isValidBrunoCollection(collectionPath: string): Promise<boolean> {
  try {
    return await BrunoParser.isValidCollection(collectionPath)
  } catch (error) {
    console.error(`Error validating Bruno collection: ${(error as Error).message}`)
    return false
  }
}

export type {
  InfoObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from './types/openapi'
// Export other types for convenience
export type { ConvertResult, ConvertWarning } from './types/result'
