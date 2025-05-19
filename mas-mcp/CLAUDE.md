# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MAS-MCP is a Multi-Agent System (MAS) implementation built using the Model Context Protocol (MCP). It provides a framework for creating and orchestrating specialized AI agents that can collaborate to perform complex tasks. Each agent is implemented as an MCP server that can be dynamically connected to AI models through the MCP standard.

The project implements a BDI (Belief-Desire-Intention) architecture for agent reasoning and orchestration, allowing for coordinated, goal-directed behavior across multiple specialized agents.

## Commands

### Building and Running

Each MCP server has similar commands for building and running:

```bash
# For any server component
cd [server-directory]
npm install
npm run build
npm start

# Development mode
npm run dev
```

### Testing

```bash
# Neo Orchestrator Server
cd neo-orchestrator-server
npm test
npm run test:coverage  # For test coverage reports

# Documentation Manager Server
cd documentation-manager-server
npm test

# Testing multiple MAS servers together
node test-mas-servers.mjs
```

### Debugging

```bash
# Analysis MCP Server
cd analysis-mcp-server
npm run inspector
```

## Architecture

The MAS-MCP system consists of several key components:

1. **Core Components**:
   - **Neo Orchestrator Server**: Central orchestration component implementing BDI architecture
   - **Analysis MCP Server**: Provides code and database analysis capabilities
   - **Documentation Manager Server**: Handles document generation, storage, and retrieval

2. **Specialized Agent Servers**:
   - Development Team Server
   - DevOps Engineer Server
   - QA Engineer Server
   - Reasoning Agent Server
   - Security Engineer Server
   - UI/UX Designer Servers
   - Morpheus Validator Server

3. **Client Components**:
   - MCP client library for interacting with MCP servers
   - Testing utilities for MAS servers

## Working with the Codebase

- **MCP Integration**: Each agent is an MCP server that exposes tools and resources through a standardized interface
- **Multi-Agent System**: Agents communicate and collaborate through the Neo Orchestrator
- **BDI Architecture**: The Neo Orchestrator implements Belief-Desire-Intention architecture for agent reasoning
- **Standardized Communication**: MCP enables consistent interaction patterns across all agents

When adding new agents:
1. Create a new directory following the pattern of existing agents
2. Implement the MCP server interface with specialized tools
3. Register the agent with the Neo Orchestrator

When modifying existing agents:
1. Understand the agent's purpose by reviewing its README and index.ts file
2. Identify the tools it provides through its MCP capabilities
3. Make changes while maintaining the MCP interface contract

The system uses the `@modelcontextprotocol/sdk` package for implementing MCP servers and clients, with all servers communicating via stdio as per the MCP specification.

The repository is currently in a feature branch `feature/add-supabase-mcp-server`, suggesting ongoing work to integrate Supabase capabilities into the MCP system.