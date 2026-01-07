import type {
  BrunoCollection,
  BrunoEnvironments,
  BrunoItem,
  FolderRoot,
  RunnerResult,
} from '../types/index.js'

/**
 * Data model representing a Bruno collection
 */
export class BrunoCollectionModel implements BrunoCollection {
  version: '1'
  uid: string
  name: string
  items: BrunoItem[]
  activeEnvironmentUid?: string | null
  environments?: BrunoEnvironments | null
  pathname?: string | null
  runnerResult?: RunnerResult | null
  runtimeVariables?: Record<string, unknown> | null
  brunoConfig?: Record<string, unknown> | null
  root?: FolderRoot | null

  constructor(data: Partial<BrunoCollection> = {}) {
    this.version = data.version || '1'
    this.uid = data.uid || this.generateUid()
    this.name = data.name || 'Untitled Collection'
    this.items = data.items || []
    this.activeEnvironmentUid = data.activeEnvironmentUid
    this.environments = data.environments
    this.pathname = data.pathname || null
    this.runnerResult = data.runnerResult || null
    this.runtimeVariables = data.runtimeVariables || null
    this.brunoConfig = data.brunoConfig || null
    this.root = data.root || null
  }

  /**
   * Adds an item to the collection
   */
  addItem(item: BrunoItem): void {
    this.items.push(item)
  }

  /**
   * Finds an item by name
   */
  findItemByName(name: string): BrunoItem | undefined {
    return this.items.find(item => item.name === name)
  }

  /**
   * Finds items by type
   */
  findItemsByType(type: string): BrunoItem[] {
    return this.items.filter(item => item.type === type)
  }

  /**
   * Generates a unique identifier
   */
  private generateUid(): string {
    return crypto.randomUUID()
  }
}
