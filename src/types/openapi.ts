// Type definitions for OpenAPI entities
// Re-export from openapi-types for accuracy and compatibility with swagger-parser

import type { OpenAPIV3 } from 'openapi-types'

// Use OpenAPIV3.Document as the base type for OpenAPIObject
// This ensures compatibility with swagger-parser and other OpenAPI tools
export type OpenAPIObject = OpenAPIV3.Document

// Re-export commonly used types from openapi-types
export type InfoObject = OpenAPIV3.InfoObject
export type ContactObject = OpenAPIV3.ContactObject
export type LicenseObject = OpenAPIV3.LicenseObject
export type ServerObject = OpenAPIV3.ServerObject
export type ServerVariableObject = OpenAPIV3.ServerVariableObject
export type PathItemObject = OpenAPIV3.PathItemObject
export type OperationObject = OpenAPIV3.OperationObject
export type ExternalDocumentationObject = OpenAPIV3.ExternalDocumentationObject
export type ParameterObject = OpenAPIV3.ParameterObject
export type RequestBodyObject = OpenAPIV3.RequestBodyObject
export type MediaTypeObject = OpenAPIV3.MediaTypeObject
export type EncodingObject = OpenAPIV3.EncodingObject
export type HeaderObject = OpenAPIV3.HeaderObject
export type ResponsesObject = OpenAPIV3.ResponsesObject
export type ResponseObject = OpenAPIV3.ResponseObject
export type CallbackObject = OpenAPIV3.CallbackObject
export type ExampleObject = OpenAPIV3.ExampleObject
export type LinkObject = OpenAPIV3.LinkObject
export type SchemaObject = OpenAPIV3.SchemaObject
export type ReferenceObject = OpenAPIV3.ReferenceObject
export type ComponentsObject = OpenAPIV3.ComponentsObject
export type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject
export type SecurityRequirementObject = OpenAPIV3.SecurityRequirementObject
export type TagObject = OpenAPIV3.TagObject
