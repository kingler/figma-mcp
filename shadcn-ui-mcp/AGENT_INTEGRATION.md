# Shadcn-UI MCP Agent Integration Guide

This guide explains how the shadcn-ui-mcp server integrates with the Multi-Agent System (MAS) architecture for UI/UX design and development. This integration creates a seamless workflow between design and implementation using Figma designs as the source of truth.

## Architecture Overview

The MAS architecture consists of four primary components:

1. **UI Developer Agent** (shadcn-ui-mcp) - Responsible for implementing UI components using shadcn/ui
2. **UX Designer Agent** (/Users/kinglerbercy/MCP/mas-mcp/ux-designer-server) - Handles user experience requirements and flow design
3. **UI Designer Agent** (/Users/kinglerbercy/MCP/mas-mcp/ui-designer-server) - Translates Figma designs into component specifications
4. **UI Generator** (/Users/kinglerbercy/MCP/mas-mcp/ui-generator) - Generates React/Next.js code based on component specifications

## Integration Workflow

### 1. Design System Synchronization

The workflow begins with synchronizing design tokens between Figma and shadcn/ui:

```
┌───────────────┐    Extract     ┌───────────────┐    Apply     ┌───────────────┐
│  Figma Design ├───────────────►│  UI Designer  ├─────────────►│  UI Developer │
│     System    │   Design Tokens│     Agent     │  Design Tokens│     Agent     │
└───────────────┘                └───────────┬───┘               └───────┬───────┘
                                             │                           │
                                             │ Notify                    │
                                             ▼                           │
                                  ┌───────────────┐                      │
                                  │  UX Designer  │◄─────────────────────┘
                                  │     Agent     │    Component Updates
                                  └───────────────┘
```

### 2. Component Generation

Components are generated based on Figma designs using atomic design principles:

```
┌───────────────┐    Extract     ┌───────────────┐    Generate   ┌───────────────┐
│  Figma Design ├───────────────►│  UI Designer  ├─────────────►│  UI Generator │
│  Components   │   Component    │     Agent     │  Component    │               │
└───────────────┘   Specs        └───────────────┘  Code         └───────┬───────┘
                                                                         │
                                                                         │
┌───────────────┐                                                        │
│  UI Developer ◄────────────────────────────────────────────────────────┘
│     Agent     │    Install Required Components
└───────────────┘
```

## Using the Integration Script

The integration script now lives at the monorepo root-level scripts directory:

`/Users/kinglerbercy/MCP/scripts/agent-integration.js`

Use the following commands from the monorepo root:

```bash
# Check if all agent servers are running
node scripts/agent-integration.js status

# Synchronize design tokens from a Figma file to shadcn/ui
node scripts/agent-integration.js sync-tokens YOUR_FIGMA_FILE_KEY --project-root /path/to/project

# Generate atomic components from Figma designs
node scripts/agent-integration.js generate YOUR_FIGMA_FILE_KEY --project-root /path/to/project
```

## Step-by-Step Implementation

### 1. Design Token Synchronization

When design tokens are synchronized:

1. The UI Designer Agent extracts variables from the Figma file (colors, typography, spacing)
2. The shadcn-ui-mcp server applies these tokens to the project's theme
3. The UX Designer Agent is notified of changes to maintain system-wide consistency

### 2. Atomic Component Generation

When generating components:

1. The UI Designer Agent analyzes Figma components and categorizes them using atomic design principles:
   - **Atoms**: Basic UI elements (buttons, inputs, labels)
   - **Molecules**: Simple combinations of atoms (form fields, search bars)
   - **Organisms**: Complex UI sections (navigation, cards, tables)
   - **Templates**: Page-level component structures (layouts, dashboards)

2. The UI Generator produces React/Next.js code for each component

3. The shadcn-ui-mcp server installs required shadcn/ui components and integrates them into the project

## Implementation Guidelines

### For UI Developer Agent

The shadcn-ui-mcp server provides tools for:

1. **Component Installation**: Adding shadcn/ui components based on design requirements
2. **Theme Management**: Applying design tokens to maintain visual consistency
3. **Atomic Organization**: Structuring components using atomic design principles

### For UI/UX Designers

Designers should:

1. **Use Variables in Figma**: Define colors, typography, spacing as Figma variables
2. **Follow Atomic Principles**: Organize components by complexity and composition
3. **Maintain Consistent Naming**: Use clear, consistent naming for design elements

## Technical Details

The integration leverages the strengths of each agent:

1. **UI Designer Agent**: Specializes in translating visual designs to technical specifications
2. **UI Developer Agent**: Handles component implementation and shadcn/ui integration 
3. **UX Designer Agent**: Focuses on user flows and experience consistency
4. **UI Generator**: Automates code generation from component specifications

## Benefits

This integrated approach offers several advantages:

1. **Design-Code Consistency**: Direct synchronization eliminates manual copying
2. **Accelerated Development**: Automated component generation speeds up implementation
3. **Maintainable Structure**: Atomic design principles create a scalable component library
4. **Single Source of Truth**: Figma designs remain the authoritative reference

## Future Enhancements

Planned improvements include:

1. **Bidirectional Synchronization**: Push code changes back to Figma
2. **Variant Management**: Better handling of component variants
3. **Test Generation**: Automatic generation of component tests
4. **Documentation**: Automatic documentation of the component library 