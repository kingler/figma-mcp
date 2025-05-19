# AI Reasoning MCP - Project Structure

## Directory Overview
```
ai-reasoning-mcp/
├── .context/                 # Project analysis files
├── build/                    # Compiled JavaScript output
│   ├── __tests__/            # Compiled test files
│   ├── knowledge/            # Compiled knowledge modules
│   └── index.js              # Main server entry point
├── default_levelgraph_db/    # LevelGraph database files
├── src/                      # TypeScript source code
│   ├── __tests__/            # Test files
│   ├── knowledge/            # Knowledge base modules
│   ├── types/                # TypeScript type definitions
│   ├── graph-client.ts       # Graph database client
│   └── index.ts              # Main server entry point
├── test_levelgraph_db/       # Test database instance
├── .env                      # Environment configuration
├── jest.config.cjs           # Jest test configuration
├── package.json              # Project dependencies and scripts
├── README.md                 # Project documentation
├── test_server.js            # Manual test server script
└── tsconfig.json             # TypeScript configuration
```

## Key Files Analysis

### Core Server Files
- **src/index.ts**: Main entry point that sets up the MCP server with all tool handlers. Includes:
  - AIReasoningServer class definition
  - Tool registration and descriptions
  - Request handling logic
  - Simple implementations of reasoning methods

### Knowledge Base System
- **src/knowledge/service.ts**: Knowledge base service with:
  - Triple management (create, get, query)
  - Fact management (add, validate)
  - Rule management (add, query, apply)

- **src/knowledge/types.ts**: TypeScript interfaces for knowledge entities:
  - Triple (subject-predicate-object)
  - Fact (statement with evidence)
  - Rule (condition-consequence pairs)
  - ValidationResult

- **src/knowledge/graph-storage-manager.ts**: Storage layer that:
  - Manages persistence to the graph database
  - Translates between domain objects and storage format

### Database Integration
- **src/graph-client.ts**: Graph database client that:
  - Integrates with LevelGraph database
  - Provides fallback to in-memory storage
  - Handles database connections and operations

### Type Definitions
- **src/types/levelgraph.d.ts**: Type definitions for LevelGraph library

### Testing
- **src/__tests__/graph-client.test.ts**: Tests for graph database client
- **src/__tests__/graph-storage-manager.test.ts**: Tests for storage manager
- **src/__tests__/knowledge-base-service.test.ts**: Tests for knowledge base service

## Notable Code Patterns

### Resilience Patterns
- In-memory fallback when database connection fails
- Graceful error handling with clear logging
- Progressive enhancement of functionality

### Dependency Management
- Clear separation between knowledge domain and storage
- Modular code organization with specific responsibilities
- Use of TypeScript interfaces for type safety

### Testing Approach
- Use of Jest for testing framework
- Mock objects for database dependencies
- Isolation of components for unit testing

## Recent Changes and Additions

1. **In-Memory Storage Fallback**:
   - Added in-memory storage capability to graph-client.ts
   - Provides fallback when database connections fail
   - Enables the system to run without a database

2. **ES Module Compatibility**:
   - Updated import statements to use .js extensions
   - Fixed require() calls to use ES module import syntax
   - Updated GraphClient to work with ES module structure

3. **Improved Error Handling**:
   - Enhanced error logging in database operations
   - Added graceful cleanup of resources on failure
   - Improved error propagation to clients