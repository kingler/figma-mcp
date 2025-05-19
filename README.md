# MCP Monorepo

Multi-Component Platform (MCP) - A comprehensive framework for AI-driven applications.

## What's Inside

This turborepo includes the following packages and apps:

### Apps

- `mcp-server-manager`: Server management dashboard
- `ai-reasoning-app`: AI reasoning application frontend
- `documentation-portal`: Documentation website
- `mcp-dashboard`: Main dashboard for MCP

### Packages

- `@mcp/ai-reasoning`: AI reasoning capabilities
- `@mcp/browser-tools`: Browser automation tools
- `@mcp/server`: Core MCP server implementation
- `@mcp/taskmaster-core`: Task management system
- `@mcp/ui`: Shared UI components
- `eslint-config-custom`: Shared ESLint configuration

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9.8.1

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start the development server for all packages
npm run dev

# Build all packages
npm run build

# Lint all packages
npm run lint
```

## Project Structure

```
.
├── apps
│   ├── ai-reasoning-app
│   ├── documentation-portal
│   ├── mcp-dashboard
│   └── mcp-server-manager
└── packages
    ├── ai-reasoning
    ├── browser-tools
    ├── eslint-config-custom
    ├── mcp-server
    ├── taskmaster-core
    └── ui-components
```

## License

MIT