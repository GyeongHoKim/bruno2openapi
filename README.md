# Bruno to OpenAPI

Convert Bruno collections to OpenAPI specifications with ease. This library provides a simple way to transform Bruno collection JSON files into standardized OpenAPI 3.x specifications.

## Installation

Install the package using npm:

```bash
npm install @gyeonghokim/bruno-to-openapi
```

## Get Started

Once installed, you can use the library to convert your Bruno collections to OpenAPI specifications. Below are examples showing how to export to both JSON and YAML formats.

### JSON Export

```javascript
import { convertBrunoToOpenAPI } from 'bruno-to-openapi';
import fs from 'fs';

// Load your Bruno collection JSON file
import brunoCollection from './path-to-your-bruno-collection.json';

// Convert Bruno collection to OpenAPI specification
const openApiSpec = convertBrunoToOpenAPI(brunoCollection);

// Save as JSON file
fs.writeFileSync('openapi-spec.json', JSON.stringify(openApiSpec, null, 2));
console.log('OpenAPI specification saved as openapi-spec.json');
```

### YAML Export

To export as YAML, you can use the `js-yaml` library along with this package:

```bash
npm install js-yaml
```

```javascript
import { convertBrunoToOpenAPI } from 'bruno-to-openapi';
import yaml from 'js-yaml';
import fs from 'fs';

// Load your Bruno collection JSON file
import brunoCollection from './path-to-your-bruno-collection.json';

// Convert Bruno collection to OpenAPI specification
const openApiSpec = convertBrunoToOpenAPI(brunoCollection);

// Convert to YAML and save
const yamlString = yaml.dump(openApiSpec, { indent: 2 });
fs.writeFileSync('openapi-spec.yaml', yamlString);
console.log('OpenAPI specification saved as openapi-spec.yaml');
```

## Features

- Converts Bruno collections to OpenAPI 3.x specifications
- Supports all common HTTP methods and parameters
- Handles authentication configurations
- Preserves request/response examples
- Maintains folder structures as tags
- Supports both JSON and YAML output formats

## API Reference

The library exports a single function:

- `convertBrunoToOpenAPI(brunoCollection)`: Takes a Bruno collection object and returns an OpenAPI specification object.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.