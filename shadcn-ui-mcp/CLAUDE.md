# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The shadcn-ui-mcp project is a Model Context Protocol (MCP) server that provides an interface to interact with the shadcn/ui CLI directly from Cursor and other MCP clients. It enables simplified management and integration of shadcn/ui components through an API-based approach.

## Commands

### Development Workflow

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in watch mode (development)
npm run watch

# Run the server
npm run start

# Run the HTTP server
npm run start:streamableHttp

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Architecture

The project follows a modular architecture built on the MCP (Model Context Protocol) server framework:

1. **Core Server Module** (`src/server.ts`): Main server implementation that registers tools and handles requests
2. **Schema Validation Module** (`src/schemaValidator.ts`): Validates components against schemas
3. **Component Preview Module** (`src/componentPreview.ts`): Generates visual previews of components
4. **HTTP Server Integration** (`src/streamableHttp.ts`): Enables communication via REST endpoints
5. **Entry Point** (`src/index.ts`): Initializes the MCP server on stdio

The server implements JSON-RPC 2.0 protocol for standardized communication with clients.

## Key Concepts

### Atomic Design Organization

The project organizes shadcn/ui components according to atomic design principles:

1. **Atoms**: Basic building blocks (button, input, label, badge, etc.)
2. **Molecules**: Groups of atoms forming simple components (form, select, checkbox, etc.)
3. **Organisms**: Complex UI components (table, card, tabs, etc.)
4. **Templates**: Page-level component structures (collapsible, popover, hover-card)

### Server Tools

The server exposes tools for interacting with shadcn/ui including:

- Adding individual components and component groups
- Initializing projects with shadcn/ui configuration
- Querying component registries 
- Validating style configurations
- Comparing local components with registry versions
- Generating component previews with atomic design organization
- Resolving component dependencies
- Supporting monorepo configurations