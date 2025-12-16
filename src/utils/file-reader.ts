import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Utility functions for reading files in the Bruno collection
 */
export class FileReader {
  /**
   * Reads a file and returns its content as a string
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      // Validate file path to prevent path traversal attacks
      const resolvedPath = path.resolve(filePath)
      if (!(resolvedPath.startsWith(path.resolve('.')) || resolvedPath.startsWith(process.cwd()))) {
        throw new Error('Invalid file path: path traversal detected')
      }

      return await fs.readFile(filePath, 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File does not exist: ${filePath}`)
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(`Access denied reading file: ${filePath}`)
      }
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`)
    }
  }

  /**
   * Checks if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Checks if a path is a directory
   */
  static async isDirectory(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Reads all files in a directory recursively
   */
  static async readDirRecursively(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const files: string[] = []

      for (const entry of entries) {
        // Prevent symbolic link loops and other path issues
        const fullPath = path.resolve(dirPath, entry.name)
        if (entry.isDirectory()) {
          const nestedFiles = await FileReader.readDirRecursively(fullPath)
          files.push(...nestedFiles)
        } else {
          files.push(fullPath)
        }
      }

      return files
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${(error as Error).message}`)
    }
  }

  /**
   * Gets all JSON files in a directory
   */
  static async getJsonFiles(dirPath: string): Promise<string[]> {
    const files = await FileReader.readDirRecursively(dirPath)
    return files.filter(file => path.extname(file) === '.json')
  }

  /**
   * Gets all .bru files in a directory
   */
  static async getBruFiles(dirPath: string): Promise<string[]> {
    const files = await FileReader.readDirRecursively(dirPath)
    return files.filter(file => path.extname(file) === '.bru')
  }

  /**
   * Safely resolves a path to prevent path traversal
   */
  static safeResolve(basePath: string, relativePath: string): string {
    const resolved = path.resolve(basePath, relativePath)
    const normalizedBase = path.resolve(basePath)

    // Ensure the resolved path is within the base path
    if (!resolved.startsWith(normalizedBase)) {
      throw new Error('Path traversal detected')
    }

    return resolved
  }
}
