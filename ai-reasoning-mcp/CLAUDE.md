# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Reasoning MCP is a Model Context Protocol (MCP) server that provides reasoning capabilities and knowledge management for AI systems. It implements various reasoning methods and frameworks to assist AI systems in making more informed, structured, and ethical decisions.

## Development Commands

### Building and Running

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Run in development mode with auto-rebuild and restart
npm run dev

# Run the test server
node test_server.js
```

### Testing

```bash
# Run all tests
npm test

# Run a specific test file
npx jest src/__tests__/graph-client.test.ts

# Run tests with coverage
npx jest --coverage
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Task Management

```bash
# List tasks
npm run list

# Generate task files
npm run generate

# Parse PRD document
npm run parse-prd
```

## Architecture

### Core Components

1. **Graph Client**: Manages the LevelGraph database for storing knowledge triples.
   - Implemented in `src/graph-client.ts`
   - Uses LevelGraph for storage with in-memory fallback
   - Handles triple storage operations (create, search, get)

2. **Knowledge Base Service**: Manages knowledge representation.
   - Implemented in `src/knowledge/service.ts`
   - Integrates with GraphStorageManager
   - Handles triples, facts, and rules

3. **Reasoning Engine**: Implements various reasoning methods.
   - Deductive reasoning: From general premises to specific conclusions
   - Inductive reasoning: Generalize from specific examples
   - Abductive reasoning: Generate explanations for observations

4. **Decision Support**: Provides tools for option analysis and risk assessment.

5. **MCP Integration**: Exposes reasoning capabilities via Model Context Protocol.
   - Implemented as a server in `src/index.ts`
   - Provides tool definitions for CLI usage

### Data Flow

1. AI systems interact with the reasoning server through MCP tools
2. Knowledge is stored as triples in LevelGraph
3. Reasoning methods use stored knowledge and provided context to generate insights
4. Results are returned via MCP responses

## Important Modules

- **graph-client.ts**: Interface to the LevelGraph database
- **knowledge/service.ts**: Knowledge management service
- **knowledge/graph-storage-manager.ts**: Storage layer for knowledge
- **knowledge/hypergraph.ts**: Advanced knowledge representation
- **index.ts**: Main server implementation and MCP interface
- **llm-client.ts**: Integration with LLMs for knowledge extraction
- **web-crawler.ts**: Fetches and processes web content for knowledge enrichment

## Testing Patterns

1. Tests are located in `src/__tests__/`
2. Jest is configured for ESM in `jest.config.cjs`
3. Tests follow a pattern of:
   - Setting up mocks for external dependencies
   - Creating test instances
   - Testing expected behavior
   - Testing error handling

## Environment Variables

- `USE_LLM_FOR_KNOWLEDGE`: Enable LLM integration (default: 'false')
- `ONTOLOGY_UPDATE_INTERVAL`: Interval for automatic ontology updates in ms (optional)
- `DEBUG`: Enable debug logging (set to '1')

## MCP Tools Available

The server provides various MCP tools, including:

- **Knowledge Base Tools**: create_triple, add_fact, add_rule, validate_fact, apply_rules
- **Reasoning Tools**: deductive_reasoning, inductive_reasoning, abductive_reasoning
- **Decision Support Tools**: analyze_options, risk_assessment
- **Ethical Framework Tools**: ethical_validation
- **Mental Models Tools**: apply_mental_model
- **Solution Generation and Evaluation**: generate_solutions, evaluate_solution
- **Step-by-Step Reasoning**: sequential_analysis
- **Hypergraph Integration**: connect_domains, update_world_model, expand_problem_context