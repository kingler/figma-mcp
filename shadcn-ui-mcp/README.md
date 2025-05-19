# shadcn/ui MCP Server

> **From Figma to Code: Design System Automation**
> 
> Imagine you're a developer on a team where designers work in Figma to create your application's UI components and page layouts. Your designers have meticulously crafted a comprehensive design system with variables for colors, typography, spacing, and a robust component library organized by atomic design principles. Now you need to implement these designs using shadcn/ui components without losing design fidelity or spending days manually copying styles.
> 
> With the shadcn-ui-mcp server, this entire process becomes automated:
> 
> 1. **Design Token Synchronization**: First, run `extract_figma_design_tokens` pointing to your design system's Figma file. This extracts all color, spacing, and typography variables and automatically converts them to shadcn/ui compatible formats. Your theme is now perfectly aligned with the design system variables.
> 
> 2. **Component Mapping**: Next, use `sync_components_with_figma_design_system` to establish connections between Figma components and their shadcn/ui equivalents. The system analyzes properties like variants, states, and configurations to ensure proper mapping.
> 
> 3. **Atomic Design Implementation**: For new projects, run `add_atomic_package` with the appropriate atomic category (atoms, molecules, organisms, templates) to install precisely the components your design system needs. The system maintains the same organizational hierarchy as your Figma library.
> 
> 4. **Page Generation**: Point the system to a Figma page or frame using `use_figma_mcp_bridge` with the "extract-design-tokens" operation, and it will analyze the layout, identify component instances, and generate the corresponding React code structure with all the proper shadcn/ui components properly styled and positioned.
> 
> This workflow transforms what used to be days of tedious implementation work into an automated process that takes minutes, while ensuring pixel-perfect design consistency between Figma and your application code. As designers update the design system, you can easily re-synchronize to maintain a single source of truth.

> ### Example Workflow: Building a Dashboard Application
>
> Let's walk through a real-world example of implementing a dashboard application designed in Figma using shadcn-ui-mcp and atomic design principles:
>
> **Step 1: Initialize your project with shadcn/ui**
> 
> ```bash
> # In your Next.js or React project
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/init_project \
>   -H "Content-Type: application/json" \
>   -d '{"projectRoot": "/path/to/dashboard-app", "style": "slate", "useCssVariables": true}'
> ```
>
> **Step 2: Extract design tokens from your Figma design system**
>
> ```bash
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/extract_figma_design_tokens \
>   -H "Content-Type: application/json" \
>   -d '{
>     "projectRoot": "/path/to/dashboard-app", 
>     "figmaFileKey": "abcd1234efgh5678", 
>     "figmaToken": "your-figma-token", 
>     "outputFormat": "tailwind"
>   }'
> ```
>
> This pulls all color variables, typography settings, and spacing metrics from your Figma file and converts them into Tailwind-compatible formats that shadcn/ui can use.
>
> **Step 3: Install components by atomic design category**
>
> Now, following the atomic design methodology, install components in order of complexity:
>
> ```bash
> # 1. First, install atomic elements (the building blocks)
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/add_atomic_package \
>   -H "Content-Type: application/json" \
>   -d '{"atomicType": "atoms", "projectRoot": "/path/to/dashboard-app"}'
>
> # 2. Next, install molecular components (combinations of atoms)
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/add_atomic_package \
>   -H "Content-Type: application/json" \
>   -d '{"atomicType": "molecules", "projectRoot": "/path/to/dashboard-app"}'
>
> # 3. Then, install organism components (complex UI structures)
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/add_atomic_package \
>   -H "Content-Type: application/json" \
>   -d '{"atomicType": "organisms", "projectRoot": "/path/to/dashboard-app"}'
> ```
>
> **Step 4: Sync component metadata from Figma**
>
> ```bash
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/sync_components_with_figma_design_system \
>   -H "Content-Type: application/json" \
>   -d '{
>     "projectRoot": "/path/to/dashboard-app", 
>     "figmaFileKey": "abcd1234efgh5678"
>   }'
> ```
>
> This establishes connections between your Figma components and the shadcn/ui components, syncing properties like variants, states, and documentation.
>
> **Step 5: Generate the dashboard layout**
>
> Using the dashboard frame from your Figma design:
>
> ```bash
> curl -X POST http://localhost:3000/mcp/shadcn-ui-mcp/use_figma_mcp_bridge \
>   -H "Content-Type: application/json" \
>   -d '{
>     "operation": "extract-design-tokens",
>     "fileKey": "abcd1234efgh5678",
>     "additionalParams": {
>       "frameName": "Dashboard Overview",
>       "outputPath": "/path/to/dashboard-app/app/dashboard/page.tsx"
>     }
>   }'
> ```
>
> The result is a fully functioning dashboard page with components organized according to atomic design principles:
>
> - **Atoms**: Buttons, inputs, labels, and indicators that form the smallest UI elements
> - **Molecules**: Form fields, search bars, and notification items that combine atoms
> - **Organisms**: Data tables, card grids, and navigation menus that form complex structures
> - **Templates**: The overall dashboard layout that positions organisms in a coherent structure
>
> As your design evolves in Figma, you can re-run these commands to keep your implementation synchronized with the design system, maintaining the atomic design hierarchy throughout your application.

