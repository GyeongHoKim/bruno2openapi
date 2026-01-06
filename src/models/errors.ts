/**
 * Custom error classes for Bruno collection parsing
 */

/**
 * Error thrown when a collection path is invalid (does not exist or is not a directory)
 */
export class InvalidCollectionPathError extends Error {
  constructor(collectionPath: string) {
    super(`Collection path does not exist or is not a directory: ${collectionPath}`)
    this.name = 'InvalidCollectionPathError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidCollectionPathError)
    }
  }
}

/**
 * Error thrown when JSON parsing fails
 */
export class InvalidJsonError extends Error {
  constructor(filePath: string, parseError: unknown) {
    const message =
      parseError instanceof Error ? parseError.message : 'Unknown error'
    super(`Invalid JSON in ${filePath}: ${message}`)
    this.name = 'InvalidJsonError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidJsonError)
    }
  }
}

/**
 * Error thrown when bruno.json exists but does not contain a valid JSON object
 */
export class InvalidBrunoJsonError extends Error {
  constructor(filePath: string) {
    super(`bruno.json must contain a valid JSON object: ${filePath}`)
    this.name = 'InvalidBrunoJsonError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidBrunoJsonError)
    }
  }
}

/**
 * Error thrown when a .bru file fails to parse
 */
export class BruFileParseError extends Error {
  constructor(bruFilePath: string, cause?: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(`Failed to parse .bru file ${bruFilePath}: ${causeMessage}`)
    this.name = 'BruFileParseError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BruFileParseError)
    }
  }
}

