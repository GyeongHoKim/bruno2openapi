// Type definitions for Bruno collection entities
// Based on the data model from the specification

export * from './bruno.js'

export interface Variable {
  uid: string
  name: string
  value: string
  type: 'text'
  enabled: boolean
  secret?: boolean
}
