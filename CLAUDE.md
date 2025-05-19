# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The MCP Monorepo is a comprehensive framework for AI-driven applications implementing the Model Context Protocol (MCP). It consists of multiple specialized servers and applications working together to provide a wide range of capabilities for AI systems.

## Development Commands

### Core Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development mode for all packages
npm run dev

# Run tests across all packages
npm run test

# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

### Running Specific Servers

```bash
# AI Reasoning MCP server
cd ai-reasoning-mcp
npm install
npm run build
npm start
# or in development mode
npm run dev

# MAS MCP (Multi-Agent System)
cd mas-mcp/neo-orchestrator-server
npm install
npm run build
npm start

# MCP Server
cd mcp-server
npm install
npm run build
npm start
# or in development mode
ts-node-esm src/index.ts
```

### Testing Specific Components

```bash
# Run tests for a specific package
cd ai-reasoning-mcp
npm test

# Run a specific test file
cd ai-reasoning-mcp
npx jest src/__tests__/graph-client.test.ts

# Run tests with coverage
npx jest --coverage

# Test integration between MAS servers
cd mas-mcp
node test-mas-servers.mjs
```

### Supabase Integration

```bash
# Check and start Supabase server
python3 check_and_start_supabase.py

# Verify Supabase MCP setup
python3 check_supabase_mcp_setup.py

# Fix Claude configuration if needed
python3 fix_claude_config.py
```

## Project Architecture

The MCP Monorepo follows a modular architecture organized into several key components:

### 1. Core MCP Servers

- **mcp-server**: Central implementation providing tools for filesystem, AI, puppeteer, and more
- **ai-reasoning-mcp**: Reasoning engine with knowledge base and decision support
- **supabase-mcp-server**: Database access and management via Supabase
- **neo-orchestrator-server**: Orchestration of multiple MCP agents (BDI architecture)

### 2. Role-Based Specialized Servers

The repository implements various role-based servers, each focusing on specific functions:

- **documentation-manager-server**: Document generation and management
- **qa-engineer-server**: Testing and quality assurance
- **ui-designer-server**: UI design and component generation
- **security-engineer-server**: Security analysis and management
- **development-team-server**: Development workflow management
- **reasoning-agent-server**: Advanced reasoning capabilities

### 3. Integration Servers

- **fetch-mcp**: HTTP request handling
- **shopify-mcp-server**: Shopify integration
- **n8n-mcp-server**: Workflow automation
- **browser-tools-mcp**: Browser automation
- **sendgrid-mcp**: Email integration
- **wordpress-mcp-server**: WordPress integration

### 4. Applications

- **mcp-dashboard**: Main dashboard interface
- **mcp-server-manager**: Server management UI
- **ai-reasoning-app**: Frontend for reasoning capabilities
- **documentation-portal**: Documentation website

## Communication Model

The MCP servers communicate using the Model Context Protocol (MCP):

1. Each server exposes a set of tools through a standardized interface
2. Clients (like Cursor, Claude Desktop, or Windsurf) connect to these servers
3. Communication happens via stdio streams in a JSON-RPC style format
4. The `@modelcontextprotocol/sdk` package provides the foundation for implementing servers

## Supabase MCP Integration

The Supabase MCP server provides database access and management capabilities:

### Configuration

The server requires environment variables to connect to Supabase:
- `SUPABASE_PROJECT_REF`: Project reference ID
- `SUPABASE_DB_PASSWORD`: Database password
- `SUPABASE_REGION`: AWS region where project is hosted
- Optional: `SUPABASE_ACCESS_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY`

### Key Features

- SQL query execution with safety controls (read-only, write, destructive)
- Database schema management and migration versioning
- Supabase Management API integration
- Auth Admin SDK for user management
- Logs and analytics access

## Architecture Patterns

The codebase follows several consistent patterns:

1. **MCP Server Structure**:
   - Entry point in `index.ts`
   - Tool definitions in the `tools/` directory
   - Configuration in environment variables or config files

2. **Testing Pattern**:
   - Tests located in `__tests__/` directories
   - Use of Jest for test runners
   - Mock external dependencies and test behaviors

3. **Dependency Management**:
   - Each package has its own dependencies in package.json
   - Shared dependencies managed at the root level

4. **Configuration**:
   - Environment variables for sensitive information
   - Configuration files for static settings

## When Adding New Features

1. Identify the appropriate MCP server to extend
2. Follow the existing patterns for tool implementation
3. Add tests for new functionality
4. Update documentation to reflect changes
5. Run linting and tests before submitting changes