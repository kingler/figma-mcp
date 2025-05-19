# Project Structure

## Directory Tree
```
.
├── __tests__/
│   └── integration.test.ts
├── coverage/
│   ├── lcov-report/
│   │   ├── base.css
│   │   ├── block-navigation.js
│   │   ├── componentPreview.ts.html
│   │   ├── favicon.png
│   │   ├── index.html
│   │   ├── prettify.css
│   │   ├── prettify.js
│   │   ├── schemaValidator.ts.html
│   │   ├── server.ts.html
│   │   ├── sort-arrow-sprite.png
│   │   └── sorter.js
│   ├── clover.xml
│   ├── coverage-final.json
│   └── lcov.info
├── default_levelgraph_db/
│   ├── 000005.log
│   ├── CURRENT
│   ├── LOG
│   ├── LOG.old
│   └── MANIFEST-000004
├── dist/
│   ├── __tests__/
│   │   └── integration.test.js
│   ├── src/
│   │   ├── componentPreview.js
│   │   ├── index.js
│   │   ├── schemaValidator.js
│   │   ├── server.js
│   │   └── streamableHttp.js
│   ├── index.js
│   ├── schemaValidator.js
│   ├── server.js
│   └── streamableHttp.js
├── src/
│   ├── componentPreview.ts
│   ├── index.ts
│   ├── schemaValidator.ts
│   ├── server.ts
│   └── streamableHttp.ts
├── .gitignore
├── CLAUDE.md
├── debug.log
├── instruction.md
├── jest.config.js
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

## Structure Analysis

The project follows a standard TypeScript Node.js package structure with clear separation of concerns:

1. **Source Code (`src/`)**: Contains the core TypeScript implementation files:
   - `index.ts`: Entry point that initializes the MCP server
   - `server.ts`: Defines all the MCP tools and their implementations
   - `schemaValidator.ts`: Handles validation of shadcn/ui configuration and registry data
   - `componentPreview.ts`: Provides component preview and visualization capabilities
   - `streamableHttp.ts`: Implements HTTP server transport for the MCP protocol

2. **Compiled Output (`dist/`)**: Contains the transpiled JavaScript files that mirror the source structure

3. **Tests (`__tests__/`)**: Contains integration tests for the core functionality

4. **Configuration Files**:
   - `package.json`: Defines dependencies, scripts, and metadata
   - `tsconfig.json`: TypeScript configuration
   - `jest.config.js`: Testing configuration

5. **Documentation**:
   - `README.md`: Extensive documentation of the MCP server capabilities and tool specifications
   - `instruction.md`: Detailed description of the tools and implementation strategy

The code is organized in a modular way with clear separation between:
- MCP server setup and tool definitions
- Schema validation and data integrity checks
- Component preview and visualization features
- HTTP transport layer implementation

This structure follows best practices for TypeScript Node.js projects with a clear separation of concerns and proper organization of source code, tests, and build artifacts. 