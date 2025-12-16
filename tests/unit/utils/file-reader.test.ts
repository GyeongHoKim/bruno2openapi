import fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileReader } from '../../../src/utils/file-reader'

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  },
}))

vi.mock('node:fs', () => ({
  default: {
    statSync: vi.fn(),
    readdirSync: vi.fn(),
  },
}))

describe('FileReader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readFile', () => {
    it('should read a file and return its content as string', async () => {
      const mockContent = '{"name": "test"}'
      vi.mocked(fs.readFile).mockResolvedValue(mockContent)

      const result = await FileReader.readFile('./path/to/file.json')

      expect(fs.readFile).toHaveBeenCalledWith('./path/to/file.json', 'utf-8')
      expect(result).toBe(mockContent)
    })
  })

  describe('isDirectory', () => {
    it('should return true if path is a directory', async () => {
      const mockStat: import('fs').Stats = {
        isFile: () => false,
        isDirectory: () => true,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        dev: 0,
        ino: 0,
        mode: 0,
        nlink: 0,
        uid: 0,
        gid: 0,
        rdev: 0,
        size: 0,
        blksize: 0,
        blocks: 0,
        atimeMs: 0,
        mtimeMs: 0,
        ctimeMs: 0,
        birthtimeMs: 0,
        atime: new Date(),
        mtime: new Date(),
        ctime: new Date(),
        birthtime: new Date(),
      }
      vi.mocked(fs.stat).mockResolvedValue(mockStat)

      const result = await FileReader.isDirectory('./path/to/dir')

      expect(fs.stat).toHaveBeenCalledWith('./path/to/dir')
      expect(result).toBe(true)
    })

    it('should return false if path is not a directory', async () => {
      const mockStat: import('fs').Stats = {
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        dev: 0,
        ino: 0,
        mode: 0,
        nlink: 0,
        uid: 0,
        gid: 0,
        rdev: 0,
        size: 0,
        blksize: 0,
        blocks: 0,
        atimeMs: 0,
        mtimeMs: 0,
        ctimeMs: 0,
        birthtimeMs: 0,
        atime: new Date(),
        mtime: new Date(),
        ctime: new Date(),
        birthtime: new Date(),
      }
      vi.mocked(fs.stat).mockResolvedValue(mockStat)

      const result = await FileReader.isDirectory('./path/to/file.txt')

      expect(result).toBe(false)
    })
  })

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined) // fs.access doesn't return anything when file exists

      const result = await FileReader.fileExists('./path/to/existing-file.txt')

      expect(fs.access).toHaveBeenCalledWith('./path/to/existing-file.txt')
      expect(result).toBe(true)
    })

    it('should return false if file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File does not exist'))

      const result = await FileReader.fileExists('./path/to/missing-file.txt')

      expect(result).toBe(false)
    })
  })
})