> ### Under the Hood: How the Figma-to-Code Pipeline Works
> 
> The shadcn-ui-mcp server implements a sophisticated pipeline that translates Figma designs into production-ready code. Here's how the key technologies work together:
> 
> #### 1. Design Token Extraction & Processing
> 
> ```typescript
> // From directFigmaIntegration.ts
> async extractDesignTokens(fileKey: string) {
>   // Get raw variables data from Figma
>   const variablesData = await this.figmaApi.getFileVariables(fileKey);
>   
>   // Process into usable design tokens
>   return {
>     collections: variablesData.meta.variableCollections,
>     variables: variablesData.meta.variables,
>     processedAt: new Date().toISOString(),
>     tokens: processVariablesToTokens(variablesData)
>   };
> }
> ```
> 
> When you run `extract_figma_design_tokens`, the system connects to Figma's API and:
> 
> 1. Retrieves all variable collections and their variables
> 2. Categorizes them into design token types (colors, spacing, typography)
> 3. Transforms Figma's format into standardized design tokens
> 4. Generates the appropriate output formats (CSS variables, Tailwind config)
> 
> For example, a Figma color variable like `Primary/500` with RGBA values gets transformed into a CSS variable `--primary-500: #3b82f6;` and corresponding Tailwind configuration.
> 
> #### 2. Component Mapping & Metadata Extraction
> 
> The system analyzes your shadcn/ui components to extract their structure:
> 
> ```typescript
> // From figmaIntegration.ts
> export async function getShadcnComponentMetadata(projectRoot: string, componentName: string) {
>   // Read the component file
>   const componentCode = await fs.readFile(componentPath, 'utf-8');
>   
>   // Extract metadata through code analysis
>   return {
>     name: componentName,
>     description: extractDescription(componentCode),
>     variants: extractVariants(componentCode),
>     props: extractProps(componentCode),
>     dependencies: extractDependencies(componentCode),
>     examples: await extractExamples(projectRoot, componentName)
>   };
> }
> ```
> 
> It then matches these with their Figma counterparts, establishing a bidirectional relationship that enables:
> 
> - Mapping Figma component variants to shadcn/ui component variants
> - Understanding component properties and their documentation
> - Tracking dependencies between components to maintain atomic design hierarchy
> 
> #### 3. Atomic Design System Organization
> 
> Components are organized following Brad Frost's atomic design methodology:
> 
> ```javascript
> const atomicComponentMap = {
>   atoms: [
>     "button", "input", "label", "badge", "avatar", 
>     "separator", "typography", "aspect-ratio", "scroll-area"
>   ],
>   molecules: [
>     "form", "select", "checkbox", "radio-group", "switch", 
>     "textarea", "tooltip", "dropdown-menu", "context-menu"
>   ],
>   organisms: [
>     "table", "card", "tabs", "accordion", "alert", 
>     "alert-dialog", "dialog", "toast", "navigation-menu", 
>     "command", "sheet"
>   ],
>   templates: [
>     "collapsible", "popover", "hover-card"
>   ]
> };
> ```
> 
> This organization ensures that components are installed in the proper order, with dependencies resolved automatically—atoms before molecules, molecules before organisms, etc.
> 
> #### 4. Layout Generation
> 
> When generating layouts from Figma frames, the system:
> 
> 1. Fetches the frame's node tree structure from Figma
> 2. Recursively traverses the tree, identifying component instances
> 3. Maps each component instance to its shadcn/ui equivalent
> 4. Generates React JSX code that preserves the hierarchy, positioning, and styling
> 5. Resolves responsive properties like layout constraints into Tailwind classes
> 
> The result is a React component that accurately reflects the Figma design while using shadcn/ui components and maintaining the atomic design hierarchy.
> 
> #### 5. Continuous Synchronization
> 
> As your design evolves, the system maintains a record of the mapping between Figma and code components. When you run a sync operation, it:
> 
> 1. Identifies what has changed in the Figma design
> 2. Updates only the affected components and tokens
> 3. Preserves custom code modifications you've made
> 4. Regenerates only the parts that need updating
> 
> This ensures that your implementation remains in sync with the design system without overwriting your custom logic or manually-crafted code extensions.

