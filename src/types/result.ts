// Type definitions for conversion result
// Based on the contract specifications

import type { OpenAPIObject } from './openapi'

export interface ConvertResult {
  /**
   * The generated OpenAPI 3.0 specification object
   */
  spec: OpenAPIObject

  /**
   * Warnings encountered during the conversion process
   */
  warnings: ConvertWarning[]

  /**
   * Optional YAML string representation of the OpenAPI spec
   */
  content?: string
}

export interface ConvertWarning {
  /**
   * Description of the warning
   */
  message: string

  /**
   * Name of the item that generated the warning
   */
  itemName: string
}
