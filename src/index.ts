import type { ConvertResult } from './types/result.js'
import { BrunoParser } from './utils/bruno-parser.js'
import { OpenApiGenerator } from './utils/openapi-generator.js'

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
    // Parse the Bruno collection synchronously
    const collection = BrunoParser.parseCollectionSync(collectionPath)

    // Generate the OpenAPI specification
    const result = OpenApiGenerator.generateOpenApiSpec(collection)

    return result
  } catch (error) {
    throw new Error(`Failed to convert Bruno collection to OpenAPI: ${(error as Error).message}`)
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
} from './types/openapi.js'
// Export other types for convenience
export type { ConvertResult, ConvertWarning } from './types/result.js'
