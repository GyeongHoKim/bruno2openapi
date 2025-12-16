import type { BrunoCollection } from '../types/bruno.js'
import type { ConvertResult } from '../types/result.js'
import { OpenApiGenerator } from '../utils/openapi-generator.js'

/**
 * Interface for the conversion service
 */
export interface IConversionService {
  convertCollection(collection: BrunoCollection): ConvertResult
  convertCollectionAsync(collection: BrunoCollection): Promise<ConvertResult>
}

/**
 * Implementation of the conversion service
 */
export class ConversionService implements IConversionService {
  convertCollection(collection: BrunoCollection): ConvertResult {
    // Use the OpenApiGenerator to convert the Bruno collection to OpenAPI spec
    return OpenApiGenerator.generateOpenApiSpec(collection)
  }

  async convertCollectionAsync(collection: BrunoCollection): Promise<ConvertResult> {
    // For this implementation, the async version does the same as the sync version
    // since we don't have any async operations in the conversion itself
    // (the actual file reading happens before this point)
    // We still keep it as async to maintain API consistency
    return Promise.resolve(this.convertCollection(collection))
  }
}
