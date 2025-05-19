# Using Shadcn Components and Resources

This guide explains how to leverage the shadcn component examples, documentation, and atomic design resources in your projects.

## Overview of Available Resources

The `src/shadcn` directory contains a wealth of resources for implementing shadcn/ui components:

1. **`examples/`**: Contains 80+ component examples demonstrating different variants and use cases
2. **`examples_cards/`**: Contains complex card implementations combining multiple components
3. **`docs/`**: Contains comprehensive documentation for each component
4. **`shadcn_dump.json`**: Contains structured metadata for all components

## Utility Scripts

We've provided several utility scripts to help you work with these resources:

### 1. Search Shadcn Documentation

Use this script to search for components, examples, or documentation:

```bash
node scripts/search-shadcn-docs.js <search-term>
```

Example:
```bash
# Search for everything related to "card"
node scripts/search-shadcn-docs.js card

# Search for button variants
node scripts/search-shadcn-docs.js button
```

### 2. Import Component Examples

Use this script to import specific example components into your project:

```bash
node scripts/import-shadcn-example.js <example-name> [target-directory]
```

Example:
```bash
# Import the card demo example
node scripts/import-shadcn-example.js card-demo components/examples

# Import a complex chat UI example
node scripts/import-shadcn-example.js chat components/examples
```

### 3. Generate Atomic Design Library

Use this script to create a complete atomic design component library based on shadcn components:

```bash
node scripts/generate-atomic-library.js [output-directory]
```

Example:
```bash
# Generate the atomic design library in the default location
node scripts/generate-atomic-library.js

# Specify a custom output directory
node scripts/generate-atomic-library.js src/components/atomic
```

## Using the Atomic Design Library

The atomic design library organizes shadcn components into a structured hierarchy:

1. **Atoms**: Basic building blocks (button, input, label, badge, etc.)
2. **Molecules**: Groups of atoms forming simple components (form, select, checkbox, etc.)
3. **Organisms**: Complex UI components made of molecules (table, card, tabs, etc.)
4. **Templates**: Page-level component structures (collapsible, layout templates, etc.)

To use the atomic design library in your project:

1. Generate the library using the script above
2. Install required shadcn/ui components using the MCP server
3. Import components with their atomic category:

```tsx
// Import from specific atomic category
import { Button } from '../components/atomic/atoms/button';
import { Card } from '../components/atomic/organisms/card';

// Or use the category exports
import { atoms, organisms } from '../components/atomic';

function MyComponent() {
  return (
    <organisms.Card>
      <atoms.Button>Click Me</atoms.Button>
    </organisms.Card>
  );
}
```

## Best Practices

1. **Always Start with Examples**: Use the shadcn examples as starting points for your components
2. **Refer to Documentation**: Check the MDX documentation for proper usage patterns
3. **Use the Atomic Design System**: Organize your components according to atomic design principles
4. **Maintain Component Dependencies**: When using a component, make sure to install all its dependencies

## Installing Components with MCP Server

To install shadcn/ui components using the MCP server:

```bash
# Add a specific component
curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/add_component \
  -H "Content-Type: application/json" \
  -d '{
    "componentName": "button",
    "projectRoot": "/absolute/path/to/your/project"
  }'

# Or add an entire atomic category
curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/add_atomic_package \
  -H "Content-Type: application/json" \
  -d '{
    "atomicType": "atoms",
    "projectRoot": "/absolute/path/to/your/project"
  }'
```

## Figma Integration

If you're using the Figma integration features of shadcn-ui-mcp, you can synchronize your component library with your Figma designs:

```bash
# Extract design tokens from Figma
curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/extract_figma_design_tokens \
  -H "Content-Type: application/json" \
  -d '{
    "projectRoot": "/absolute/path/to/your/project",
    "figmaFileKey": "your-figma-file-key",
    "figmaToken": "your-figma-token"
  }'

# Synchronize components with Figma
curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/sync_components_with_figma_design_system \
  -H "Content-Type: application/json" \
  -d '{
    "projectRoot": "/absolute/path/to/your/project",
    "figmaFileKey": "your-figma-file-key"
  }'
```

This completes the end-to-end workflow from Figma design to code implementation, providing a seamless design-to-development experience.

## Conclusion

The shadcn resources in this project provide everything you need to efficiently implement beautiful, consistent UI components following atomic design principles. By using the provided scripts and examples, you can significantly accelerate your development process while maintaining design system consistency. 