> ### Benefits Over Traditional Design-to-Code Workflows
> 
> The shadcn-ui-mcp server's Figma integration offers significant advantages over traditional design implementation approaches:
> 
> #### 1. Time Savings
> 
> Traditional workflow:
> - Designer creates components in Figma (2-3 days)
> - Handoff meeting to explain components to developers (2-4 hours)
> - Developer manually inspects designs and properties (3-4 hours per page)
> - Developer implements components by eye, with approximations (1-2 days per page)
> - QA identifies discrepancies between design and code (1 day)
> - Developer fixes inconsistencies (4-8 hours)
> 
> shadcn-ui-mcp workflow:
> - Designer creates components in Figma (2-3 days)
> - Developer runs token extraction and component sync (5-10 minutes)
> - Developer runs page generation for each design (2-5 minutes per page)
> - Developer reviews and makes minor adjustments (30-60 minutes total)
> 
> **Result**: Implementation time reduced by up to 90%, from days to minutes.
> 
> #### 2. Pixel-Perfect Consistency
> 
> Traditional implementations often suffer from subtle inconsistencies due to:
> - Manual interpretation of design values
> - Rounding errors in measurements
> - Developers making approximations
> - Inconsistent handling of responsive behaviors
> 
> With shadcn-ui-mcp:
> - Design tokens are extracted with exact precision
> - Components match their Figma counterparts exactly
> - Spacing, sizing, and positioning are mathematically identical
> - Responsive properties are systematically translated to appropriate code
> 
> **Result**: No visual drift between design and implementation.
> 
> #### 3. Simplified Maintenance
> 
> When designs evolve in traditional workflows:
> - Designers update Figma files
> - Developers manually identify what changed
> - Each change must be implemented by hand
> - Risk of overlooking subtle updates
> - Growing inconsistency between design and code over time
> 
> With shadcn-ui-mcp:
> - Designers update Figma files
> - Automatic change detection identifies updates
> - One command updates all affected components and tokens
> - Custom code remains intact
> - Design and code remain in perfect sync
> 
> **Result**: Ongoing maintenance effort reduced by 70-80%, with higher quality outcomes.
> 
> #### 4. Better Collaboration
> 
> The atomic design organization facilitated by this system creates a shared language between designers and developers:
> 
> - Designers think in terms of atomic design when creating components
> - Developers receive components organized by the same atomic principles
> - Both teams use the same naming conventions and hierarchy
> - Changes are discussed in terms of the atomic design system
> 
> **Result**: Improved communication, fewer misunderstandings, and a more cohesive team workflow.

MCP server to interact with the shadcn/ui CLI directly from Cursor and other MCP clients.

## Features

- Install individual shadcn/ui components to your project
- Install groups of components based on atomic design categories (atoms, molecules, organisms, templates)
- Initialize new projects with shadcn/ui configuration
- Query the component registry for available components
- Validate style configurations against shadcn/ui standards
- Compare local components with registry versions
- Search across multiple component registries
- Generate Storybook-like component preview sites with atomic design organization
- Visualize components in isolation and within the context of their atomic design category
- Automated component dependency resolution and installation
- Monorepo configuration support with proper path aliasing
- Component version diff analysis with customization preservation
- Registry schema validation for component consistency

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/shadcn-ui-mcp.git
cd shadcn-ui-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### As an MCP Server

Configure the MCP server in your `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "shadcn-ui-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/shadcn-ui-mcp-new/dist/index.js"]
    }
  }
}
```

### Supported Tools

The shadcn-ui-mcp server provides the following tools:

#### 1. `add_component`

Add a specific shadcn/ui component to your project.

**Parameters:**

- `componentName` (required): Name of the shadcn/ui component to add (e.g., 'button', 'card')
- `projectRoot` (required): Absolute path to the root of the target project
- `overwrite` (optional): Whether to overwrite existing files (default: false)
- `pathAlias` (optional): Custom path alias for the component (corresponds to --path)

**Example:**

```json
{
  "componentName": "button",
  "projectRoot": "/path/to/your/project",
  "overwrite": true
}
```

#### 2. `add_atomic_package`

Add a group of shadcn/ui components based on atomic design categories.

**Parameters:**

- `atomicType` (required): The atomic design category of components to add ('atoms', 'molecules', 'organisms', 'templates')
- `projectRoot` (required): Absolute path to the root of the target project
- `components` (optional): Specific list of components within the atomic type to install (if omitted, all defaults for the type are installed)

**Example:**

```json
{
  "atomicType": "atoms",
  "projectRoot": "/path/to/your/project",
  "components": ["button", "input", "label"]
}
```

#### 3. `init_project`

Initialize a new project with shadcn/ui configuration.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `style` (optional): The base style to use (e.g., 'slate', 'gray', 'zinc') (default: 'slate')
- `useCssVariables` (optional): Whether to use CSS variables for colors (default: true)
- `skipPrompts` (optional): Skip confirmation prompts using default settings (default: true)

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "style": "zinc",
  "useCssVariables": true
}
```

#### 4. `get_registry_index`

Retrieve the registry index of available components.

**Parameters:**
- `registryUrl` (optional): Custom registry URL (defaults to official shadcn/ui registry)

**Example:**
```json
{
  "registryUrl": "https://ui.shadcn.com"
}
```

#### 5. `get_component_info`

Get detailed metadata about a specific component.

**Parameters:**
- `componentName` (required): Name of the component to fetch metadata for
- `style` (optional): Style variant to fetch (e.g., 'new-york', 'default') (default: 'new-york')
- `registryUrl` (optional): Custom registry URL (defaults to official shadcn/ui registry)

**Example:**
```json
{
  "componentName": "button",
  "style": "new-york"
}
```

#### 6. `validate_styles`

Validate the styles configuration in a shadcn/ui project.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project

**Example:**
```json
{
  "projectRoot": "/path/to/your/project"
}
```

#### 7. `diff_component`

Compare local component implementation with the registry version.

**Parameters:**

- `componentName` (required): Name of the component to compare
- `projectRoot` (required): Absolute path to the root of the target project
- `componentPath` (optional): Relative path to the component within the project (defaults to 'components/ui/[componentName].tsx')

**Example:**

```json
{
  "componentName": "button",
  "projectRoot": "/path/to/your/project"
}
```

#### 8. `search_components`

Search for components across shadcn/ui registries.

**Parameters:**

- `query` (required): Search query (component name or keyword)
- `registryUrls` (optional): List of registry URLs to search (defaults to official shadcn/ui registry)

**Example:**

```json
{
  "query": "form",
  "registryUrls": ["https://ui.shadcn.com", "https://custom-registry.example.com"]
}
```

#### 9. `validate_project`

Perform comprehensive validation of a shadcn/ui project configuration, including all configuration files, component structure, and dependencies.

**Parameters:**

- `projectRoot` (required): Absolute path to the root of the target project

**Example:**
```json
{
  "projectRoot": "/path/to/your/project"
}
```

#### 10. `generate_component_preview`

Generate a visual preview of a specific component in isolation.

**Parameters:**
- `componentName` (required): Name of the component to preview (e.g., 'button', 'card')
- `projectRoot` (required): Absolute path to the root of the target project
- `takeScreenshot` (optional): Whether to take a screenshot of the component (default: false)

**Example:**
```json
{
  "componentName": "button",
  "projectRoot": "/path/to/your/project",
  "takeScreenshot": true
}
```

#### 11. `generate_atomic_storybook`

Generate a storybook-like site organizing components by atomic design categories.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project

**Example:**
```json
{
  "projectRoot": "/path/to/your/project"
}
```

#### 12. `resolve_dependencies`

Resolve and install all nested dependencies for a component.

**Parameters:**
- `componentName` (required): Name of the component to resolve dependencies for
- `projectRoot` (required): Absolute path to the root of the target project
- `registryUrl` (optional): Custom registry URL (defaults to official shadcn/ui registry)

**Example:**
```json
{
  "componentName": "command",
  "projectRoot": "/path/to/your/project"
}
```

#### 13. `analyze_component_diff`

Analyze differences between local component implementation and registry version.

**Parameters:**
- `componentName` (required): Name of the component to analyze
- `projectRoot` (required): Absolute path to the root of the target project
- `customizationPreserve` (optional): Whether to identify and preserve customizations when updating (default: true)

**Example:**
```json
{
  "componentName": "button",
  "projectRoot": "/path/to/your/project"
}
```

#### 14. `search_registries`

Search for components across multiple registries.

**Parameters:**
- `query` (required): Search query for component name or related functionality
- `registryUrls` (optional): List of registry URLs to search through

**Example:**
```json
{
  "query": "form",
  "registryUrls": ["https://ui.shadcn.com", "https://ui.shadxn.com"]
}
```

#### 15. `sync_configuration`

Synchronize components.json and tailwind.config with new components.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `updateCssVariables` (optional): Whether to update CSS variables (default: true)

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "updateCssVariables": true
}
```

#### 16. `adapt_for_monorepo`

Configure shadcn/ui components for a monorepo structure.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `packagePath` (required): Relative path to the package within the monorepo
- `uiPackageName` (optional): The name of the UI package (e.g., '@my-org/ui')

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "packagePath": "packages/ui",
  "uiPackageName": "@acme/ui"
}
```

#### 17. `validate_registry_item`

Validate a component against the registry item schema.

**Parameters:**
- `componentPath` (required): Path to the component to validate
- `expectedType` (optional): Expected type of the registry item ("component" or "block")

**Example:**
```json
{
  "componentPath": "/path/to/your/project/components/ui/button.tsx",
  "expectedType": "component"
}
```

#### 18. `publish_to_figma_library`

Publish/update a shadcn/ui component to a Figma library component.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `componentName` (required): Name of the component to publish to Figma
- `figmaToken` (required): Figma personal access token with library permissions
- `figmaFileKey` (required): Figma file key where the library component exists
- `figmaComponentId` (optional): Existing Figma component ID (if updating)

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "componentName": "button",
  "figmaToken": "your-figma-personal-access-token",
  "figmaFileKey": "figma-file-key",
  "figmaComponentId": "optional-component-id"
}
```

**Notes:**
- This tool requires that the component already exists in the Figma library, as the Figma API doesn't support creating new components via the API
- The tool will attempt to find a matching component by name if no specific component ID is provided
- This feature enables design system synchronization between code and Figma

#### 19. `list_figma_library_components`

List all library components in a Figma file.

**Parameters:**
- `figmaToken` (required): Figma personal access token with library permissions
- `figmaFileKey` (required): Figma file key to retrieve components from

**Example:**
```json
{
  "figmaToken": "your-figma-personal-access-token",
  "figmaFileKey": "figma-file-key"
}
```

#### 20. `sync_all_components_to_figma`

Sync all installed shadcn/ui components to a Figma library.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `figmaToken` (required): Figma personal access token with library permissions
- `figmaFileKey` (required): Figma file key where the library components exist

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "figmaToken": "your-figma-personal-access-token",
  "figmaFileKey": "figma-file-key"
}
```

**Notes:**
- This tool will attempt to match each shadcn/ui component in your project with a corresponding Figma library component by name
- Components must already exist in Figma for the sync to work
- The tool will update component metadata, descriptions, and properties

#### 21. `extract_figma_design_tokens`

Extract design tokens from Figma variables and apply them to shadcn/ui styling.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `figmaFileKey` (required): Figma file key containing design tokens as variables
- `figmaToken` (required): Figma personal access token
- `outputFormat` (optional): Format for the extracted tokens ("json", "css", or "tailwind", default: "tailwind")
- `writeToProject` (optional): Whether to write the tokens to the project (default: true)

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "figmaFileKey": "abcd1234efgh5678",
  "figmaToken": "your-figma-token",
  "outputFormat": "tailwind"
}
```

#### 22. `sync_figma_tokens_to_shadcn`

Synchronize Figma design tokens with shadcn/ui theme configuration.

**Parameters:**
- `projectRoot` (required): Absolute path to the root of the target project
- `figmaFileKey` (required): Figma file key containing design tokens as variables
- `figmaToken` (required): Figma personal access token
- `baseColor` (optional): Base color to use (defaults to existing configuration)

**Example:**
```json
{
  "projectRoot": "/path/to/your/project",
  "figmaFileKey": "abcd1234efgh5678",
  "figmaToken": "your-figma-token",
  "baseColor": "slate"
}
```

## Atomic Design Categories

Components are organized into the following atomic design categories:

### Atoms (Fundamental Building Blocks)

- button, input, label, badge, avatar, separator, typography, aspect-ratio, scroll-area

### Molecules (Component Combinations)

- form, select, checkbox, radio-group, switch, textarea, tooltip, dropdown-menu, context-menu

### Organisms (Complex Components)

- table, card, tabs, accordion, alert, alert-dialog, dialog, toast, navigation-menu, command, sheet

### Templates (Layout Structures)

- collapsible, popover, hover-card

## Atomic Design Organization

The shadcn-ui-mcp server organizes components according to atomic design principles:

1. **Atoms**: Basic building blocks (button, input, label, badge, avatar, etc.)
2. **Molecules**: Groups of atoms forming simple components (form, select, checkbox, etc.)
3. **Organisms**: Complex UI components made of molecules (table, card, tabs, etc.)
4. **Templates**: Page-level component structures (layouts, page templates)
5. **Pages**: Specific instances of templates with content

The storybook preview system automatically categorizes your installed components and displays them in an organized hierarchy, making it easier to understand the component relationships and design system structure.

## Design System Integration

The shadcn-ui-mcp server provides robust tools for managing the connection between your UI component library and your design system in Figma. These features enable bidirectional synchronization, ensuring your design and implementation stay consistent.

### Figma Design Tokens Synchronization

You can extract design tokens (colors, spacing, typography, etc.) from Figma variables and apply them directly to your shadcn/ui theme. This ensures that your UI components use the exact same design tokens defined by your design team.

Key features:
- Extract design tokens from Figma variables
- Generate CSS variables from Figma design tokens
- Update shadcn/ui theme configuration with Figma design tokens
- Create Tailwind config extensions based on Figma design tokens

This workflow is ideal for teams that want to maintain a single source of truth for design tokens in Figma.

### How the Figma Integration Works

The integration between shadcn-ui-mcp and Figma works through direct API communication with the Figma API. Here's how the different aspects work:

1. **Design Token Extraction**:
   - The tool connects to the Figma API using your personal access token
   - It retrieves variable collections and variables from your specified Figma file
   - It categorizes variables into design tokens (colors, spacing, typography)
   - It formats these tokens into various outputs (CSS variables, Tailwind config)

2. **Component Metadata Synchronization**:
   - Extract metadata from your shadcn/ui components (props, variants, examples)
   - Map this metadata to Figma component properties
   - Update existing Figma components with this metadata

### Implementation Approach

This project takes a different approach to Figma integration compared to typical MCP integrations:

#### Direct API Integration (Current Implementation)

Instead of using Figma's MCP server as a dependency (which would have been a server-to-server integration), we've integrated directly with the Figma API:

1. **Benefits of Direct Integration**:
   - No dependency on external MCP servers
   - Simpler deployment and configuration
   - More control over error handling and API responses
   - Better performance by eliminating unnecessary HTTP requests

2. **How It Works**:
   - We include a direct wrapper for the Figma API client
   - Uses axios for HTTP requests to Figma's REST API
   - Handles authentication, error handling, and data transformation
   - Provides TypeScript-friendly methods for Figma operations

This direct integration approach allows us to maintain a more stable and predictable interface for our users, while still leveraging all the capabilities of Figma's API.

### Setup Requirements

To use the Figma integration features, you'll need:

1. A Figma account with access to the Figma API
2. A personal access token from Figma (create one at https://www.figma.com/developers/api#access-tokens)
3. A Figma file with variables set up for your design tokens
4. The Figma file key (found in the URL of your Figma file)

### Best Practices

For the most effective design system integration:

1. **Organize Figma Variables**: Structure your Figma variables into clear collections for colors, spacing, typography, etc.
2. **Consistent Naming**: Use consistent naming conventions in both Figma and your code
3. **Regular Synchronization**: Update your design tokens whenever your design system changes
4. **Version Control**: Commit the generated token files to version control to track changes

### Example Workflow

A typical workflow for a team using this integration might look like:

1. Designers define design tokens as variables in Figma
2. Developers run `extract_figma_design_tokens` to pull the latest tokens
3. The tool generates CSS variables and Tailwind config extensions
4. These are automatically integrated into the shadcn/ui theme
5. Components now reflect the exact same tokens defined in Figma

This ensures perfect consistency between design and implementation, reducing design drift and implementation errors.

## Development

To contribute to the development of this MCP server:

```bash
# Clone the repository
git clone https://github.com/your-username/shadcn-ui-mcp.git
cd shadcn-ui-mcp

# Install dependencies
npm install

# Start in watch mode
npm run watch

# In another terminal, run the server
npm run start
```

## License

MIT